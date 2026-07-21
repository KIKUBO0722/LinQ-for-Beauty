import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { asc, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as bcrypt from 'bcryptjs'; // bcryptjs 固定 (01 §設計判断 3)
import * as schema from '@linq-beauty/db';
import { tenants, users, type Tenant } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import { AuditService } from './audit.service';
import type { PlatformAdminClaims } from './current-admin.decorator';
import type { CreateTenantDto, IssueUserDto } from './dto/platform.dto';

type Db = NodePgDatabase<typeof schema>;

// 紛らわしい文字 (0/O/1/l/I/B/8/S/5・記号) 抜きの生成用アルファベット — 口頭/目視での受け渡しミス防止 (08 設計判断 7)。
// 50 字 × 12 桁 ≒ 67bit。剰余の偏りは初期パスワード用途 (再発行可能・bcrypt 保護下) で許容
const PASSWORD_ALPHABET = 'abcdefghjkmnpqrstuvwxyzACDEFGHJKMNPQRTUVWXYZ234679';

export function generatePassword(): string {
  return Array.from(randomBytes(12), (b) => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]).join('');
}

@Injectable()
export class PlatformService {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly audit: AuditService,
  ) {}

  /**
   * 店一覧 + 利用状況 (08 設計判断 8)。テナント横断の GROUP BY 6 本を並列実行し JS で結合 (N+1 にしない)。
   * テナント数が 3 桁に乗る前にページング + throttle を再訪する (Phase 2 マーカー)。
   */
  async listTenantsWithUsage() {
    // 当月境界 (JST): サーバー TZ=Asia/Tokyo は main.ts が起動時に実測検証 (localYmd と同じ根拠)
    const now = new Date();
    const monthStart = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
    const nextMonthStart = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 1));
    const monthStartTs = `${monthStart}T00:00:00+09:00`;
    const nextMonthStartTs = `${nextMonthStart}T00:00:00+09:00`;

    const [rows, locs, custs, usrs, resv, ai, lastMsg] = await Promise.all([
      this.db.query.tenants.findMany({ orderBy: [asc(tenants.createdAt)] }),
      this.db.execute(sql`SELECT tenant_id, COUNT(*)::int AS c FROM locations GROUP BY tenant_id`),
      this.db.execute(sql`SELECT tenant_id, COUNT(*)::int AS c FROM customers GROUP BY tenant_id`),
      this.db.execute(sql`SELECT tenant_id, COUNT(*)::int AS c FROM users GROUP BY tenant_id`),
      // 予約: reservations は tenant_id を持たない → locations JOIN (analytics.service.ts:218-220 の先例)。
      // 当月は両端境界 — 下限だけだと未来 (来月以降) の予約が「当月」に混入する。
      // status 無フィルタ = キャンセル含む活動量 (店側 KPI の confirmed/completed とは定義が異なる — 08 設計判断 8)
      this.db.execute(sql`
        SELECT l.tenant_id,
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE r.starts_at >= ${monthStartTs} AND r.starts_at < ${nextMonthStartTs})::int AS this_month
        FROM reservations r INNER JOIN locations l ON l.id = r.location_id
        GROUP BY l.tenant_id`),
      // AI 当月: usage_date は JST の date (localYmd 生成・未来行なし) — 下限のみで正しく、AT TIME ZONE は不要
      this.db.execute(sql`
        SELECT tenant_id, COALESCE(SUM(count), 0)::int AS c
        FROM ai_usage_daily WHERE usage_date >= ${monthStart}
        GROUP BY tenant_id`),
      // 最終活動: timestamptz で正確な messages.created_at のみ (naive な reservations.created_at は使わない)
      this.db.execute(sql`SELECT tenant_id, MAX(created_at) AS last_at FROM messages GROUP BY tenant_id`),
    ]);

    const countMap = (rs: unknown) =>
      new Map((rs as unknown as Array<{ tenant_id: string; c: number }>).map((r) => [r.tenant_id, r.c]));
    const locMap = countMap(locs);
    const custMap = countMap(custs);
    const userMap = countMap(usrs);
    const resvMap = new Map(
      (resv as unknown as Array<{ tenant_id: string; total: number; this_month: number }>).map((r) => [r.tenant_id, r]),
    );
    const aiMap = countMap(ai);
    const msgMap = new Map(
      (lastMsg as unknown as Array<{ tenant_id: string; last_at: string | Date | null }>).map((r) => [
        r.tenant_id,
        r.last_at,
      ]),
    );

    // 集計行の無いテナント (開設直後) は stats 全 0 / lastMessageAt null (undefined を JSON に漏らさない)
    return (rows as Tenant[]).map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      ownerName: t.ownerName,
      createdAt: t.createdAt,
      stats: {
        locations: locMap.get(t.id) ?? 0,
        customers: custMap.get(t.id) ?? 0,
        users: userMap.get(t.id) ?? 0,
        reservationsTotal: resvMap.get(t.id)?.total ?? 0,
        reservationsThisMonth: resvMap.get(t.id)?.this_month ?? 0,
        aiThisMonth: aiMap.get(t.id) ?? 0,
        lastMessageAt: msgMap.get(t.id) ?? null,
      },
    }));
  }

  /** 店の開設 = tenants insert + 監査を単一トランザクション (08 設計判断 6)。email 重複は事前 + 23505 の二段で 409 */
  async createTenant(admin: PlatformAdminClaims, dto: CreateTenantDto) {
    const dup = await this.db.query.tenants.findFirst({ where: eq(tenants.email, dto.email) });
    if (dup) throw new ConflictException('このメールアドレスの店が既に存在します');
    try {
      return await this.db.transaction(async (tx) => {
        const [tenant] = await tx
          .insert(tenants)
          .values({
            name: dto.name,
            email: dto.email,
            ownerName: dto.ownerName ?? null,
            ownerRole: dto.ownerRole ?? null,
            phone: dto.phone ?? null,
            address: dto.address ?? null,
          })
          .returning();
        await this.audit.record(tx, {
          actorId: admin.sub,
          action: 'tenant.create',
          targetTenantId: tenant.id,
          detail: { name: tenant.name, email: tenant.email }, // 店名 snapshot (FK を張らない代わり)
        });
        return tenant;
      });
    } catch (e) {
      // 事前チェックすり抜けの競合 (tenants.email unique)
      if ((e as { code?: string }).code === '23505') {
        throw new ConflictException('このメールアドレスの店が既に存在します');
      }
      throw e;
    }
  }

  /**
   * 初期アカウント発行 (08 設計判断 7)。平文パスワードは応答 1 回きり・DB はハッシュのみ。
   * 同一テナントに既存 email → パスワード再生成 (reissued)。別テナントに既存 → 409。
   */
  async issueUser(admin: PlatformAdminClaims, tenantId: string, dto: IssueUserDto) {
    const tenant = await this.db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
    if (!tenant) throw new NotFoundException('店が見つかりません');
    const existing = await this.db.query.users.findFirst({ where: eq(users.email, dto.email) });
    if (existing && existing.tenantId !== tenantId) {
      throw new ConflictException('このメールアドレスは別の店で使われています'); // users.email はグローバル unique
    }
    const password = generatePassword();
    const passwordHash = await bcrypt.hash(password, 10); // seed と同 cost
    const reissued = !!existing;
    try {
      return await this.db.transaction(async (tx) => {
        const rows = reissued
          ? await tx
              .update(users)
              .set({ passwordHash, updatedAt: new Date() })
              .where(eq(users.id, existing!.id))
              .returning()
          : await tx.insert(users).values({ tenantId, email: dto.email, passwordHash }).returning();
        const user = rows[0];
        if (!user) throw new NotFoundException('対象ユーザーが見つかりません'); // チェック後消滅 → 404 (500 にしない)
        await this.audit.record(tx, {
          actorId: admin.sub,
          action: reissued ? 'user.reset_password' : 'user.issue',
          targetTenantId: tenantId,
          detail: { email: dto.email }, // パスワード類は絶対に記録しない
        });
        return { userId: user.id, email: user.email, password, reissued }; // 平文はこの応答 1 回きり
      });
    } catch (e) {
      // 事前チェックすり抜けの競合 (users.email unique) — createTenant と対称の二段防御
      if ((e as { code?: string }).code === '23505') {
        throw new ConflictException('このメールアドレスは別の店で使われています');
      }
      throw e;
    }
  }
}

/** 任意の日付を 'YYYY-MM-DD' に (ai-usage.service.ts の localYmd と同根拠 — toISOString は UTC 日付になるため禁止) */
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
