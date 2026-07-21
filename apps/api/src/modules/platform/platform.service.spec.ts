import { ConflictException, NotFoundException } from '@nestjs/common';
import { PlatformService, generatePassword } from './platform.service';
import type { PlatformAdminClaims } from './current-admin.decorator';

/**
 * PlatformService の肝を守るテスト。
 *
 * 守りたい仕様 (08 設計判断 6-8):
 *  - createTenant: tx 内で tenants insert + audit 'tenant.create'。email 重複は事前チェックと 23505 の二段で 409
 *  - issueUser: 平文 12 文字を応答 1 回きり・DB はハッシュのみ。同一テナント既存は再発行 (reset_password)、
 *    別テナント既存は 409、tenant 不存在は 404、update returning 空は 404、23505 は 409 (二段防御の対称)
 *  - 監査 detail にパスワード類が含まれない
 *  - listTenantsWithUsage: 集計行の無いテナント (開設直後) は stats 全 0 + lastMessageAt null
 */

const ADMIN: PlatformAdminClaims = { sub: 'admin-1', role: 'platform', email: 'platform@example.com' };

function createMockTx(returningRows: unknown[]) {
  const insReturning = jest.fn().mockResolvedValue(returningRows);
  const values = jest.fn(() => ({ returning: insReturning }));
  const insert = jest.fn(() => ({ values }));
  const updReturning = jest.fn().mockResolvedValue(returningRows);
  const where = jest.fn(() => ({ returning: updReturning }));
  const set = jest.fn(() => ({ where }));
  const update = jest.fn(() => ({ set }));
  return { insert, update, _values: values, _set: set, _insReturning: insReturning, _updReturning: updReturning };
}

function createMockDb() {
  return {
    query: {
      tenants: { findFirst: jest.fn(), findMany: jest.fn() },
      users: { findFirst: jest.fn() },
    },
    transaction: jest.fn(),
    execute: jest.fn(),
  };
}

