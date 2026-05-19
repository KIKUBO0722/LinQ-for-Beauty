import { Controller, Get, Query } from '@nestjs/common';
import { LineAccountsService } from './line-accounts.service';

@Controller('api/v1/line-accounts')
export class LineAccountsController {
  constructor(private readonly service: LineAccountsService) {}

  @Get()
  list(@Query('tenantId') tenantId: string) {
    return this.service.findByTenant(tenantId);
  }
}
