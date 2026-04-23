import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CreateBlockDto } from './dto/create-block.dto';

@Controller('api/v1')
export class CalendarController {
  constructor(private readonly service: CalendarService) {}

  @Get('calendar/slots')
  getSlots(
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId: string,
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
  ) {
    return this.service.getSlots(tenantId, locationId, serviceId, date);
  }

  @Get('personal-blocks')
  getBlocks(@Query('tenantId') tenantId: string, @Query('locationId') locationId?: string) {
    return this.service.getBlocks(tenantId, locationId);
  }

  @Post('personal-blocks')
  createBlock(@Query('tenantId') tenantId: string, @Body() dto: CreateBlockDto) {
    return this.service.createBlock(tenantId, dto);
  }

  @Delete('personal-blocks/:id')
  @HttpCode(204)
  removeBlock(@Param('id') id: string, @Query('tenantId') tenantId: string) {
    return this.service.removeBlock(id, tenantId);
  }
}
