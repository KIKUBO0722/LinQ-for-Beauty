import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PlatformAuthService } from './platform-auth.service';

/**
 * PlatformAuthService.login の肝を守るテスト。
 *
 * 守りたい仕様 (08 設計判断 2-3):
 *  - 成功: 12h 指定で signAsync が呼ばれ (tenantId は payload に入れない)、
 *    lastLoginAt 更新 + audit 'platform.login' が同一 tx で記録される
 *  - 不存在 / パスワード不一致は同一文面の 401 + audit 'platform.login_failed' が記録される
 *  - 監査 detail にパスワード平文・ハッシュが含まれない
 *
 * bcryptjs は実物 (cost 4 でハッシュ生成 — auth.service.spec.ts と同流儀)。
 */

const PASSWORD = 'correct-password-123';

function createMockDb() {
  const updReturning = jest.fn().mockResolvedValue(undefined);
  const where = jest.fn(() => updReturning());
  const set = jest.fn(() => ({ where }));
  const update = jest.fn(() => ({ set }));
  const tx = { update, insert: jest.fn() };
  return {
    query: {
      platformAdmins: { findFirst: jest.fn() },
    },
    transaction: jest.fn(async (cb: (t: unknown) => Promise<unknown>) => cb(tx)),
    _tx: tx,
    _set: set,
  };
}

describe('PlatformAuthService', () => {
  let db: ReturnType<typeof createMockDb>;
  let jwtService: { signAsync: jest.Mock };
  let audit: { record: jest.Mock };
  let service: PlatformAuthService;
  let admin: { id: string; email: string; passwordHash: string };

  beforeEach(async () => {
    db = createMockDb();
    jwtService = { signAsync: jest.fn().mockResolvedValue('signed.platform.jwt') };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new PlatformAuthService(db as any, jwtService as any, audit as any);
    admin = {
      id: 'admin-1',
      email: 'platform@example.com',
      passwordHash: await bcrypt.hash(PASSWORD, 4),
    };
  });

  it('正しい資格情報で accessToken を返す (12h・role のみで tenantId 無しの payload)', async () => {
    db.query.platformAdmins.findFirst.mockResolvedValue(admin);

    const result = await service.login({ email: admin.email, password: PASSWORD });

    expect(jwtService.signAsync).toHaveBeenCalledWith(
      { sub: 'admin-1', role: 'platform', email: admin.email },
      { expiresIn: '12h' },
    );
    // payload に tenantId が同居していない (同居禁止の規律)
    expect(jwtService.signAsync.mock.calls[0][0]).not.toHaveProperty('tenantId');
    expect(result).toEqual({
      accessToken: 'signed.platform.jwt',
      tokenType: 'Bearer',
      expiresInSec: 43200,
      admin: { id: 'admin-1', email: admin.email },
    });
  });

  it('成功時は同一 tx で lastLoginAt 更新 + audit platform.login が記録される', async () => {
    db.query.platformAdmins.findFirst.mockResolvedValue(admin);

    await service.login({ email: admin.email, password: PASSWORD });

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(db._tx.update).toHaveBeenCalledTimes(1); // lastLoginAt 更新
    expect(db._set).toHaveBeenCalledWith(expect.objectContaining({ lastLoginAt: expect.any(Date) }));
    expect(audit.record).toHaveBeenCalledWith(
      db._tx, // db 直でなく tx が渡っている (fail-closed の担保)
      expect.objectContaining({ actorId: 'admin-1', action: 'platform.login' }),
    );
  });

  it('ユーザー不存在は 401 + audit platform.login_failed (actorId null) を記録する', async () => {
    db.query.platformAdmins.findFirst.mockResolvedValue(undefined);

    await expect(service.login({ email: 'nobody@example.com', password: PASSWORD })).rejects.toThrow(
      new UnauthorizedException('メールアドレスまたはパスワードが違います'),
    );
    expect(audit.record).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ actorId: null, action: 'platform.login_failed' }),
    );
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('パスワード不一致は同一文面の 401 + login_failed (actorId = admin.id) を記録する', async () => {
    db.query.platformAdmins.findFirst.mockResolvedValue(admin);

    await expect(service.login({ email: admin.email, password: 'wrong-password-999' })).rejects.toThrow(
      new UnauthorizedException('メールアドレスまたはパスワードが違います'), // 不存在と同一文面 (存在有無を漏らさない)
    );
    expect(audit.record).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ actorId: 'admin-1', action: 'platform.login_failed' }),
    );
  });

  it('監査 detail にパスワード平文・ハッシュが含まれない', async () => {
    db.query.platformAdmins.findFirst.mockResolvedValue(admin);
    const wrongPassword = 'wrong-password-999';

    await service.login({ email: admin.email, password: PASSWORD });
    await expect(service.login({ email: admin.email, password: wrongPassword })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    for (const call of audit.record.mock.calls) {
      const serialized = JSON.stringify(call[1]);
      expect(serialized).not.toContain(PASSWORD);
      expect(serialized).not.toContain(wrongPassword);
      expect(serialized).not.toContain(admin.passwordHash);
    }
  });
});
