import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { TenantsService, type UpdateTenantDto } from './tenants.service';

@Controller('api/v1/tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tenants.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTenantDto) {
    return this.tenants.update(id, dto);
  }
}
