import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  LineAccountsService,
  type CreateLineAccountDto,
  type UpdateLineAccountDto,
} from './line-accounts.service';

@Controller('api/v1/line-accounts')
export class LineAccountsController {
  constructor(private readonly service: LineAccountsService) {}

  @Get()
  list(@Query('tenantId') tenantId: string) {
    return this.service.findByTenant(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.service.findOne(id, tenantId);
  }

  @Post()
  create(@Query('tenantId') tenantId: string, @Body() dto: CreateLineAccountDto) {
    return this.service.create(tenantId, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: UpdateLineAccountDto,
  ) {
    return this.service.update(id, tenantId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.service.remove(id, tenantId);
  }

  @Post('test-connection')
  testConnection(@Body() body: { channelAccessToken: string }) {
    return this.service.testConnection(body.channelAccessToken);
  }
}
