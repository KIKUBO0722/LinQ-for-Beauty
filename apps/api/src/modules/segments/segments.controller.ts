import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { SegmentsService } from './segments.service';
import { CreateSegmentDto, UpdateSegmentDto } from './dto/segments.dto';

@Controller('api/v1/segments')
export class SegmentsController {
  constructor(private readonly segmentsService: SegmentsService) {}

  @Get()
  async list(@Query('tenantId') tenantId: string) {
    return this.segmentsService.list(tenantId);
  }

  @Get(':id')
  async get(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.segmentsService.get(tenantId, id);
  }

  @Post()
  async create(@Query('tenantId') tenantId: string, @Body() body: CreateSegmentDto) {
    return this.segmentsService.create(tenantId, body);
  }

  @Patch(':id')
  async update(@Query('tenantId') tenantId: string, @Param('id') id: string, @Body() body: UpdateSegmentDto) {
    return this.segmentsService.update(tenantId, id, body);
  }

  @Delete(':id')
  async remove(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    await this.segmentsService.remove(tenantId, id);
    return { ok: true };
  }

  /** Day 7 では件数のみ。Day 8 で内訳 + コスト見積を追加 */
  @Get(':id/preview-count')
  async previewCount(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    const segment = await this.segmentsService.get(tenantId, id);
    const ids = await this.segmentsService.getMatchingCustomerIds(
      tenantId,
      segment.tagIds,
      segment.matchType,
      segment.excludeTagIds,
      segment.locationId,
    );
    return { count: ids.length };
  }
}
