import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { BroadcastsService } from './broadcasts.service';
import { CreateBroadcastDto, UpdateBroadcastDto } from './dto/broadcasts.dto';

@Controller('api/v1/broadcasts')
export class BroadcastsController {
  constructor(private readonly broadcastsService: BroadcastsService) {}

  @Get()
  list(
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.broadcastsService.list(tenantId, locationId);
  }

  @Get(':id')
  get(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.broadcastsService.get(tenantId, id);
  }

  @Post()
  create(
    @Query('tenantId') tenantId: string,
    @Body() body: CreateBroadcastDto,
    @Query('locationId') locationId?: string,
  ) {
    return this.broadcastsService.create(tenantId, body, locationId);
  }

  @Patch(':id')
  update(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateBroadcastDto,
  ) {
    return this.broadcastsService.update(tenantId, id, body);
  }

  @Delete(':id')
  cancel(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.broadcastsService.cancel(tenantId, id);
  }
}
