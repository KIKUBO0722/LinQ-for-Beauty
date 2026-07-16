import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

@Controller('api/v1/reservations')
export class ReservationsController {
  constructor(private readonly service: ReservationsService) {}

  @Get()
  findAll(
    @Query('tenantId') tenantId: string,
    @Query('locationId') locationId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll(tenantId, locationId, from, to);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.findOne(id, user.tenantId);
  }

  @Post()
  create(@Query('tenantId') tenantId: string, @Body() dto: CreateReservationDto) {
    return this.service.create(tenantId, dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateReservationDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, user.tenantId, dto);
  }

  @Delete(':id')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.cancel(id, user.tenantId);
  }
}
