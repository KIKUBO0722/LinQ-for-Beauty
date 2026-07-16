import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

/**
 * AuthService の肝を守るテスト。
 *
 * 守りたい仕様:
 *  - 正しい資格情報でログインすると accessToken とユーザー情報を返す
 *  - ユーザー不存在と誤パスワードは同一メッセージの 401 (アカウント存在の有無を漏らさない)
 *  - me() は passwordHash を含まない安全な形で返す
 *
 * DB と JWT 発行は偽物に差し替え、bcryptjs は実物を低コスト(4)で使い実際の比較挙動を検証する。
 */

function createMockDb() {
  return {
    query: {
      users: { findFirst: jest.fn() },
      tenants: { findFirst: jest.fn() },
    },
  };
}

describe('AuthService', () => {
  let db: ReturnType<typeof createMockDb>;
  let jwtService: { signAsync: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    db = createMockDb();
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed.jwt.token') };
    service = new AuthService(db as any, jwtService as any);
  });

  it('正しい資格情報で accessToken を返す', async () => {
    const passwordHash = bcrypt.hashSync('password123', 4);
    db.query.users.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      passwordHash,
      tenantId: 'ten-1',
    });
    db.query.tenants.findFirst.mockResolvedValue({ id: 'ten-1', name: '池袋店' });

    const result = await service.login({ email: 'a@example.com', password: 'password123' });

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.tokenType).toBe('Bearer');
    expect(result.user).toEqual({
      id: 'u1',
      email: 'a@example.com',
      tenantId: 'ten-1',
      tenantName: '池袋店',
    });
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: 'u1',
      tenantId: 'ten-1',
      email: 'a@example.com',
    });
  });

  it('ユーザー不存在と誤パスワードは同一メッセージの 401', async () => {
    db.query.users.findFirst.mockResolvedValueOnce(undefined);
    const notFound = service.login({ email: 'nobody@example.com', password: 'password123' });
    await expect(notFound).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(notFound.catch((e) => e.message)).resolves.toBe(
      'メールアドレスまたはパスワードが違います',
    );

    const passwordHash = bcrypt.hashSync('correct-password', 4);
    db.query.users.findFirst.mockResolvedValueOnce({
      id: 'u1',
      email: 'a@example.com',
      passwordHash,
      tenantId: 'ten-1',
    });
    const wrongPassword = service.login({ email: 'a@example.com', password: 'wrong-password' });
    await expect(wrongPassword).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(wrongPassword.catch((e) => e.message)).resolves.toBe(
      'メールアドレスまたはパスワードが違います',
    );
  });

  it('me() は passwordHash を含まない形で返す', async () => {
    db.query.users.findFirst.mockResolvedValue({
      id: 'u1',
      email: 'a@example.com',
      passwordHash: 'hashed-value-should-not-leak',
      tenantId: 'ten-1',
    });
    db.query.tenants.findFirst.mockResolvedValue({ id: 'ten-1', name: '池袋店' });

    const result = await service.me('u1');

    expect(result).toEqual({
      id: 'u1',
      email: 'a@example.com',
      tenantId: 'ten-1',
      tenantName: '池袋店',
    });
  });
});
