import { ForbiddenException, Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = (request.headers.authorization ?? '').match(/^Bearer (.+)$/)?.[1];
    if (!token) throw new UnauthorizedException('認証が必要です');
    try {
      request.user = await this.jwtService.verifyAsync(token); // {sub, tenantId, email}
    } catch {
      throw new UnauthorizedException('トークンが無効です');
    }
    const q = request.query.tenantId; // 配列で来たら string 比較に失敗 → 403 (安全側)
    if (q !== undefined && q !== request.user.tenantId) {
      throw new ForbiddenException('tenant が一致しません');
    }
    return true;
  }
}
