import { Controller, Get, Patch, Post, Body, Param, Query, NotFoundException, Res } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { TagsService } from '../tags/tags.service';
import { UpdateCustomerDto } from './dto/customers.dto';

@Controller('api/v1/customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly tagsService: TagsService,
  ) {}

  @Get()
  list(
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId?: string,
    @Query('search') search?: string,
    @Query('tagIds') tagIds?: string,
    @Query('chatStatus') chatStatus?: string,
    @Query('engagementTier') engagementTier?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.customersService.list(tenantId, {
      locationId,
      search,
      tagIds: tagIds ? tagIds.split(',').filter(Boolean) : undefined,
      chatStatus,
      engagementTier,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Get('export/csv')
  async exportCsv(
    @Query('tenantId') tenantId: string,
    @Res() res: { setHeader: (k: string, v: string) => void; send: (d: string) => void },
  ) {
    const csv = await this.customersService.exportCsv(tenantId);
    const filename = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(csv);
  }

  @Post('import/csv')
  importCsv(@Query('tenantId') tenantId: string, @Body() body: { csv: string }) {
    return this.customersService.importFromCsv(tenantId, body.csv);
  }

  @Get(':id')
  async getById(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    const customer = await this.customersService.findById(id, tenantId);
    if (!customer) throw new NotFoundException('顧客が見つかりません');
    return customer;
  }

  @Get(':id/tags')
  async listTags(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    await this.customersService.findByIdOrThrow(id, tenantId);
    return this.tagsService.listForCustomer(id);
  }

  @Get(':id/timeline')
  async getTimeline(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.customersService.getTimeline(tenantId, id, {
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
    });
  }

  @Patch(':id')
  update(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, tenantId, body);
  }

  @Patch(':id/custom-fields')
  async updateCustomFields(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const customFields = await this.customersService.updateCustomFields(id, tenantId, body);
    return { ok: true, customFields };
  }
}
