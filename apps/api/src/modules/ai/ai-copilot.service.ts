import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import { AnthropicService } from './anthropic.service';
import { AiConfigsService } from './ai-configs.service';
import { AiUsageService } from './ai-usage.service';

type Db = NodePgDatabase<typeof schema>;

export type CopilotContext = 'dashboard' | 'inbox' | 'broadcast' | 'customers' | 'segments';

export type CopilotSuggestion = {
  title: string;
  description: string;
  action: 'go-to' | 'create' | 'analyze' | 'message';
  targetPath?: string;
};

/**
 * Day 11/22: AI Copilot が画面ごとの「次の一手」を 3 つ提案。
 * dashboard なら今日の予約 / 未読 / 直近配信を見て、customers なら休眠顧客の数を見て、等。
 */
@Injectable()
export class AiCopilotService {
  private readonly logger = new Logger(AiCopilotService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly anthropic: AnthropicService,
    private readonly configs: AiConfigsService,
    private readonly aiUsage: AiUsageService,
  ) {}

  async suggest(tenantId: string, context: CopilotContext): Promise<{ suggestions: CopilotSuggestion[] }> {
    if (!this.anthropic.isEnabled) {
      return { suggestions: [] };
    }

    // 画面ごとに「数字 context」を集計
    const contextSummary = await this.buildContextSummary(tenantId, context);
    const config = await this.configs.getOrCreate(tenantId);

    const systemPrompt = `あなたは美容サロンのオーナーをサポートする AI アシスタントです。
現在開いている画面の状況を見て、「今この瞬間にやるべき次の一手」を 3 案、JSON 形式で提案してください。

出力フォーマット (厳密):
[
  { "title": "短い行動名 (15 文字以内)", "description": "なぜ今これをやるかの 1-2 行説明", "action": "go-to|create|analyze|message", "targetPath": "/admin/xxx (任意)" }
]

action の意味:
- go-to: 別画面へ移動
- create: 何かを新規作成
- analyze: 分析する
- message: 顧客にメッセージを送る`;

    const userPrompt = `現在の画面: ${context}

【画面の状況】
${contextSummary}

【お店の特徴】
${config.systemPrompt?.slice(0, 200) ?? '(未設定)'}

この画面で「今やるべき次の一手」を 3 案、上記の JSON 配列で出力してください。前置き不要。`;

    await this.aiUsage.guardOrThrow(tenantId); // v0.1a: AI 日次上限 (超過は 429)
    const text = await this.anthropic.generateText(systemPrompt, userPrompt, {
      model: config.model,
      maxTokens: 800,
      temperature: 0.5,
    });

    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (!arrayMatch) {
      this.logger.warn(`Copilot 出力に JSON 配列が含まれていません: ${text.slice(0, 200)}`);
      return { suggestions: [] };
    }
    try {
      const parsed = JSON.parse(arrayMatch[0]) as Partial<CopilotSuggestion>[];
      const suggestions: CopilotSuggestion[] = parsed
        .filter((s): s is CopilotSuggestion =>
          typeof s?.title === 'string' && typeof s?.description === 'string',
        )
        .slice(0, 3)
        .map((s) => ({
          title: s.title,
          description: s.description,
          action: (['go-to', 'create', 'analyze', 'message'].includes(s.action as string)
            ? s.action
            : 'go-to') as CopilotSuggestion['action'],
          targetPath: s.targetPath,
        }));
      return { suggestions };
    } catch (e) {
      this.logger.error(`Copilot JSON parse 失敗: ${e}`);
      return { suggestions: [] };
    }
  }

  private async buildContextSummary(tenantId: string, context: CopilotContext): Promise<string> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    if (context === 'dashboard') {
      const todayRow = await this.db.execute<{ c: number }>(sql`
        SELECT COUNT(*)::int AS c FROM reservations
        WHERE tenant_id = ${tenantId}
          AND starts_at >= ${todayStart.toISOString()}
          AND starts_at <  ${todayEnd.toISOString()}
      `);
      const unreadRow = await this.db.execute<{ c: number }>(sql`
        SELECT COUNT(*)::int AS c FROM customers
        WHERE tenant_id = ${tenantId} AND chat_status = 'unread'
      `);
      return `- 今日の予約件数: ${todayRow[0]?.c ?? 0} 件
- 未読の顧客数: ${unreadRow[0]?.c ?? 0} 名`;
    }

    if (context === 'customers') {
      const total = await this.db.execute<{ c: number }>(sql`
        SELECT COUNT(*)::int AS c FROM customers WHERE tenant_id = ${tenantId}
      `);
      const dormant = await this.db.execute<{ c: number }>(sql`
        SELECT COUNT(*)::int AS c FROM customers
        WHERE tenant_id = ${tenantId} AND engagement_tier = 'dormant'
      `);
      const recentNew = await this.db.execute<{ c: number }>(sql`
        SELECT COUNT(*)::int AS c FROM customers
        WHERE tenant_id = ${tenantId} AND created_at >= ${thirtyDaysAgo.toISOString()}
      `);
      return `- 顧客総数: ${total[0]?.c ?? 0} 名
- 休眠顧客 (engagementTier=dormant): ${dormant[0]?.c ?? 0} 名
- 直近 30 日の新規: ${recentNew[0]?.c ?? 0} 名`;
    }

    if (context === 'segments') {
      const total = await this.db.execute<{ c: number }>(sql`
        SELECT COUNT(*)::int AS c FROM customers WHERE tenant_id = ${tenantId}
      `);
      return `- 顧客総数: ${total[0]?.c ?? 0} 名 (絞り込み対象母数)
- セグメント機能で「いずれか / すべて 一致」「外したいタグ」で絞れる`;
    }

    if (context === 'inbox') {
      const unreadRow = await this.db.execute<{ c: number }>(sql`
        SELECT COUNT(*)::int AS c FROM customers
        WHERE tenant_id = ${tenantId} AND chat_status = 'unread'
      `);
      return `- 未読の顧客数: ${unreadRow[0]?.c ?? 0} 名`;
    }

    if (context === 'broadcast') {
      const recent = await this.db.execute<{ c: number }>(sql`
        SELECT COUNT(*)::int AS c FROM broadcasts
        WHERE tenant_id = ${tenantId} AND sent_at >= ${thirtyDaysAgo.toISOString()}
      `);
      return `- 直近 30 日の一斉配信実績: ${recent[0]?.c ?? 0} 件`;
    }

    return '';
  }
}
