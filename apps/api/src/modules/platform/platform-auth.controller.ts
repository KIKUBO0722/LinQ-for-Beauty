import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { PlatformAuthService } from './platform-auth.service';
import { PlatformLoginDto } from './dto/platform.dto';

// login だけ PlatformGuard の対象外が必要なため controller を分割 (08 設計判断 4 — route 単位の除外より構造で分ける)
@Controller('api/v1/platform/auth')
export class PlatformAuthController {
  constructor(private readonly auth: PlatformAuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 店側 login と同一 (auth.controller.ts:12-15)
  @Post('login')
  login(@Body() dto: PlatformLoginDto) {
    return this.auth.login(dto);
  }
}
