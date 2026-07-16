import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { DB } from '../../database/database.module';

type Db = NodePgDatabase<typeof schema>;

export type AnalyticsKpis = {
  newCustomers: { value: number; deltaPct: number | null };
  repeatRate: { value: number; deltaPct: number | null };
  churnRate: { value: number; deltaPct: number | null };
  avgPrice: { value: number; deltaPct: number | null };
  totalReservations: { value: number; deltaPct: number | null };
  blockCount: { value: number; deltaPct: number | null };
  byLocation: { locationId: string; locationName: string; reservationCount: number; uniqueCustomers: number }[];
  bySource: { source: string; label: string; count: number }[];
  periodFrom: string;
  periodTo: string;
};

export type DailyPoint = {
  date: string;
  reservations: number;
  visits: number;
  newCustomers: number;
};

export type CohortAnalysis = {
  cohortMonths: string[]; // 直近 6 ヶ月 (古い → 新しい順) "2025-12" 形式
  monthOffsets: number[]; // [0, 1, 2, 3, 4, 5]
  cohorts: {
    cohortMonth: string; // "2025-12"
    cohortSize: number; // デビュー月の顧客数
    retention: (number | null)[]; // [%]、長さ 6、未来は null
  }[];
};

export type BroadcastFunnel = {
  broadcastCount: number;
  totalRecipients: number;
  totalDelivered: number;
  totalOpened: number;
  totalClicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  ctOr: number; // Click-to-Open Rate (= 開封者のうちクリックした率)
  blockedDuringPeriod: number;
  recent: {
    broadcastId: string;
    title: string;
    sentAt: string;
    recipientCount: number;
    responseCount: number;
    clickCount: number;
    clickerCount: number;
    blockCount: number;
  }[];
};

