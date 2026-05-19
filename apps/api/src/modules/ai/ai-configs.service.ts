import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { aiConfigs } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import type { UpdateAiConfigDto } from './dto/ai.dto';

type Db = NodePgDatabase<typeof schema>;
type AiConfigRow = typeof aiConfigs.$inferSelect;

const DEFAULT_SYSTEM_PROMPT = `あなたは美容サロン (美容室・ネイル・エステ・脱毛・整体など) のオーナーをサポートする AI アシスタントです。
LINE のお客様メッセージに、サロン側のスタッフとして丁寧で親しみのある接客トーンで応答してください。
- 専門用語は避け、お客様視点で分かりやすく
- 価格・予約日時の確定回答は避け「スタッフから折り返しご連絡します」と案内
- アレルギー / 体調 / クレーム / 返金 / 法的相談はスタッフへ引き継ぎ`;

@Injectable()
export class AiConfigsService {
  private readonly logger = new Logger(AiConfigsService.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  /** テナント設定取得 (なければデフォルト値で作成) */
  async getOrCreate(tenantId: string): Promise<AiConfigRow> {
    const [existing] = await this.db
      .select()
      .from(aiConfigs)
      .where(eq(aiConfigs.tenantId, tenantId))
      .limit(1);
    if (existing) return existing;

    const [created] = await this.db
      .insert(aiConfigs)
      .values({
        tenantId,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        model: 'claude-haiku-4-5-20251001',
        temperature: 7,
        maxTokens: 1024,
        autoReplyEnabled: false,
        handoffKeywords: ['予約', 'アレルギー', 'クレーム', '返金', '体調'],
        keywordRules: [],
      })
      .returning();
    return created;
  }

  async update(tenantId: string, data: UpdateAiConfigDto): Promise<AiConfigRow> {
    await this.getOrCreate(tenantId); // 存在保証

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.systemPrompt !== undefined) updateData.systemPrompt = data.systemPrompt;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.temperature !== undefined) updateData.temperature = data.temperature;
    if (data.maxTokens !== undefined) updateData.maxTokens = data.maxTokens;
    if (data.welcomeMessage !== undefined) updateData.welcomeMessage = data.welcomeMessage;
    if (data.autoReplyEnabled !== undefined) updateData.autoReplyEnabled = data.autoReplyEnabled;
    if (data.handoffKeywords !== undefined) updateData.handoffKeywords = data.handoffKeywords;
    if (data.keywordRules !== undefined) updateData.keywordRules = data.keywordRules;

    const [updated] = await this.db
      .update(aiConfigs)
      .set(updateData)
      .where(eq(aiConfigs.tenantId, tenantId))
      .returning();
    return updated;
  }
}
