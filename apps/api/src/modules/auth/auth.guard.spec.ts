import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

/**
 * AuthGuard の肝を守るテスト。
 *
 * 守りたい仕様:
 *  - @Public が付いたハンドラは認証なしで通す
 *  - Authorization ヘッダーが無い / Bearer 形式でないリクエストは 401
 *  - トークンの検証に失敗したら 401
 *  - query.tenantId が JWT の tenantId と一致しなければ 403 (テナント境界違反を安全側で拒否)
 *  - 一致すれば通し、request.user に JWT ペイロードをセットする
 *
 * Reflector と JwtService は偽物に差し替え、判定ロジックだけを検証する。
 */

function makeContext(request: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('AuthGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let jwtService: { verifyAsync: jest.Mock };
  let guard: AuthGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    jwtService = { verifyAsync: jest.fn() };
    guard = new AuthGuard(reflector as any, jwtService as any);
  });

  it('@Public なハンドラは認証なしで素通しする', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = makeContext({ headers: {}, query: {} });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('Authorization ヘッダーが無ければ 401', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const context = makeContext({ headers: {}, query: {} });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('トークンが不正なら 401', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));
    const context = makeContext({ headers: { authorization: 'Bearer bad-token' }, query: {} });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('tenantId claim の無いトークン (運営用) は query 無しでも 403 (08 逆流防止)', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockResolvedValue({ sub: 'admin-1', role: 'platform', email: 'p@example.com' });
    const context = makeContext({ headers: { authorization: 'Bearer platform-token' }, query: {} });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('query.tenantId が JWT の tenantId と不一致なら 403', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockResolvedValue({ sub: 'u1', tenantId: 'ten-1', email: 'a@example.com' });
    const context = makeContext({
      headers: { authorization: 'Bearer good-token' },
      query: { tenantId: 'ten-2' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('tenantId が一致すれば通り、request.user に JWT ペイロードがセットされる', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const payload = { sub: 'u1', tenantId: 'ten-1', email: 'a@example.com' };
    jwtService.verifyAsync.mockResolvedValue(payload);
    const request = {
      headers: { authorization: 'Bearer good-token' },
      query: { tenantId: 'ten-1' },
    } as Record<string, unknown>;

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(request.user).toEqual(payload);
  });
});
