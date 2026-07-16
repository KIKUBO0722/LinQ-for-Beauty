import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

/**
 * 【BLOCKER対処】テナント境界を跨いだ予約アクセス禁止を守るテスト。
 *
 * 守りたい仕様:
 *  - findOne/update/cancel は自テナント (locations.tenantId が一致) の予約のみ操作できる
 *  - 他テナントの予約 (locations.tenantId 不一致) は 403 (ForbiddenException)
 *  - 存在しない予約は 404 (NotFoundException)
 *
 * 他テナント JWT で他人の予約を読取・更新・削除できないことを機械的に保証するテスト。
 * DB は偽物に差し替え、tenantId 境界チェックのロジックだけを検証する。
 */

function createMockDb() {
  const returning = jest.fn();
  const where = jest.fn(() => ({ returning }));
  const set = jest.fn(() => ({ where }));
  const update = jest.fn(() => ({ set }));
  return {
    query: {
      reservations: { findFirst: jest.fn(), findMany: jest.fn() },
      locations: { findFirst: jest.fn(), findMany: jest.fn() },
      services: { findFirst: jest.fn() },
    },
    update,
    transaction: jest.fn(),
    _returning: returning,
  };
}

function makeReservation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'res-1',
    locationId: 'loc-1',
    customerId: 'cust-1',
    status: 'confirmed',
    locations: { id: 'loc-1', tenantId: 'ten-1' },
    ...overrides,
  };
}

