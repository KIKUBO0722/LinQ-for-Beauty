import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto, ToggleCouponDto } from './dto/coupons.dto';

@Controller('api/v1/coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  list(@Query('tenantId') tenantId: string, @Query('locationId') locationId?: string) {
    return this.couponsService.list(tenantId, locationId);
  }

  @Post('generate-code')
  generateCode() {
    return { code: this.couponsService.generateCode() };
  }

  @Post()
  create(
    @Query('tenantId') tenantId: string,
    @Body() body: CreateCouponDto,
    @Query('locationId') locationId?: string,
  ) {
    return this.couponsService.create(tenantId, body, locationId);
  }

  @Patch(':id')
  update(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateCouponDto,
  ) {
    return this.couponsService.update(tenantId, id, body);
  }

  @Post(':id/toggle')
  toggle(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: ToggleCouponDto,
  ) {
    return this.couponsService.toggle(tenantId, id, body.isActive);
  }

  @Delete(':id')
  async delete(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    await this.couponsService.delete(tenantId, id);
    return { ok: true };
  }
}
