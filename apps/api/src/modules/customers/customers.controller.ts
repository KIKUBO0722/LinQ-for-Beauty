import { Controller, Get, Patch, Body, Param, Query, NotFoundException } from '@nestjs/common';
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
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.customersService.list(tenantId, {
      locationId,
      search,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
    });
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

  @Patch(':id')
  update(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateCustomerDto,
  ) {
    return this.customersService.update(id, tenantId, body);
  }
}