describe('ReservationsService', () => {
  let db: ReturnType<typeof createMockDb>;
  let remindersService: { scheduleReminders: jest.Mock };
  let steps: { triggerByEvent: jest.Mock };
  let service: ReservationsService;

  beforeEach(() => {
    db = createMockDb();
    remindersService = { scheduleReminders: jest.fn().mockResolvedValue(undefined) };
    steps = { triggerByEvent: jest.fn().mockResolvedValue(undefined) };
    service = new ReservationsService(db as any, remindersService as any, steps as any);
  });

  describe('findOne', () => {
    it('自テナントの予約は取得できる', async () => {
      db.query.reservations.findFirst.mockResolvedValue(makeReservation());

      await expect(service.findOne('res-1', 'ten-1')).resolves.toEqual(makeReservation());
    });

    it('他テナントの予約は 403 (ForbiddenException)', async () => {
      db.query.reservations.findFirst.mockResolvedValue(
        makeReservation({ locations: { id: 'loc-1', tenantId: 'ten-2' } }),
      );

      await expect(service.findOne('res-1', 'ten-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('存在しない予約は 404 (NotFoundException)', async () => {
      db.query.reservations.findFirst.mockResolvedValue(undefined);

      await expect(service.findOne('res-404', 'ten-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('自テナントの予約は更新できる', async () => {
      db.query.reservations.findFirst.mockResolvedValue(makeReservation());
      db._returning.mockResolvedValue([makeReservation({ note: '更新後' })]);

      const result = await service.update('res-1', 'ten-1', { note: '更新後' } as any);

      expect(result).toEqual(makeReservation({ note: '更新後' }));
      expect(db.update).toHaveBeenCalledTimes(1);
    });

    it('他テナントの予約は更新前に 403 (ForbiddenException)', async () => {
      db.query.reservations.findFirst.mockResolvedValue(
        makeReservation({ locations: { id: 'loc-1', tenantId: 'ten-2' } }),
      );

      await expect(
        service.update('res-1', 'ten-1', { note: 'x' } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.update).not.toHaveBeenCalled();
    });

    it('存在しない予約は 404 (NotFoundException)', async () => {
      db.query.reservations.findFirst.mockResolvedValue(undefined);

      await expect(
        service.update('res-404', 'ten-1', { note: 'x' } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('自テナントの予約はキャンセルできる', async () => {
      db.query.reservations.findFirst.mockResolvedValue(makeReservation());
      db._returning.mockResolvedValue([makeReservation({ status: 'cancelled' })]);

      const result = await service.cancel('res-1', 'ten-1');

      expect(result.status).toBe('cancelled');
      expect(db.update).toHaveBeenCalledTimes(1);
    });

    it('他テナントの予約はキャンセル前に 403 (ForbiddenException)', async () => {
      db.query.reservations.findFirst.mockResolvedValue(
        makeReservation({ locations: { id: 'loc-1', tenantId: 'ten-2' } }),
      );

      await expect(service.cancel('res-1', 'ten-1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.update).not.toHaveBeenCalled();
    });

    it('存在しない予約は 404 (NotFoundException)', async () => {
      db.query.reservations.findFirst.mockResolvedValue(undefined);

      await expect(service.cancel('res-404', 'ten-1')).rejects.toBeInstanceOf(NotFoundException);
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('locationId未指定: 自テナントのlocation id一覧で絞り込まれる', async () => {
      db.query.locations.findMany.mockResolvedValue([{ id: 'loc-1' }, { id: 'loc-2' }]);
      db.query.reservations.findMany.mockResolvedValue([makeReservation()]);

      const result = await service.findAll('ten-1');

      expect(db.query.locations.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ columns: { id: true } }),
      );
      expect(db.query.reservations.findMany).toHaveBeenCalledTimes(1);
      expect(db.query.reservations.findMany.mock.calls[0][0].where).toBeDefined();
      expect(result).toEqual([makeReservation()]);
    });

    it('自テナントのlocationIdを指定 → 成功しreservationsが絞り込まれる', async () => {
      db.query.locations.findFirst.mockResolvedValue({ id: 'loc-1', tenantId: 'ten-1' });
      db.query.reservations.findMany.mockResolvedValue([makeReservation()]);

      const result = await service.findAll('ten-1', 'loc-1');

      expect(db.query.locations.findFirst).toHaveBeenCalled();
      expect(db.query.reservations.findMany).toHaveBeenCalledTimes(1);
      expect(result).toEqual([makeReservation()]);
    });

    it('他テナントのlocationIdを指定 → 403 (ForbiddenException)', async () => {
      db.query.locations.findFirst.mockResolvedValue({ id: 'loc-1', tenantId: 'ten-2' });

      await expect(service.findAll('ten-1', 'loc-1')).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.query.reservations.findMany).not.toHaveBeenCalled();
    });

    it('tenantIdに属するlocationが0件 → 空配列を返す', async () => {
      db.query.locations.findMany.mockResolvedValue([]);

      const result = await service.findAll('ten-1');

      expect(result).toEqual([]);
      expect(db.query.reservations.findMany).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    const dto = {
      locationId: 'loc-1',
      serviceId: 'svc-1',
      startsAt: '2026-07-20T10:00:00.000Z',
    } as any;

    function createMockTx(reservation: Record<string, unknown>) {
      return {
        query: { reservations: { findFirst: jest.fn().mockResolvedValue(undefined) } },
        insert: jest.fn(() => ({
          values: jest.fn(() => ({
            returning: jest.fn().mockResolvedValue([reservation]),
          })),
        })),
      };
    }

    it('自テナントのlocationId・serviceId → 成功', async () => {
      db.query.locations.findFirst.mockResolvedValue({ id: 'loc-1', tenantId: 'ten-1' });
      db.query.services.findFirst.mockResolvedValue({
        id: 'svc-1',
        tenantId: 'ten-1',
        durationMin: 60,
        bufferMin: 10,
      });
      const created = makeReservation({ id: 'res-2' });
      db.transaction.mockImplementation(async (cb: any) => cb(createMockTx(created)));

      const result = await service.create('ten-1', dto);

      expect(result).toEqual(created);
      expect(remindersService.scheduleReminders).toHaveBeenCalledWith(created);
    });

    it('他テナントのlocationId → 403 (ForbiddenException)', async () => {
      db.query.locations.findFirst.mockResolvedValue({ id: 'loc-1', tenantId: 'ten-2' });

      await expect(service.create('ten-1', dto)).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.transaction).not.toHaveBeenCalled();
    });

    it('自テナントのlocationIdだが他テナントのserviceId → 403 (ForbiddenException)', async () => {
      db.query.locations.findFirst.mockResolvedValue({ id: 'loc-1', tenantId: 'ten-1' });
      db.query.services.findFirst.mockResolvedValue({
        id: 'svc-1',
        tenantId: 'ten-2',
        durationMin: 60,
        bufferMin: 10,
      });

      await expect(service.create('ten-1', dto)).rejects.toBeInstanceOf(ForbiddenException);
      expect(db.transaction).not.toHaveBeenCalled();
    });
  });
});