describe('PlatformService', () => {
  let db: ReturnType<typeof createMockDb>;
  let audit: { record: jest.Mock };
  let service: PlatformService;

  beforeEach(() => {
    db = createMockDb();
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new PlatformService(db as any, audit as any);
  });

  describe('createTenant', () => {
    const DTO = { name: '新しい店', email: 'new@example.com' };
    const CREATED = { id: 'ten-new', name: '新しい店', email: 'new@example.com' };

    it('tx 内で tenants insert + audit tenant.create を記録して開設する', async () => {
      db.query.tenants.findFirst.mockResolvedValue(undefined);
      const tx = createMockTx([CREATED]);
      db.transaction.mockImplementation(async (cb: (t: unknown) => Promise<unknown>) => cb(tx));

      const result = await service.createTenant(ADMIN, DTO as any);

      expect(result).toEqual(CREATED);
      expect(tx.insert).toHaveBeenCalledTimes(1);
      expect(audit.record).toHaveBeenCalledWith(
        tx, // tx 同梱 (「開設されたのに記録が無い」の構造的排除)
        expect.objectContaining({
          actorId: 'admin-1',
          action: 'tenant.create',
          targetTenantId: 'ten-new',
          detail: { name: '新しい店', email: 'new@example.com' },
        }),
      );
    });

    it('email が既存 (事前チェック) なら 409', async () => {
      db.query.tenants.findFirst.mockResolvedValue({ id: 'ten-1', email: DTO.email });

      await expect(service.createTenant(ADMIN, DTO as any)).rejects.toBeInstanceOf(ConflictException);
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('事前チェックをすり抜けた 23505 も 409 に変換する (二段防御)', async () => {
      db.query.tenants.findFirst.mockResolvedValue(undefined);
      db.transaction.mockRejectedValue(Object.assign(new Error('duplicate key'), { code: '23505' }));

      await expect(service.createTenant(ADMIN, DTO as any)).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('issueUser', () => {
    const TENANT = { id: 'ten-1', name: '店A', email: 'a@example.com' };
    const ISSUED_USER = { id: 'user-1', tenantId: 'ten-1', email: 'owner@example.com' };

    it('新規発行: 平文 12 文字を返し、DB にはハッシュのみ保存、audit user.issue を記録する', async () => {
      db.query.tenants.findFirst.mockResolvedValue(TENANT);
      db.query.users.findFirst.mockResolvedValue(undefined);
      const tx = createMockTx([ISSUED_USER]);
      db.transaction.mockImplementation(async (cb: (t: unknown) => Promise<unknown>) => cb(tx));

      const result = await service.issueUser(ADMIN, 'ten-1', { email: 'owner@example.com' } as any);

      expect(result.password).toHaveLength(12);
      expect(result.reissued).toBe(false);
      expect(result.userId).toBe('user-1');
      const inserted = tx._values.mock.calls[0][0] as Record<string, unknown>;
      expect(inserted.passwordHash).toEqual(expect.any(String));
      expect(inserted.passwordHash).not.toBe(result.password); // 平文を保存していない
      expect(inserted).not.toHaveProperty('password');
      expect(audit.record).toHaveBeenCalledWith(
        tx,
        expect.objectContaining({ action: 'user.issue', targetTenantId: 'ten-1', detail: { email: 'owner@example.com' } }),
      );
    });

    it('同一テナントの既存 email は update で再発行し audit user.reset_password を記録する', async () => {
      db.query.tenants.findFirst.mockResolvedValue(TENANT);
      db.query.users.findFirst.mockResolvedValue(ISSUED_USER);
      const tx = createMockTx([ISSUED_USER]);
      db.transaction.mockImplementation(async (cb: (t: unknown) => Promise<unknown>) => cb(tx));

      const result = await service.issueUser(ADMIN, 'ten-1', { email: 'owner@example.com' } as any);

      expect(result.reissued).toBe(true);
      expect(tx.update).toHaveBeenCalledTimes(1);
      expect(tx.insert).not.toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(tx, expect.objectContaining({ action: 'user.reset_password' }));
    });

    it('別テナントで使われている email は 409', async () => {
      db.query.tenants.findFirst.mockResolvedValue(TENANT);
      db.query.users.findFirst.mockResolvedValue({ ...ISSUED_USER, tenantId: 'ten-other' });

      await expect(service.issueUser(ADMIN, 'ten-1', { email: 'owner@example.com' } as any)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('tenant が存在しなければ 404', async () => {
      db.query.tenants.findFirst.mockResolvedValue(undefined);

      await expect(service.issueUser(ADMIN, 'ten-none', { email: 'owner@example.com' } as any)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('事前チェックをすり抜けた 23505 も 409 に変換する (createTenant と対称の二段防御)', async () => {
      db.query.tenants.findFirst.mockResolvedValue(TENANT);
      db.query.users.findFirst.mockResolvedValue(undefined);
      db.transaction.mockRejectedValue(Object.assign(new Error('duplicate key'), { code: '23505' }));

      await expect(service.issueUser(ADMIN, 'ten-1', { email: 'owner@example.com' } as any)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('再発行の update returning が空 (チェック後消滅) なら 404 (500 にしない)', async () => {
      db.query.tenants.findFirst.mockResolvedValue(TENANT);
      db.query.users.findFirst.mockResolvedValue(ISSUED_USER);
      const tx = createMockTx([]); // returning 空
      db.transaction.mockImplementation(async (cb: (t: unknown) => Promise<unknown>) => cb(tx));

      await expect(service.issueUser(ADMIN, 'ten-1', { email: 'owner@example.com' } as any)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('監査 detail に平文パスワード・ハッシュが含まれない', async () => {
      db.query.tenants.findFirst.mockResolvedValue(TENANT);
      db.query.users.findFirst.mockResolvedValue(undefined);
      const tx = createMockTx([ISSUED_USER]);
      db.transaction.mockImplementation(async (cb: (t: unknown) => Promise<unknown>) => cb(tx));

      const result = await service.issueUser(ADMIN, 'ten-1', { email: 'owner@example.com' } as any);

      const inserted = tx._values.mock.calls[0][0] as Record<string, unknown>;
      for (const call of audit.record.mock.calls) {
        const serialized = JSON.stringify(call[1]);
        expect(serialized).not.toContain(result.password);
        expect(serialized).not.toContain(String(inserted.passwordHash));
      }
    });
  });

  describe('listTenantsWithUsage', () => {
    it('集計行の無いテナント (開設直後) は stats 全 0 + lastMessageAt null で返る', async () => {
      const createdAt = new Date('2026-07-21T00:00:00+09:00');
      db.query.tenants.findMany.mockResolvedValue([
        { id: 'ten-new', name: '新しい店', email: 'new@example.com', ownerName: null, createdAt },
      ]);
      db.execute.mockResolvedValue([]); // 全集計 0 行

      const result = await service.listTenantsWithUsage();

      expect(result).toEqual([
        {
          id: 'ten-new',
          name: '新しい店',
          email: 'new@example.com',
          ownerName: null,
          createdAt,
          stats: {
            locations: 0,
            customers: 0,
            users: 0,
            reservationsTotal: 0,
            reservationsThisMonth: 0,
            aiThisMonth: 0,
            lastMessageAt: null,
          },
        },
      ]);
    });
  });

  describe('generatePassword', () => {
    it('12 文字で、紛らわしい文字 (0/O/1/l/I/B/8/S/5・記号) を含まない', () => {
      for (let i = 0; i < 50; i++) {
        const p = generatePassword();
        expect(p).toHaveLength(12);
        expect(p).toMatch(/^[abcdefghjkmnpqrstuvwxyzACDEFGHJKMNPQRTUVWXYZ234679]{12}$/);
      }
    });
  });
});
