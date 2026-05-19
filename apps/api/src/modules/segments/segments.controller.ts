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

  /** 該当件数のみ (軽量、編集中の即時表示用) */
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

  /** Day 8: 詳細プレビュー (件数 + 内訳 + 費用見積 + サンプル顧客) */
  @Get(':id/preview')
  async preview(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.segmentsService.previewDetail(tenantId, id);
  }

  /** Day 8: セグメント配信実行 */
  @Post(':id/broadcast')
  async broadcast(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: { message: string },
  ) {
    return this.segmentsService.broadcastToSegment(tenantId, id, body.message);
  }

  /** Day 8: AI による配信文 3 案提案 */
  @Post(':id/suggest')
  async suggest(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.segmentsService.suggestBroadcastMessages(tenantId, id);
  }

  /** Day 8: 配信履歴一覧 */
  @Get(':id/history')
  async history(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.segmentsService.listBroadcastHistory(tenantId, id);
  }
}
