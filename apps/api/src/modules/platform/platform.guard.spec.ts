import 'reflect-metadata';
import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { PlatformGuard } from './platform.guard';
import { PlatformController } from './platform.controller';
import { IS_PUBLIC_KEY } from '../auth/public.decorator';

/**
 * PlatformGuard の肝を守るテスト。
 *
 * 守りたい仕様 (08 設計判断 3-4):
 *  - Bearer が無い / 検証に失敗したトークンは 401
 *  - role claim が無い店 JWT・role 不一致は 403 (店 → 運営の遮断)
 *  - role:'platform' でも tenantId が同居していれば 403 (同居禁止の規律の機械強制)
 *  - 正当な運営 JWT は通し、request.platformAdmin にペイロードをセットする
 *  - PlatformController に @Public() と @UseGuards(PlatformGuard) が両方付いている
 *    (ペアの片方 @UseGuards だけ落ちると全 route が無認証公開になる fail-open を機械固定)
 */

function makeContext(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('PlatformGuard', () => {
  let jwtService: { verifyAsync: jest.Mock };
  let guard: PlatformGuard;

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    guard = new PlatformGuard(jwtService as any);
  });

  it('Authorization ヘッダーが無ければ 401', async () => {
    const context = makeContext({ headers: {} });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('トークンが不正なら 401', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));
    const context = makeContext({ headers: { authorization: 'Bearer bad-token' } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('role claim の無い店 JWT は 403 (店 → 運営の遮断)', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', tenantId: 'ten-1', email: 'a@example.com' });
    const context = makeContext({ headers: { authorization: 'Bearer store-token' } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("role が 'platform' 以外なら 403 (将来の impersonation も通さない)", async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', role: 'impersonation', email: 'a@example.com' });
    const context = makeContext({ headers: { authorization: 'Bearer other-token' } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("role:'platform' でも tenantId が同居していれば 403 (同居禁止の規律)", async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'admin-1',
      role: 'platform',
      tenantId: 'ten-1',
      email: 'p@example.com',
    });
    const context = makeContext({ headers: { authorization: 'Bearer mixed-token' } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('正当な運営 JWT は通り、request.platformAdmin にペイロードがセットされる', async () => {
    const payload = { sub: 'admin-1', role: 'platform', email: 'p@example.com' };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const request = { headers: { authorization: 'Bearer platform-token' } } as Record<string, unknown>;

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(request.platformAdmin).toEqual(payload);
  });

  it('PlatformController に @Public() + @UseGuards(PlatformGuard) がペアで付いている (fail-open 防止)', () => {
    // @Public() — グローバル AuthGuard の素通し (これが無いと store 用 Guard が誤適用される)
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, PlatformController)).toBe(true);
    // @UseGuards(PlatformGuard) — これが落ちると全 platform API が無認証公開になる
    const guards: unknown[] = Reflect.getMetadata('__guards__', PlatformController) ?? [];
    expect(guards).toContain(PlatformGuard);
  });
});