const SOURCE_LABELS: Record<string, string> = {
  line_friend: 'LINE 友だち追加',
  csv_import: 'CSV 取り込み',
  form: 'お問い合わせフォーム',
  manual: '手動登録',
  qr: 'QR コード',
  referral: '紹介',
  ad: '広告',
  unknown: '不明',
};

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  async getKpis(tenantId: string, from: Date, to: Date, locationId?: string): Promise<AnalyticsKpis> {
    const fromIso = from.toISOString();
    const toIso = to.toISOString();
    const periodDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
    const prevFromIso = new Date(from.getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgoIso = new Date(to.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

    // reservations は tenant_id 列を持たない → locations 経由で絞り込む
    const resvTenantFilter = locationId
      ? sql`r.location_id = ${locationId}`
      : sql`r.location_id IN (SELECT id FROM locations WHERE tenant_id = ${tenantId})`;
    const custLocFilter = locationId
      ? sql`AND preferred_location_id = ${locationId}`
      : sql``;

    // 1) 新規顧客 (期間内 + 前期間)
    const newCustomers = await this.safeCount(
      'period new customers',
      sql`SELECT COUNT(*)::int AS c FROM customers
          WHERE tenant_id = ${tenantId}
            AND created_at >= ${fromIso} AND created_at < ${toIso}
            ${custLocFilter}`,
    );
    const prevNewCustomers = await this.safeCount(
      'prev new customers',
      sql`SELECT COUNT(*)::int AS c FROM customers
          WHERE tenant_id = ${tenantId}
            AND created_at >= ${prevFromIso} AND created_at < ${fromIso}
            ${custLocFilter}`,
    );

    // 2) 期間内予約数 (前期間と比較)
    const totalReservations = await this.safeCount(
      'period reservations',
      sql`SELECT COUNT(*)::int AS c FROM reservations r
          WHERE ${resvTenantFilter}
            AND r.starts_at >= ${fromIso} AND r.starts_at < ${toIso}`,
    );
    const prevReservations = await this.safeCount(
      'prev reservations',
      sql`SELECT COUNT(*)::int AS c FROM reservations r
          WHERE ${resvTenantFilter}
            AND r.starts_at >= ${prevFromIso} AND r.starts_at < ${fromIso}`,
    );

    // 3) 失客率 (60 日間予約なしの顧客数 / 全顧客数)
    const totalCustomers = await this.safeCount(
      'total customers',
      sql`SELECT COUNT(*)::int AS c FROM customers
          WHERE tenant_id = ${tenantId} ${custLocFilter}`,
    );
    const activeCustomers = await this.safeCount(
      'active customers (60d)',
      sql`SELECT COUNT(DISTINCT r.customer_id)::int AS c FROM reservations r
          WHERE ${resvTenantFilter}
            AND r.starts_at >= ${sixtyDaysAgoIso}
            AND r.customer_id IS NOT NULL`,
    );

    // 4) リピート率 = 期間内に 2 回以上来た顧客 / 期間内に 1 回以上来た顧客
    let totalActive = 0;
    let twicePlus = 0;
    try {
      const repeatRows = (await this.db.execute(sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE visit_count >= 2)::int AS twice_plus
        FROM (
          SELECT r.customer_id, COUNT(*) AS visit_count
          FROM reservations r
          WHERE ${resvTenantFilter}
            AND r.starts_at >= ${fromIso}
            AND r.starts_at < ${toIso}
            AND r.customer_id IS NOT NULL
          GROUP BY r.customer_id
        ) sub
      `)) as unknown as Array<{ total: number; twice_plus: number }>;
      totalActive = repeatRows[0]?.total ?? 0;
      twicePlus = repeatRows[0]?.twice_plus ?? 0;
    } catch (e) {
      this.logger.error(`repeat query failed: ${e}`);
    }
    const repeatRate = totalActive > 0 ? Math.round((twicePlus / totalActive) * 1000) / 10 : 0;

    // 5) 平均単価 (期間内の予約 × services.price の平均、キャンセル除く)
    let avgPrice = 0;
    let prevAvgPrice = 0;
    try {
      const rows = (await this.db.execute(sql`
        SELECT COALESCE(AVG(s.price), 0)::int AS avg_price
        FROM reservations r
        INNER JOIN services s ON s.id = r.service_id
        WHERE ${resvTenantFilter}
          AND r.starts_at >= ${fromIso} AND r.starts_at < ${toIso}
          AND r.status IN ('confirmed', 'completed')
          AND s.price IS NOT NULL
      `)) as unknown as Array<{ avg_price: number }>;
      avgPrice = rows[0]?.avg_price ?? 0;
      const prevRows = (await this.db.execute(sql`
        SELECT COALESCE(AVG(s.price), 0)::int AS avg_price
        FROM reservations r
        INNER JOIN services s ON s.id = r.service_id
        WHERE ${resvTenantFilter}
          AND r.starts_at >= ${prevFromIso} AND r.starts_at < ${fromIso}
          AND r.status IN ('confirmed', 'completed')
          AND s.price IS NOT NULL
      `)) as unknown as Array<{ avg_price: number }>;
      prevAvgPrice = prevRows[0]?.avg_price ?? 0;
    } catch (e) {
      this.logger.error(`avgPrice query failed: ${e}`);
    }

    // 6) LINE 友だち削除 (ブロック) 件数
    const blockLocFilter = locationId ? sql`AND location_id = ${locationId}` : sql``;
    const blockCount = await this.safeCount(
      'block events',
      sql`SELECT COUNT(*)::int AS c FROM block_events
          WHERE tenant_id = ${tenantId}
            AND blocked_at >= ${fromIso} AND blocked_at < ${toIso}
            ${blockLocFilter}`,
    );
    const prevBlockCount = await this.safeCount(
      'prev block events',
      sql`SELECT COUNT(*)::int AS c FROM block_events
          WHERE tenant_id = ${tenantId}
            AND blocked_at >= ${prevFromIso} AND blocked_at < ${fromIso}
            ${blockLocFilter}`,
    );

    // 7) 拠点別 (拠点フィルタ ON 時は単一行)
    let byLocation: AnalyticsKpis['byLocation'] = [];
    try {
      const locFilter = locationId ? sql`AND r.location_id = ${locationId}` : sql``;
      const rows = (await this.db.execute(sql`
        SELECT
          r.location_id,
          l.name AS location_name,
          COUNT(*)::int AS reservation_count,
          COUNT(DISTINCT r.customer_id)::int AS unique_customers
        FROM reservations r
        INNER JOIN locations l ON l.id = r.location_id
        WHERE l.tenant_id = ${tenantId}
          AND r.starts_at >= ${fromIso}
          AND r.starts_at < ${toIso}
          ${locFilter}
        GROUP BY r.location_id, l.name
        ORDER BY reservation_count DESC
      `)) as unknown as Array<{
        location_id: string;
        location_name: string | null;
        reservation_count: number;
        unique_customers: number;
      }>;
      byLocation = rows.map((r) => ({
        locationId: r.location_id,
        locationName: r.location_name ?? '未設定',
        reservationCount: r.reservation_count,
        uniqueCustomers: r.unique_customers,
      }));
    } catch (e) {
      this.logger.error(`byLocation query failed: ${e}`);
    }

    // 8) 流入元内訳 (期間内に新規登録した顧客の acquisition_source 別 GROUP BY)
    let bySource: AnalyticsKpis['bySource'] = [];
    try {
      const rows = (await this.db.execute(sql`
        SELECT
          COALESCE(acquisition_source, 'unknown') AS source,
          COUNT(*)::int AS c
        FROM customers
        WHERE tenant_id = ${tenantId}
          AND created_at >= ${fromIso}
          AND created_at < ${toIso}
          ${custLocFilter}
        GROUP BY acquisition_source
        ORDER BY c DESC
      `)) as unknown as Array<{ source: string; c: number }>;
      bySource = rows.map((r) => ({
        source: r.source,
        label: SOURCE_LABELS[r.source] ?? r.source,
        count: r.c,
      }));
    } catch (e) {
      this.logger.error(`bySource query failed: ${e}`);
    }

    const churned = Math.max(0, totalCustomers - activeCustomers);
    const churnRate = totalCustomers > 0 ? Math.round((churned / totalCustomers) * 1000) / 10 : 0;

    const deltaPct = (curr: number, prev: number): number | null => {
      if (prev === 0) return null;
      return Math.round(((curr - prev) / prev) * 1000) / 10;
    };

    return {
      newCustomers: { value: newCustomers, deltaPct: deltaPct(newCustomers, prevNewCustomers) },
      repeatRate: { value: repeatRate, deltaPct: null },
      churnRate: { value: churnRate, deltaPct: null },
      avgPrice: { value: avgPrice, deltaPct: deltaPct(avgPrice, prevAvgPrice) },
      totalReservations: { value: totalReservations, deltaPct: deltaPct(totalReservations, prevReservations) },
      blockCount: { value: blockCount, deltaPct: deltaPct(blockCount, prevBlockCount) },
      byLocation,
      bySource,
      periodFrom: fromIso,
      periodTo: toIso,
    };
  }

  async getDailySeries(tenantId: string, from: Date, to: Date, locationId?: string): Promise<DailyPoint[]> {
    const fromIso = from.toISOString();
    const toIso = to.toISOString();
    const resvTenantFilter = locationId
      ? sql`r.location_id = ${locationId}`
      : sql`r.location_id IN (SELECT id FROM locations WHERE tenant_id = ${tenantId})`;
    const custLocFilter = locationId ? sql`AND preferred_location_id = ${locationId}` : sql``;

    try {
      // v0.1a TZ 修正: timestamptz への ::date は DB サーバー側 TZ (Supabase=UTC) で評価されるため、
      // AT TIME ZONE 'Asia/Tokyo' で JST の日付に明示変換する (Node の TZ 設定だけでは直らない唯一の箇所)
      const rows = (await this.db.execute(sql`
        WITH dates AS (
          SELECT generate_series(
            (${fromIso}::timestamptz AT TIME ZONE 'Asia/Tokyo')::date,
            (${toIso}::timestamptz AT TIME ZONE 'Asia/Tokyo')::date - INTERVAL '1 day',
            '1 day')::date AS d
        ),
        r_agg AS (
          SELECT
            (r.starts_at AT TIME ZONE 'Asia/Tokyo')::date AS d,
            COUNT(*)::int AS reservations,
            COUNT(*) FILTER (WHERE r.status = 'completed')::int AS visits
          FROM reservations r
          WHERE ${resvTenantFilter}
            AND r.starts_at >= ${fromIso}
            AND r.starts_at < ${toIso}
          GROUP BY (r.starts_at AT TIME ZONE 'Asia/Tokyo')::date
        ),
        c_agg AS (
          SELECT
            (created_at AT TIME ZONE 'Asia/Tokyo')::date AS d,
            COUNT(*)::int AS new_customers
          FROM customers
          WHERE tenant_id = ${tenantId}
            AND created_at >= ${fromIso}
            AND created_at < ${toIso}
            ${custLocFilter}
          GROUP BY (created_at AT TIME ZONE 'Asia/Tokyo')::date
        )
        SELECT
          dates.d::text AS d,
          COALESCE(r_agg.reservations, 0)::int AS reservations,
          COALESCE(r_agg.visits, 0)::int AS visits,
          COALESCE(c_agg.new_customers, 0)::int AS new_customers
        FROM dates
        LEFT JOIN r_agg ON r_agg.d = dates.d
        LEFT JOIN c_agg ON c_agg.d = dates.d
        ORDER BY dates.d
      `)) as unknown as Array<{ d: string; reservations: number; visits: number; new_customers: number }>;
      return rows.map((r) => ({
        date: r.d,
        reservations: r.reservations,
        visits: r.visits,
        newCustomers: r.new_customers,
      }));
    } catch (e) {
      this.logger.error(`getDailySeries failed: ${e}`);
      return [];
    }
  }

  async getCohortAnalysis(tenantId: string, locationId?: string): Promise<CohortAnalysis> {
    const resvTenantFilter = locationId
      ? sql`r.location_id = ${locationId}`
      : sql`r.location_id IN (SELECT id FROM locations WHERE tenant_id = ${tenantId})`;

    // 直近 6 ヶ月のコホート月 (古い → 新しい)
    // サーバー TZ=Asia/Tokyo 前提 (main.ts が起動時に実測検証) — JS のローカル月計算は JST の月になる
    const now = new Date();
    const cohortMonths: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      cohortMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const earliestCohortIso = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString();

    type Row = { cohort_month: string; month_offset: number; active_customers: number };
    let rows: Row[] = [];
    try {
      rows = (await this.db.execute(sql`
        WITH first_visits AS (
          SELECT
            r.customer_id,
            DATE_TRUNC('month', MIN(r.starts_at) AT TIME ZONE 'Asia/Tokyo')::date AS cohort_month
          FROM reservations r
          WHERE ${resvTenantFilter}
            AND r.customer_id IS NOT NULL
          GROUP BY r.customer_id
        ),
        all_visit_months AS (
          SELECT DISTINCT
            r.customer_id,
            DATE_TRUNC('month', r.starts_at AT TIME ZONE 'Asia/Tokyo')::date AS visit_month
          FROM reservations r
          WHERE ${resvTenantFilter}
            AND r.customer_id IS NOT NULL
        )
        SELECT
          fv.cohort_month::text AS cohort_month,
          ((EXTRACT(YEAR FROM av.visit_month) - EXTRACT(YEAR FROM fv.cohort_month)) * 12
            + (EXTRACT(MONTH FROM av.visit_month) - EXTRACT(MONTH FROM fv.cohort_month)))::int AS month_offset,
          COUNT(DISTINCT fv.customer_id)::int AS active_customers
        FROM first_visits fv
        INNER JOIN all_visit_months av ON av.customer_id = fv.customer_id AND av.visit_month >= fv.cohort_month
        WHERE fv.cohort_month >= (${earliestCohortIso}::timestamptz AT TIME ZONE 'Asia/Tokyo')::date
        GROUP BY fv.cohort_month, av.visit_month
        ORDER BY fv.cohort_month, month_offset
      `)) as unknown as Row[];
    } catch (e) {
      this.logger.error(`getCohortAnalysis query failed: ${e}`);
    }

    // cohort_month キーは "YYYY-MM-DD" 形式 → "YYYY-MM" に正規化
    const normalize = (d: string): string => d.slice(0, 7);

    // cohort_month × month_offset の集計マップ
    const map = new Map<string, Map<number, number>>();
    for (const r of rows) {
      const cm = normalize(r.cohort_month);
      if (!map.has(cm)) map.set(cm, new Map());
      const offset = Number(r.month_offset);
      if (offset >= 0 && offset <= 5) {
        map.get(cm)!.set(offset, Number(r.active_customers));
      }
    }

    // サーバー TZ=Asia/Tokyo 前提 (main.ts が起動時に実測検証) — 「今月」は JST の今月
    const nowYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const cohorts: CohortAnalysis['cohorts'] = cohortMonths.map((cm) => {
      const inner = map.get(cm) ?? new Map();
      const cohortSize = inner.get(0) ?? 0;
      const retention: (number | null)[] = [];
      for (let offset = 0; offset <= 5; offset++) {
        // 未来月は null (例: 2026-04 デビューで offset 3 は 2026-07、現在より未来なら未確定)
        const offsetMonthIdx =
          (parseInt(cm.slice(0, 4), 10) - parseInt(nowYM.slice(0, 4), 10)) * 12
          + (parseInt(cm.slice(5, 7), 10) - parseInt(nowYM.slice(5, 7), 10))
          + offset;
        if (offsetMonthIdx > 0) {
          retention.push(null);
        } else if (cohortSize === 0) {
          retention.push(null);
        } else {
          const active = inner.get(offset) ?? 0;
          retention.push(Math.round((active / cohortSize) * 1000) / 10);
        }
      }
      return { cohortMonth: cm, cohortSize, retention };
    });

    return {
      cohortMonths,
      monthOffsets: [0, 1, 2, 3, 4, 5],
      cohorts,
    };
  }

  async getBroadcastFunnel(tenantId: string, from: Date, to: Date, locationId?: string): Promise<BroadcastFunnel> {
    const fromIso = from.toISOString();
    const toIso = to.toISOString();
    const broadcastLocFilter = locationId ? sql`AND b.location_id = ${locationId}` : sql``;
    const blockLocFilter = locationId ? sql`AND location_id = ${locationId}` : sql``;

    // 期間内に送信された一斉配信 + broadcast_stats を JS-merge join (drizzle dual-package 型エラー回避)
    let broadcastCount = 0;
    let totalRecipients = 0;
    let totalDelivered = 0;
    let totalOpened = 0;
    let totalClicked = 0;
    let recent: BroadcastFunnel['recent'] = [];

    try {
      const broadcasts = (await this.db.execute(sql`
        SELECT
          b.id AS broadcast_id,
          COALESCE(b.title, '無題') AS title,
          b.sent_at AS sent_at,
          b.recipient_count AS recipient_count
        FROM broadcasts b
        WHERE b.tenant_id = ${tenantId}
          AND b.status = 'sent'
          AND b.sent_at >= ${fromIso}
          AND b.sent_at < ${toIso}
          ${broadcastLocFilter}
        ORDER BY b.sent_at DESC
      `)) as unknown as Array<{
        broadcast_id: string;
        title: string;
        sent_at: string;
        recipient_count: number;
      }>;
      broadcastCount = broadcasts.length;

      if (broadcasts.length > 0) {
        const stats = (await this.db.execute(sql`
          SELECT
            broadcast_id,
            recipient_count AS stat_recipient_count,
            response_count,
            click_count,
            clicker_count,
            block_count
          FROM broadcast_stats
          WHERE broadcast_id IN (${sql.join(broadcasts.map((b) => sql`${b.broadcast_id}`), sql`, `)})
        `)) as unknown as Array<{
          broadcast_id: string;
          stat_recipient_count: number;
          response_count: number;
          click_count: number;
          clicker_count: number;
          block_count: number;
        }>;
        const statMap = new Map(stats.map((s) => [s.broadcast_id, s]));

        for (const b of broadcasts) {
          const s = statMap.get(b.broadcast_id);
          const recipients = s?.stat_recipient_count ?? b.recipient_count ?? 0;
          const opened = s?.response_count ?? 0; // response_count = 開封 + 返信を兼ねた既存指標
          const clicked = s?.click_count ?? 0;
          const clickers = s?.clicker_count ?? 0;
          totalRecipients += recipients;
          totalDelivered += recipients; // LINE Messaging API は到達 = 送信が標準前提
          totalOpened += opened;
          totalClicked += clicked;
          recent.push({
            broadcastId: b.broadcast_id,
            title: b.title,
            sentAt: b.sent_at,
            recipientCount: recipients,
            responseCount: opened,
            clickCount: clicked,
            clickerCount: clickers,
            blockCount: s?.block_count ?? 0,
          });
        }
        // 最近 5 件に絞る
        recent = recent.slice(0, 5);
      }
    } catch (e) {
      this.logger.error(`getBroadcastFunnel main query failed: ${e}`);
    }

    // 期間中のブロック総数 (期間内 broadcast 紐付きに限らず期間中の発生件数)
    const blockedDuringPeriod = await this.safeCount(
      'block events during period',
      sql`SELECT COUNT(*)::int AS c FROM block_events
          WHERE tenant_id = ${tenantId}
            AND blocked_at >= ${fromIso} AND blocked_at < ${toIso}
            ${blockLocFilter}`,
    );

    const rate = (num: number, den: number): number =>
      den > 0 ? Math.round((num / den) * 1000) / 10 : 0;

    return {
      broadcastCount,
      totalRecipients,
      totalDelivered,
      totalOpened,
      totalClicked,
      deliveryRate: rate(totalDelivered, totalRecipients),
      openRate: rate(totalOpened, totalDelivered),
      clickRate: rate(totalClicked, totalDelivered),
      ctOr: rate(totalClicked, totalOpened),
      blockedDuringPeriod,
      recent,
    };
  }

  private async safeCount(label: string, q: SQL): Promise<number> {
    try {
      const rows = (await this.db.execute(q)) as unknown as Array<{ c: number }>;
      return rows[0]?.c ?? 0;
    } catch (e) {
      this.logger.error(`Count query failed [${label}]: ${e}`);
      return 0;
    }
  }
}
