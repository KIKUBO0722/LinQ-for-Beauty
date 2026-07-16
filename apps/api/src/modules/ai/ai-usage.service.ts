import { HttpException, Inject, Injectable, Logger } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { aiUsageDaily } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import { AiConfigsService } from './ai-configs.service';

type Db = NodePgDatabase<typeof schema>;

export type UsageResult = { allowed: boolean; count: number; limit: number };

/**
 * v0.1a: AI 利用の日次上限 (Anthropic 課金暴走の防止)。
 * (tenant_id, usage_date) 複合 PK へのアトミック UPSERT 1 回で「+1 して今の値を知る」を行うため、
 * 並行 webhook でも取りこぼし・二重判定が起きない。日付が変われば新行になるので日次リセット cron は不要。
 * 超過後もカウントは進める (需要の記録になる)。
 */
@Injectable()
export class AiUsageService {
  private readonly logger = new Logger(AiUsageService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly configs: AiConfigsService,
  ) {}

  /** 1 回分を消費し、上限内かどうかを返す (webhook 自動応答用 — 超過時は呼び出し側が handoff 文面に切替) */
  async tryConsume(tenantId: string): Promise<UsageResult> {
    const [row] = await this.db
      .insert(aiUsageDaily)
      .values({ tenantId, usageDate: localYmd(), count: 1 })
      .onConflictDoUpdate({
        target: [aiUsageDaily.tenantId, aiUsageDaily.usageDate],
        set: { count: sql`${aiUsageDaily.count} + 1` },
      })
      .returning({ count: aiUsageDaily.count });
    const config = await this.configs.getOrCreate(tenantId);
    const allowed = row.count <= config.dailyLimit;
    if (!allowed) {
      this.logger.warn(`AI 日次上限超過: tenant=${tenantId} count=${row.count}/${config.dailyLimit}`);
    }
    return { allowed, count: row.count, limit: config.dailyLimit };
  }

  /** 1 回分を消費し、超過なら 429 を投げる (管理画面 4 サービス用 — Anthropic を呼ぶ経路は全て数える) */
  async guardOrThrow(tenantId: string): Promise<void> {
    const r = await this.tryConsume(tenantId);
    if (!r.allowed) {
      throw new HttpException(`本日の AI 利用上限 (${r.limit} 回) に達しました。明日リセットされます`, 429);
    }
  }

  /** 本日の使用量の参照のみ (UPSERT しない — 表示用) */
  async getToday(tenantId: string): Promise<{ date: string; count: number; dailyLimit: number }> {
    const date = localYmd();
    const [row] = await this.db
      .select({ count: aiUsageDaily.count })
      .from(aiUsageDaily)
      .where(and(eq(aiUsageDaily.tenantId, tenantId), eq(aiUsageDaily.usageDate, date)))
      .limit(1);
    const config = await this.configs.getOrCreate(tenantId);
    return { date, count: row?.count ?? 0, dailyLimit: config.dailyLimit };
  }
}

/**
 * ローカル TZ (main.ts が起動時に Asia/Tokyo を実測検証) の今日を 'YYYY-MM-DD' で返す。
 * toISOString().slice(0,10) は TZ=Asia/Tokyo でも常に UTC 日付を返すため使用禁止 (JST 0-9 時台に前日へズレる)。
 */
export function localYmd(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
