import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Controller('api/v1/services')
export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  @Get()
  findAll(@Query('tenantId') tenantId: string, @Query('locationId') locationId?: string) {
    return this.service.findAll(tenantId, locationId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.service.findOne(id, tenantId);
  }

  @Post()
  create(@Query('tenantId') tenantId: string, @Body() dto: CreateServiceDto) {
    return this.service.create(tenantId, dto);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.service.update(id, tenantId, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.service.remove(id, tenantId);
  }
}
