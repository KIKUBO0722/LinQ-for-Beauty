import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { IcsService } from './ics.service';

@Controller('api/v1/ics')
export class IcsController {
  constructor(
    private readonly service: IcsService,
    private readonly config: ConfigService,
  ) {}

  @Post('tokens')
  async issue(
    @Query('tenantId') tenantId: string,
    @Body() body: { locationId?: string } = {},
  ) {
    const record = await this.service.issueToken(tenantId, body.locationId);
    const base = this.config.get<string>('ICS_BASE_URL') ?? 'http://localhost:3333';
    return {
      id: record.id,
      token: record.token,
      icsUrl: `${base}/api/v1/ics/${record.token}.ics`,
      locationId: record.locationId,
      createdAt: record.createdAt,
    };
  }

  @Get(':file')
  async getFeed(@Param('file') file: string, @Res() res: Response) {
    const token = file.endsWith('.ics') ? file.slice(0, -4) : file;
    const ics = await this.service.generateFeed(token);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'max-age=300');
    res.send(ics);
  }
}
