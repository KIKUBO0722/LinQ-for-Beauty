import { Module } from '@nestjs/common';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformController } from './platform.controller';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformService } from './platform.service';
import { AuditService } from './audit.service';
import { PlatformGuard } from './platform.guard';

// 08 運営管理パック: 運営ログイン / 店一覧+利用状況 / 店の開設 / 初期アカウント発行。
// JwtModule (global) と DatabaseModule (@Global) に依存するため imports は不要
@Module({
  controllers: [PlatformAuthController, PlatformController],
  providers: [PlatformAuthService, PlatformService, AuditService, PlatformGuard],
})
export class PlatformModule {}
