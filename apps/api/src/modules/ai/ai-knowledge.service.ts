import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { aiKnowledge } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import type { CreateKnowledgeDto, UpdateKnowledgeDto } from './dto/ai.dto';

type Db = NodePgDatabase<typeof schema>;
type KnowledgeRow = typeof aiKnowledge.$inferSelect;

// 美容業界共通カテゴリの初期セット (画面で「業界プリセット流し込み」ボタンで使用)
export const KNOWLEDGE_CATEGORIES = [
  { id: 'hours', label: '営業時間 / 定休日' },
  { id: 'access', label: 'アクセス / 駐車場' },
  { id: 'menu', label: 'メニュー / 料金' },
  { id: 'faq', label: 'よくある質問' },
  { id: 'policy', label: 'ご来店時の注意' },
  { id: 'other', label: 'その他' },
];

@Injectable()
export class AiKnowledgeService {
  private readonly logger = new Logger(AiKnowledgeService.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  async list(tenantId: string, category?: string): Promise<KnowledgeRow[]> {
    const conditions = [eq(aiKnowledge.tenantId, tenantId)];
    if (category) conditions.push(eq(aiKnowledge.category, category));
    return this.db
      .select()
      .from(aiKnowledge)
      .where(and(...conditions))
      .orderBy(desc(aiKnowledge.updatedAt));
  }

  async create(tenantId: string, data: CreateKnowledgeDto): Promise<KnowledgeRow> {
    const [row] = await this.db
      .insert(aiKnowledge)
      .values({
        tenantId,
        category: data.category,
        title: data.title,
        content: data.content,
        tags: data.tags ?? [],
        isActive: data.isActive ?? true,
      })
      .returning();
    return row;
  }

  async update(tenantId: string, id: string, data: UpdateKnowledgeDto): Promise<KnowledgeRow> {
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (data.category !== undefined) updateData.category = data.category;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [updated] = await this.db
      .update(aiKnowledge)
      .set(updateData)
      .where(and(eq(aiKnowledge.id, id), eq(aiKnowledge.tenantId, tenantId)))
      .returning();
    if (!updated) throw new NotFoundException('ナレッジが見つかりません');
    return updated;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.db
      .delete(aiKnowledge)
      .where(and(eq(aiKnowledge.id, id), eq(aiKnowledge.tenantId, tenantId)));
  }
}
