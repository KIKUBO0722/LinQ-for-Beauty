import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, desc, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { customers, customerTags, tags, reservations, services, locations, messages } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import { AnthropicService } from './anthropic.service';
import { AiConfigsService } from './ai-configs.service';
import { AiUsageService } from './ai-usage.service';

type Db = NodePgDatabase<typeof schema>;

export type CustomerAnalysisResult = {
  predictedNextVisit: string | null;
  churnRisk: 'low' | 'medium' | 'high' | 'unknown';
  recommendedAction: string;
  suggestedMessage: string;
  reasoning: string;
};

/**
 * Day 11/22: 顧客 1 名を AI が分析。来店履歴 / タグ / 会話履歴 を context に
 * 予測再来店日 + 離脱リスク + 推奨アクション + 推奨メッセージ を返す。
 */
@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly anthropic: AnthropicService,
    private readonly configs: AiConfigsService,
    private readonly aiUsage: AiUsageService,
  ) {}

  async analyzeCustomer(tenantId: string, customerId: string): Promise<CustomerAnalysisResult> {
    if (!this.anthropic.isEnabled) {
      throw new Error('AI 機能が現在無効です (API キー未設定)');
    }

    const [customer] = await this.db
      .select()
      .from(customers)
      .where(and(eq(customers.id, customerId), eq(customers.tenantId, tenantId)))
      .limit(1);
    if (!customer) throw new NotFoundException('顧客が見つかりません');

    // 顧客タグ取得 (2-query JS-merge、innerJoin 回避)
    const assignmentRows = await this.db
      .select({ tagId: customerTags.tagId })
      .from(customerTags)
      .where(eq(customerTags.customerId, customerId));
    const assignedTagIds = assignmentRows.map((a) => a.tagId);
    const tagRows = assignedTagIds.length === 0
      ? []
      : await this.db
          .select({ id: tags.id, name: tags.name, category: tags.category })
          .from(tags)
          .where(and(eq(tags.tenantId, tenantId), sql`${tags.id} = ANY(${assignedTagIds})`));

    // 来店履歴 (最大 10 件)
    const reservationRows = await this.db
      .select({
        startsAt: reservations.startsAt,
        status: reservations.status,
        note: reservations.note,
      })
      .from(reservations)
      .where(eq(reservations.customerId, customerId))
      .orderBy(desc(reservations.startsAt))
      .limit(10);

    // サービス / 拠点解決 (簡略化のため省略、reservation の serviceId を含めて 2 query JS-merge することも可能だが Day 11 では status のみで十分)

    // 直近会話 (最大 5 件)
    const messageRows = await this.db
      .select({
        direction: messages.direction,
        content: messages.content,
        sentAt: messages.sentAt,
      })
      .from(messages)
      .where(and(eq(messages.tenantId, tenantId), eq(messages.customerId, customerId)))
      .orderBy(desc(messages.sentAt))
      .limit(5);

    // context 文字列構築
    const customerName = customer.displayName ?? customer.name ?? 'お客様';
    const tagsText =
      tagRows.length > 0
        ? tagRows.map((t) => t.name).filter(Boolean).join(' / ')
        : '(タグなし)';
    const visitsText =
      reservationRows.length > 0
        ? reservationRows
            .map((r, i) => `  ${i + 1}. ${new Date(r.startsAt).toISOString().slice(0, 10)} [${r.status}]`)
            .join('\n')
        : '  (来店履歴なし)';
    const messagesText =
      messageRows.length > 0
        ? messageRows
            .map((m) => {
              const c = m.content as { text?: string };
              return `  [${m.direction}] ${c?.text ?? '(non-text)'}`;
            })
            .join('\n')
        : '  (会話なし)';
    const customFieldsText = customer.customFields
      ? Object.entries(customer.customFields)
          .map(([k, v]) => `  ${k}: ${v}`)
          .join('\n')
      : '  (未記入)';

    const today = new Date().toISOString().slice(0, 10);
    const lastVisit = reservationRows[0]
      ? new Date(reservationRows[0].startsAt).toISOString().slice(0, 10)
      : '(なし)';

    const userPrompt = `今日の日付: ${today}

【顧客プロフィール】
お名前: ${customerName}
活発度: ${customer.engagementTier ?? 'unknown'}
スコア: ${customer.score ?? 0}
最終来店: ${lastVisit}

【タグ】
${tagsText}

【来店履歴 (最大 10 件)】
${visitsText}

【直近の会話 (最大 5 件)】
${messagesText}

【自由項目】
${customFieldsText}

このお客様について、次の 5 項目を JSON 形式で出力してください:
{
  "predictedNextVisit": "YYYY-MM-DD or null (再来店予測日、来店間隔の平均から推測)",
  "churnRisk": "low / medium / high / unknown のいずれか",
  "recommendedAction": "1 行のアクション提案 (例: 14 日以内にカラー戻り案内を送る)",
  "suggestedMessage": "LINE 配信向けの本文案 80-140 文字、敬語ベース、絵文字控えめ、CTA 1 行",
  "reasoning": "上記の判断根拠を 1-2 行で"
}`;

    const config = await this.configs.getOrCreate(tenantId);
    const systemPrompt =
      '美容サロンの顧客分析 AI です。来店履歴と会話履歴から、その顧客の状態を JSON 形式で返してください。出力は厳密に JSON のみ、前置きや解説は不要。';

    await this.aiUsage.guardOrThrow(tenantId); // v0.1a: AI 日次上限 (超過は 429)
    const text = await this.anthropic.generateText(systemPrompt, userPrompt, {
      model: config.model,
      maxTokens: 800,
      temperature: 0.3,
    });

    // JSON 抽出 (```json ... ``` で囲まれることもあるので緩く parse)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      this.logger.warn(`AI 出力に JSON が含まれていません: ${text.slice(0, 200)}`);
      return {
        predictedNextVisit: null,
        churnRisk: 'unknown',
        recommendedAction: '(AI 出力解析に失敗、再試行してください)',
        suggestedMessage: '',
        reasoning: text.slice(0, 200),
      };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]) as Partial<CustomerAnalysisResult>;
      return {
        predictedNextVisit: parsed.predictedNextVisit ?? null,
        churnRisk: (['low', 'medium', 'high', 'unknown'].includes(parsed.churnRisk as string)
          ? parsed.churnRisk
          : 'unknown') as CustomerAnalysisResult['churnRisk'],
        recommendedAction: parsed.recommendedAction ?? '',
        suggestedMessage: parsed.suggestedMessage ?? '',
        reasoning: parsed.reasoning ?? '',
      };
    } catch (e) {
      this.logger.error(`AI 出力 JSON parse 失敗: ${e}`);
      return {
        predictedNextVisit: null,
        churnRisk: 'unknown',
        recommendedAction: '(AI 出力解析に失敗、再試行してください)',
        suggestedMessage: '',
        reasoning: text.slice(0, 200),
      };
    }
  }
}
