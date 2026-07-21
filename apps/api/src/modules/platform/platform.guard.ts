import { ForbiddenException, Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * 運営 (platform) API 専用の門番。対象 controller は class レベルで
 * @Public() (グローバル AuthGuard の素通し) + @UseGuards(PlatformGuard) を必ずペアで付ける。
 * 片方だけは禁止 — @UseGuards が落ちると全 platform API が無認証公開になる fail-open 構造のため、
 * ペアの維持は platform.guard.spec.ts のメタデータ検証が機械固定する (08 設計判断 4)。
 */
@Injectable()
export class PlatformGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {} // JwtModule は global 登録済み (auth.module.ts)

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = (request.headers.authorization ?? '').match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new UnauthorizedException('認証が必要です');
    let payload: { sub: string; role?: string; tenantId?: string; email: string };
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('トークンが無効です');
    }
    // 店 JWT は role claim を持たない → ここで自然に 403 (店 → 運営の遮断)。
    // tenantId 同居も拒否 — 「role:'platform' と tenantId は同居禁止」(08 設計判断 3) を Guard で機械強制する
    // (AuthGuard 側の「tenantId 欠落 403」と対称の締め付け。将来の 'impersonation' token もここは通さない)。
    if (payload.role !== 'platform' || payload.tenantId !== undefined) {
      throw new ForbiddenException('運営者権限が必要です');
    }
    request.platformAdmin = payload;
    return true;
  }
}
