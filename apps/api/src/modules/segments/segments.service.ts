import { Inject, Injectable, Logger, NotFoundException, BadRequestException, InternalServerErrorException, HttpException } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { segments, segmentBroadcasts, customers, customerTags, tags, lineAccounts, messages, broadcasts } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import { LineService } from '../line/line.service';
import { AnthropicService } from '../ai/anthropic.service';
import { AiUsageService } from '../ai/ai-usage.service';

type Db = NodePgDatabase<typeof schema>;
type SegmentRow = typeof segments.$inferSelect;

// LINE Messaging API 従量課金の仮レート (¥3/通)。本番運用前にプラン別に再計算
const COST_PER_MESSAGE_YEN = 3;

@Injectable()
export class SegmentsService {
  private readonly logger = new Logger(SegmentsService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly lineService: LineService,
    private readonly anthropic: AnthropicService,
    private readonly aiUsage: AiUsageService,
  ) {}

  async list(tenantId: string): Promise<SegmentRow[]> {
    try {
      return await this.db
        .select()
        .from(segments)
        .where(eq(segments.tenantId, tenantId))
        .orderBy(segments.createdAt);
    } catch (error) {
      this.logger.error(`Failed to list segments: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async get(tenantId: string, id: string): Promise<SegmentRow> {
    const [row] = await this.db
      .select()
      .from(segments)
      .where(and(eq(segments.id, id), eq(segments.tenantId, tenantId)))
      .limit(1);
    if (!row) throw new NotFoundException('セグメントが見つかりません');
    return row;
  }

  async create(
    tenantId: string,
    data: {
      name: string;
      description?: string;
      locationId?: string | null;
      tagIds: string[];
      matchType?: string;
      excludeTagIds?: string[];
    },
  ): Promise<SegmentRow> {
    try {
      const [segment] = await this.db
        .insert(segments)
        .values({
          tenantId,
          name: data.name,
          description: data.description,
          locationId: data.locationId ?? null,
          tagIds: data.tagIds,
          matchType: data.matchType || 'any',
          excludeTagIds: data.excludeTagIds || [],
        })
        .returning();
      return segment;
    } catch (error) {
      this.logger.error(`Failed to create segment: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async update(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      description?: string;
      locationId?: string | null;
      tagIds?: string[];
      matchType?: string;
      excludeTagIds?: string[];
    },
  ): Promise<SegmentRow> {
    try {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.locationId !== undefined) updateData.locationId = data.locationId;
      if (data.tagIds !== undefined) updateData.tagIds = data.tagIds;
      if (data.matchType !== undefined) updateData.matchType = data.matchType;
      if (data.excludeTagIds !== undefined) updateData.excludeTagIds = data.excludeTagIds;

      const [updated] = await this.db
        .update(segments)
        .set(updateData)
        .where(and(eq(segments.id, id), eq(segments.tenantId, tenantId)))
        .returning();
      if (!updated) throw new NotFoundException('セグメントが見つかりません');
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update segment ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async remove(tenantId: string, id: string): Promise<void> {
    try {
      await this.db.delete(segments).where(and(eq(segments.id, id), eq(segments.tenantId, tenantId)));
    } catch (error) {
      this.logger.error(`Failed to delete segment ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  /**
   * 指定タグ条件にマッチする顧客 ID 群を返す。
   * Day 8 の preview / broadcast で使う準備。innerJoin は dual-package 型エラーで使えないため 2 query JS-merge。
   */
  async getMatchingCustomerIds(
    tenantId: string,
    tagIds: string[],
    matchType: string = 'any',
    excludeTagIds: string[] = [],
    locationId?: string | null,
  ): Promise<string[]> {
    if (!tagIds.length) return [];

    // 1) tenant 内で対象タグを持つ顧客 ID + tagId を取得
    const tenantCustomers = await this.db
      .select({ id: customers.id, preferredLocationId: customers.preferredLocationId })
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.isFollowing, true)));

    const tenantCustomerIds = tenantCustomers.map((c) => c.id);
    if (!tenantCustomerIds.length) return [];

    const tagAssignments = await this.db
      .select({ customerId: customerTags.customerId, tagId: customerTags.tagId })
      .from(customerTags)
      .where(
        and(
          inArray(customerTags.customerId, tenantCustomerIds),
          inArray(customerTags.tagId, [...tagIds, ...excludeTagIds]),
        ),
      );

    // 顧客 → タグ群の Map 構築
    const customerToTags = new Map<string, Set<string>>();
    for (const a of tagAssignments) {
      const set = customerToTags.get(a.customerId) ?? new Set<string>();
      set.add(a.tagId);
      customerToTags.set(a.customerId, set);
    }

    // 2) マッチ判定
    const tagIdSet = new Set(tagIds);
    const excludeSet = new Set(excludeTagIds);
    const locationFilter = new Map(tenantCustomers.map((c) => [c.id, c.preferredLocationId]));

    const matched: string[] = [];
    for (const [customerId, tagsForCustomer] of customerToTags.entries()) {
      // 除外タグ判定: 1 つでも持っていたら除外
      if ([...tagsForCustomer].some((t) => excludeSet.has(t))) continue;

      // include 側の判定
      const matchedTags = [...tagsForCustomer].filter((t) => tagIdSet.has(t));
      const ok = matchType === 'all' ? matchedTags.length === tagIds.length : matchedTags.length > 0;
      if (!ok) continue;

      // 拠点フィルタ
      if (locationId && locationFilter.get(customerId) !== locationId) continue;

      matched.push(customerId);
    }

    return matched;
  }

  /** Day 8: preview 詳細 (内訳 + コスト見積) */
  async previewDetail(tenantId: string, id: string) {
    const segment = await this.get(tenantId, id);
    const matchedIds = await this.getMatchingCustomerIds(
      tenantId,
      segment.tagIds,
      segment.matchType,
      segment.excludeTagIds,
      segment.locationId,
    );

    if (matchedIds.length === 0) {
      return {
        count: 0,
        tierBreakdown: { active: 0, warm: 0, cold: 0, dormant: 0, unknown: 0 },
        costEstimate: {
          totalRecipients: 0,
          costYen: 0,
          dormantCount: 0,
          costExcludingDormantYen: 0,
          potentialSavingsYen: 0,
          pricePerMessage: COST_PER_MESSAGE_YEN,
        },
        sampleCustomers: [],
      };
    }

    const rows = await this.db
      .select({
        id: customers.id,
        displayName: customers.displayName,
        name: customers.name,
        engagementTier: customers.engagementTier,
      })
      .from(customers)
      .where(inArray(customers.id, matchedIds));

    const tierBreakdown = { active: 0, warm: 0, cold: 0, dormant: 0, unknown: 0 };
    for (const r of rows) {
      const tier = r.engagementTier as keyof typeof tierBreakdown;
      if (tier in tierBreakdown) {
        tierBreakdown[tier] += 1;
      } else {
        tierBreakdown.unknown += 1;
      }
    }

    const totalCost = rows.length * COST_PER_MESSAGE_YEN;
    const costExcludingDormant = (rows.length - tierBreakdown.dormant) * COST_PER_MESSAGE_YEN;

    return {
      count: rows.length,
      tierBreakdown,
      costEstimate: {
        totalRecipients: rows.length,
        costYen: totalCost,
        dormantCount: tierBreakdown.dormant,
        costExcludingDormantYen: costExcludingDormant,
        potentialSavingsYen: totalCost - costExcludingDormant,
        pricePerMessage: COST_PER_MESSAGE_YEN,
      },
      sampleCustomers: rows.slice(0, 5).map((r) => ({
        id: r.id,
        name: r.displayName ?? r.name ?? '名前未登録',
      })),
    };
  }

  /** Day 8: セグメント配信実行 — LINE multicast + 履歴 + 統合 broadcasts 記録 */
  async broadcastToSegment(tenantId: string, id: string, message: string) {
    if (!message.trim()) {
      throw new BadRequestException('配信本文が空です');
    }
    const segment = await this.get(tenantId, id);
    const matchedIds = await this.getMatchingCustomerIds(
      tenantId,
      segment.tagIds,
      segment.matchType,
      segment.excludeTagIds,
      segment.locationId,
    );

    if (matchedIds.length === 0) {
      throw new BadRequestException('該当する顧客がいません');
    }

    // 送信対象 (lineUserId + lineAccountId が揃っている顧客のみ)
    const targets = await this.db
      .select({
        id: customers.id,
        lineUserId: customers.lineUserId,
        lineAccountId: customers.lineAccountId,
      })
      .from(customers)
      .where(inArray(customers.id, matchedIds));

    const sendable = targets.filter((t) => t.lineUserId && t.lineAccountId);

    // 配信履歴 (segment 専用)
    const [history] = await this.db
      .insert(segmentBroadcasts)
      .values({
        segmentId: id,
        message,
        recipientCount: matchedIds.length,
        sentCount: 0,
      })
      .returning();

    // 統合 broadcasts レコード
    const contentPreview = message.length > 100 ? message.slice(0, 100) + '…' : message;
    const [unified] = await this.db
      .insert(broadcasts)
      .values({
        tenantId,
        type: 'segment',
        segmentId: id,
        title: `${segment.name} 配信`,
        contentPreview,
        messageType: 'text',
        recipientCount: matchedIds.length,
        sentAt: new Date(),
        status: 'sent',
      })
      .returning();

    // line_accounts ごとにグルーピングして multicast
    const byAccount = new Map<string, { lineUserId: string; customerId: string }[]>();
    for (const t of sendable) {
      if (!t.lineUserId || !t.lineAccountId) continue;
      const list = byAccount.get(t.lineAccountId) ?? [];
      list.push({ lineUserId: t.lineUserId, customerId: t.id });
      byAccount.set(t.lineAccountId, list);
    }

    let sentCount = 0;
    for (const [accountId, recipients] of byAccount) {
      const [account] = await this.db
        .select()
        .from(lineAccounts)
        .where(eq(lineAccounts.id, accountId))
        .limit(1);
      if (!account) continue;

      const credentials = {
        channelSecret: account.channelSecret,
        channelAccessToken: account.channelAccessToken,
      };
      const userIds = recipients.map((r) => r.lineUserId);

      try {
        await this.lineService.multicast(credentials, userIds, [{ type: 'text', text: message }]);
        // 個別メッセージ記録
        const rows = recipients.map((r) => ({
          tenantId,
          lineAccountId: accountId,
          customerId: r.customerId,
          direction: 'outbound' as const,
          messageType: 'text',
          content: { text: message },
          sendType: 'broadcast' as const,
          status: 'sent' as const,
          sentAt: new Date(),
          broadcastId: unified.id,
        }));
        if (rows.length > 0) await this.db.insert(messages).values(rows);
        sentCount += recipients.length;
      } catch (error) {
        this.logger.error(`Failed to multicast to account ${accountId}: ${error}`);
      }
    }

    // sentCount 更新
    await this.db
      .update(segmentBroadcasts)
      .set({ sentCount })
      .where(eq(segmentBroadcasts.id, history.id));

    return {
      historyId: history.id,
      broadcastId: unified.id,
      recipientCount: matchedIds.length,
      sendableCount: sendable.length,
      sentCount,
    };
  }

  /** Day 8: AI が配信文の候補を 3 案提案する */
  async suggestBroadcastMessages(tenantId: string, id: string) {
    if (!this.anthropic.isEnabled) {
      throw new BadRequestException('AI 機能が現在無効です (API キー未設定)');
    }
    const segment = await this.get(tenantId, id);

    // タグ名解決
    const allTagIds = [...segment.tagIds, ...segment.excludeTagIds];
    let tagNameMap = new Map<string, string>();
    if (allTagIds.length > 0) {
      const tagRows = await this.db
        .select({ id: tags.id, name: tags.name })
        .from(tags)
        .where(inArray(tags.id, allTagIds));
      tagNameMap = new Map(tagRows.map((t) => [t.id, t.name]));
    }
    const includeTagNames = segment.tagIds.map((tid) => tagNameMap.get(tid)).filter(Boolean) as string[];
    const excludeTagNames = segment.excludeTagIds.map((tid) => tagNameMap.get(tid)).filter(Boolean) as string[];

    const matchLabel = segment.matchType === 'all' ? 'すべて一致' : 'いずれか一致';

    const systemPrompt = `あなたは美容サロン (美容室・ネイル・エステ・脱毛・整体など) のオーナー支援 AI です。
LINE 公式アカウントの一斉配信文を、業界の接客トーン (丁寧・親しみ・押し付けない) で 3 案作成してください。
各案は 100〜180 文字程度、絵文字は控えめ、本文末尾に CTA (予約 / 詳細 / 返信のいずれか) を 1 行配置。
出力フォーマットは厳守: 「### 案 1」「### 案 2」「### 案 3」の見出しで区切り、本文のみを書く。前置きや解説は不要。`;

    const userPrompt = `配信対象セグメント:
- 名称: ${segment.name}
- 説明: ${segment.description ?? '(なし)'}
- 含めるタグ (${matchLabel}): ${includeTagNames.join(', ') || '(なし)'}
- 外したいタグ: ${excludeTagNames.join(', ') || '(なし)'}

このセグメントに刺さる配信文を 3 案、上記フォーマットで提示してください。`;

    await this.aiUsage.guardOrThrow(tenantId); // v0.1a: AI 日次上限 (超過は 429)
    const text = await this.anthropic.generateText(systemPrompt, userPrompt, { maxTokens: 1500, temperature: 0.8 });

    // 「### 案 N」で分割
    const sections = text.split(/###\s*案\s*\d+\s*/u).map((s) => s.trim()).filter((s) => s.length > 0);
    const suggestions = sections.length >= 3 ? sections.slice(0, 3) : [text.trim()];

    return { suggestions };
  }

  /** segments 配信履歴一覧 */
  async listBroadcastHistory(tenantId: string, id: string) {
    await this.get(tenantId, id); // tenant チェック
    return this.db
      .select()
      .from(segmentBroadcasts)
      .where(eq(segmentBroadcasts.segmentId, id))
      .orderBy(segmentBroadcasts.sentAt);
  }
}
