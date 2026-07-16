import { Body, Controller, ForbiddenException, Get, Param, Patch } from '@nestjs/common';
import { TenantsService, type UpdateTenantDto } from './tenants.service';
import { CurrentUser, type AuthUser } from '../auth/current-user.decorator';

@Controller('api/v1/tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (user.tenantId !== id) {
      throw new ForbiddenException('tenant が一致しません');
    }
    return this.tenants.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto, @CurrentUser() user: AuthUser) {
    if (user.tenantId !== id) {
      throw new ForbiddenException('tenant が一致しません');
    }
    return this.tenants.update(id, dto);
  }
}
