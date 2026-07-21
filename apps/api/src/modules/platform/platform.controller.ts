import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { PlatformGuard } from './platform.guard';
import { PlatformService } from './platform.service';
import { CurrentAdmin, type PlatformAdminClaims } from './current-admin.decorator';
import { CreateTenantDto, IssueUserDto } from './dto/platform.dto';

// 【不変条件】@Public() + @UseGuards(PlatformGuard) は必ずペアで付ける (08 設計判断 4)。
// @Public はグローバル AuthGuard (店側) の素通しで、防御は PlatformGuard 1 枚に集約される —
// @UseGuards だけ落ちると全 route が無認証公開になるため、ペアは platform.guard.spec.ts が機械検証する。
@Public()
@UseGuards(PlatformGuard)
@Controller('api/v1/platform')
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get('tenants')
  list() {
    return this.platform.listTenantsWithUsage();
  }

  @Post('tenants')
  create(@CurrentAdmin() admin: PlatformAdminClaims, @Body() dto: CreateTenantDto) {
    return this.platform.createTenant(admin, dto);
  }

  @Post('tenants/:id/users')
  issueUser(
    @CurrentAdmin() admin: PlatformAdminClaims,
    @Param('id', ParseUUIDPipe) id: string, // 非 uuid を 400 に正規化 (素通しだと Postgres 22P02 → 500 になる)
    @Body() dto: IssueUserDto,
  ) {
    return this.platform.issueUser(admin, id, dto);
  }
}
