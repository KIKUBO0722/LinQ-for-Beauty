import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

// v0.1a TZ 修正: web は 'YYYY-MM-DD' を送るが、new Date('YYYY-MM-DD') は JS 仕様上
// TZ 環境変数と無関係に常に「UTC 深夜」として parse され、JST 0-9 時台の予約が期間境界 (WHERE) から漏れる。
// date-only は JST 深夜として読み、to は「その日を含む」意味論 (翌日 JST 深夜を排他上限) に確定する。
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** 'YYYY-MM-DD' → その日の JST 00:00。完全 ISO 文字列はそのまま parse (後方互換) */
function jstStart(s: string): Date {
  return DATE_ONLY.test(s) ? new Date(`${s}T00:00:00+09:00`) : new Date(s);
}

/** 'YYYY-MM-DD' → 翌日 JST 00:00 (排他上限 = to 当日を丸ごと含む) */
function jstEndExclusive(s: string): Date {
  return DATE_ONLY.test(s) ? new Date(jstStart(s).getTime() + 86_400_000) : new Date(s);
}

@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('kpis')
  async kpis(
    @Query('tenantId') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.analytics.getKpis(tenantId, jstStart(from), jstEndExclusive(to), locationId);
  }

  @Get('daily')
  async daily(
    @Query('tenantId') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.analytics.getDailySeries(tenantId, jstStart(from), jstEndExclusive(to), locationId);
  }

  @Get('broadcast-funnel')
  async broadcastFunnel(
    @Query('tenantId') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.analytics.getBroadcastFunnel(tenantId, jstStart(from), jstEndExclusive(to), locationId);
  }

  @Get('cohort')
  async cohort(
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.analytics.getCohortAnalysis(tenantId, locationId);
  }
}
