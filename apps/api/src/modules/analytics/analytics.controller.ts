import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

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
    return this.analytics.getKpis(tenantId, new Date(from), new Date(to), locationId);
  }

  @Get('daily')
  async daily(
    @Query('tenantId') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.analytics.getDailySeries(tenantId, new Date(from), new Date(to), locationId);
  }

  @Get('broadcast-funnel')
  async broadcastFunnel(
    @Query('tenantId') tenantId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.analytics.getBroadcastFunnel(tenantId, new Date(from), new Date(to), locationId);
  }

  @Get('cohort')
  async cohort(
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.analytics.getCohortAnalysis(tenantId, locationId);
  }
}
