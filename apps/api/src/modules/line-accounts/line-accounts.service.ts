import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { lineAccounts } from '@linq-beauty/db';
import { DB } from '../../database/database.module';

export type CreateLineAccountDto = {
  name?: string | null;
  channelId: string;
  channelSecret: string;
  channelAccessToken: string;
};

export type UpdateLineAccountDto = Partial<CreateLineAccountDto>;

// channelSecret / channelAccessToken は末尾 4 文字 + マスキングして返す (= UI 表示用)
function maskSecret(s: string | null | undefined): string {
  if (!s) return '';
  if (s.length <= 4) return '•••• (短すぎ)';
  return `${'•'.repeat(Math.max(8, s.length - 4))}${s.slice(-4)}`;
}

@Injectable()
export class LineAccountsService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  async findByTenant(tenantId: string) {
    const rows = await this.db
      .select()
      .from(lineAccounts)
      .where(eq(lineAccounts.tenantId, tenantId));
    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenantId,
      name: r.name,
      channelId: r.channelId,
      channelSecret: maskSecret(r.channelSecret),
      channelAccessToken: maskSecret(r.channelAccessToken),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  async findOne(id: string, tenantId: string) {
    const acc = await this.db.query.lineAccounts.findFirst({
      where: eq(lineAccounts.id, id),
    });
    if (!acc || acc.tenantId !== tenantId) {
      throw new NotFoundException(`LineAccount ${id} not found`);
    }
    return {
      ...acc,
      channelSecret: maskSecret(acc.channelSecret),
      channelAccessToken: maskSecret(acc.channelAccessToken),
    };
  }

  async create(tenantId: string, dto: CreateLineAccountDto) {
    const [acc] = await this.db
      .insert(lineAccounts)
      .values({
        tenantId,
        name: dto.name ?? null,
        channelId: dto.channelId,
        channelSecret: dto.channelSecret,
        channelAccessToken: dto.channelAccessToken,
      })
      .returning();
    return {
      ...acc,
      channelSecret: maskSecret(acc.channelSecret),
      channelAccessToken: maskSecret(acc.channelAccessToken),
    };
  }

  async update(id: string, tenantId: string, dto: UpdateLineAccountDto) {
    const existing = await this.db.query.lineAccounts.findFirst({
      where: eq(lineAccounts.id, id),
    });
    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundException(`LineAccount ${id} not found`);
    }
    // dto に含まれていない or 空文字の secret/token は更新しない (= マスキング表示のまま編集保存しても消えない)
    const next: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) next.name = dto.name;
    if (dto.channelId !== undefined && dto.channelId !== '') next.channelId = dto.channelId;
    if (dto.channelSecret !== undefined && dto.channelSecret !== '' && !dto.channelSecret.startsWith('•')) {
      next.channelSecret = dto.channelSecret;
    }
    if (dto.channelAccessToken !== undefined && dto.channelAccessToken !== '' && !dto.channelAccessToken.startsWith('•')) {
      next.channelAccessToken = dto.channelAccessToken;
    }
    const [acc] = await this.db
      .update(lineAccounts)
      .set(next)
      .where(eq(lineAccounts.id, id))
      .returning();
    return {
      ...acc,
      channelSecret: maskSecret(acc.channelSecret),
      channelAccessToken: maskSecret(acc.channelAccessToken),
    };
  }

  async remove(id: string, tenantId: string) {
    const existing = await this.db.query.lineAccounts.findFirst({
      where: eq(lineAccounts.id, id),
    });
    if (!existing || existing.tenantId !== tenantId) {
      throw new NotFoundException(`LineAccount ${id} not found`);
    }
    await this.db.delete(lineAccounts).where(eq(lineAccounts.id, id));
    return { ok: true };
  }

  // LINE 公式アカウントへの接続テスト (= 渡された channelAccessToken で /v2/bot/info を叩いて疎通確認)
  async testConnection(channelAccessToken: string): Promise<{ ok: boolean; botInfo?: unknown; error?: string }> {
    if (!channelAccessToken || channelAccessToken.startsWith('•')) {
      return { ok: false, error: 'channelAccessToken が空、または保存済の値です (= 編集時は新しいキーを貼り直してください)' };
    }
    try {
      const res = await fetch('https://api.line.me/v2/bot/info', {
        method: 'GET',
        headers: { Authorization: `Bearer ${channelAccessToken}` },
      });
      if (!res.ok) {
        const body = await res.text();
        return { ok: false, error: `LINE API エラー (${res.status}): ${body.slice(0, 200)}` };
      }
      const botInfo = await res.json();
      return { ok: true, botInfo };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
