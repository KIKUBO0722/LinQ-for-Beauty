import { Inject, Injectable, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
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
  byLocation: { locationId: string; locationName: string; reservationCount: number; uniqueCustomers: number }[];
  periodFrom: string;
  periodTo: string;
};

export type DailyPoint = {
  date: string;
  reservations: number;
  visits: number;
  newCustomers: number;
};

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  async getKpis(tenantId: string, from: Date, to: Date, locationId?: string): Promise<AnalyticsKpis> {
    try {
      const fromIso = from.toISOString();
      const toIso = to.toISOString();
      const periodDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
      const prevFromIso = new Date(from.getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString();
      const sixtyDaysAgoIso = new Date(to.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

      // 各 SQL を try/catch で個別に保護し、失敗時は 0 に fallback
      const newCustomers = await this.safeCount(
        `period new customers`,
        sql`SELECT COUNT(*)::int AS c FROM customers WHERE tenant_id = ${tenantId} AND created_at >= ${fromIso} AND created_at < ${toIso}`,
      );
      const prevNewCustomers = await this.safeCount(
        `prev new customers`,
        sql`SELECT COUNT(*)::int AS c FROM customers WHERE tenant_id = ${tenantId} AND created_at >= ${prevFromIso} AND created_at < ${fromIso}`,
      );
      const totalReservations = await this.safeCount(
        `period reservations`,
        sql`SELECT COUNT(*)::int AS c FROM reservations WHERE tenant_id = ${tenantId} AND starts_at >= ${fromIso} AND starts_at < ${toIso}`,
      );
      const prevReservations = await this.safeCount(
        `prev reservations`,
        sql`SELECT COUNT(*)::int AS c FROM reservations WHERE tenant_id = ${tenantId} AND starts_at >= ${prevFromIso} AND starts_at < ${fromIso}`,
      );
      const totalCustomers = await this.safeCount(
        `total customers`,
        sql`SELECT COUNT(*)::int AS c FROM customers WHERE tenant_id = ${tenantId}`,
      );
      const activeCustomers = await this.safeCount(
        `active customers (60d)`,
        sql`SELECT COUNT(DISTINCT customer_id)::int AS c FROM reservations WHERE tenant_id = ${tenantId} AND starts_at >= ${sixtyDaysAgoIso} AND customer_id IS NOT NULL`,
      );

      // リピート率
      let once = 0;
      let twicePlus = 0;
      try {
        const repeatRows = (await this.db.execute(sql`
          SELECT
            COUNT(*)::int AS once,
            COUNT(*) FILTER (WHERE visit_count >= 2)::int AS twice_plus
          FROM (
            SELECT customer_id, COUNT(*) AS visit_count
            FROM reservations
            WHERE tenant_id = ${tenantId}
              AND starts_at >= ${fromIso}
              AND starts_at < ${toIso}
              AND customer_id IS NOT NULL
            GROUP BY customer_id
          ) sub
        `)) as unknown as Array<{ once: number; twice_plus: number }>;
        once = repeatRows[0]?.once ?? 0;
        twicePlus = repeatRows[0]?.twice_plus ?? 0;
      } catch (e) {
        this.logger.error(`repeat query failed: ${e}`);
      }
      const repeatRate = once > 0 ? Math.round((twicePlus / once) * 1000) / 10 : 0;

      // 拠点別
      let byLocation: AnalyticsKpis['byLocation'] = [];
      try {
        const rows = (await this.db.execute(sql`
          SELECT
            r.location_id,
            l.name AS location_name,
            COUNT(*)::int AS reservation_count,
            COUNT(DISTINCT r.customer_id)::int AS unique_customers
          FROM reservations r
          LEFT JOIN locations l ON l.id = r.location_id
          WHERE r.tenant_id = ${tenantId}
            AND r.starts_at >= ${fromIso}
            AND r.starts_at < ${toIso}
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
        avgPrice: { value: 0, deltaPct: null },
        totalReservations: { value: totalReservations, deltaPct: deltaPct(totalReservations, prevReservations) },
        byLocation,
        periodFrom: fromIso,
        periodTo: toIso,
      };
    } catch (e) {
      this.logger.error(`getKpis failed: ${e}`);
      throw e;
    }
  }

  async getDailySeries(tenantId: string, from: Date, to: Date, locationId?: string): Promise<DailyPoint[]> {
    try {
      const rows = (await this.db.execute(sql`
        WITH dates AS (
          SELECT generate_series(${from.toISOString()}::date, ${to.toISOString()}::date - INTERVAL '1 day', '1 day')::date AS d
        ),
        r_agg AS (
          SELECT
            starts_at::date AS d,
            COUNT(*)::int AS reservations,
            COUNT(*) FILTER (WHERE status = 'completed')::int AS visits
          FROM reservations
          WHERE tenant_id = ${tenantId}
            AND starts_at >= ${from.toISOString()}
            AND starts_at < ${to.toISOString()}
          GROUP BY starts_at::date
        ),
        c_agg AS (
          SELECT
            created_at::date AS d,
            COUNT(*)::int AS new_customers
          FROM customers
          WHERE tenant_id = ${tenantId}
            AND created_at >= ${from.toISOString()}
            AND created_at < ${to.toISOString()}
          GROUP BY created_at::date
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

  private async safeCount(label: string, q: ReturnType<typeof sql>): Promise<number> {
    try {
      const rows = (await this.db.execute(q)) as unknown as Array<{ c: number }>;
      return rows[0]?.c ?? 0;
    } catch (e) {
      this.logger.error(`Count query failed [${label}]: ${e}`);
      return 0;
    }
  }
}
