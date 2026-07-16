import { HttpException } from '@nestjs/common';
import { AiUsageService, localYmd } from './ai-usage.service';

/**
 * v0.1a: AI 日次上限の肝を守るテスト。
 *
 * 守りたい仕様:
 *  - tryConsume はアトミック UPSERT の返す count と config.dailyLimit の比較で allowed を判定する
 *  - count == limit は allowed (境界は「超えたら」拒否)、count > limit は not allowed
 *  - 超過後もカウントは進む (UPSERT は常に +1 — 需要の記録)
 *  - guardOrThrow は超過時に 429 の HttpException を投げる
 *  - getToday は参照のみ (UPSERT しない)、行が無ければ count 0
 *  - localYmd はローカル日付を返す (toISOString の UTC 日付ズレを持ち込まない)
 */

function createMockDb() {
  const insertReturning = jest.fn();
  const onConflictDoUpdate = jest.fn(() => ({ returning: insertReturning }));
  const values = jest.fn(() => ({ onConflictDoUpdate }));
  const insert = jest.fn(() => ({ values }));

  const selectLimit = jest.fn();
  const where = jest.fn(() => ({ limit: selectLimit }));
  const from = jest.fn(() => ({ where }));
  const select = jest.fn(() => ({ from }));

  return { insert, select, _insertReturning: insertReturning, _values: values, _selectLimit: selectLimit };
}

describe('AiUsageService', () => {
  let db: ReturnType<typeof createMockDb>;
  let configs: { getOrCreate: jest.Mock };
  let service: AiUsageService;

  beforeEach(() => {
    db = createMockDb();
    configs = { getOrCreate: jest.fn().mockResolvedValue({ dailyLimit: 200 }) };
    service = new AiUsageService(db as any, configs as any);
  });

  describe('tryConsume', () => {
    it('上限内 (count < limit) は allowed', async () => {
      db._insertReturning.mockResolvedValue([{ count: 1 }]);

      await expect(service.tryConsume('ten-1')).resolves.toEqual({ allowed: true, count: 1, limit: 200 });
    });

    it('ちょうど上限 (count == limit) はまだ allowed', async () => {
      db._insertReturning.mockResolvedValue([{ count: 200 }]);

      await expect(service.tryConsume('ten-1')).resolves.toEqual({ allowed: true, count: 200, limit: 200 });
    });

    it('超過 (count > limit) は not allowed — カウント自体は進んでいる (需要の記録)', async () => {
      db._insertReturning.mockResolvedValue([{ count: 201 }]);

      await expect(service.tryConsume('ten-1')).resolves.toEqual({ allowed: false, count: 201, limit: 200 });
      expect(db.insert).toHaveBeenCalledTimes(1); // 超過判定でも UPSERT (+1) は実行済み
    });

    it('UPSERT の usage_date は localYmd (ローカル日付) で生成される', async () => {
      db._insertReturning.mockResolvedValue([{ count: 1 }]);

      await service.tryConsume('ten-1');

      expect(db._values).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'ten-1', usageDate: localYmd(), count: 1 }),
      );
    });
  });

  describe('guardOrThrow', () => {
    it('上限内なら何も投げない (消費は 1 回)', async () => {
      db._insertReturning.mockResolvedValue([{ count: 5 }]);

      await expect(service.guardOrThrow('ten-1')).resolves.toBeUndefined();
      expect(db.insert).toHaveBeenCalledTimes(1);
    });

    it('超過なら 429 (HttpException)', async () => {
      db._insertReturning.mockResolvedValue([{ count: 201 }]);

      const err = await service.guardOrThrow('ten-1').catch((e) => e);
      expect(err).toBeInstanceOf(HttpException);
      expect((err as HttpException).getStatus()).toBe(429);
      expect(String((err as HttpException).getResponse())).toContain('上限');
    });
  });

  describe('getToday', () => {
    it('行があれば count を返し、UPSERT はしない', async () => {
      db._selectLimit.mockResolvedValue([{ count: 42 }]);

      await expect(service.getToday('ten-1')).resolves.toEqual({
        date: localYmd(),
        count: 42,
        dailyLimit: 200,
      });
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('行が無ければ count 0', async () => {
      db._selectLimit.mockResolvedValue([]);

      await expect(service.getToday('ten-1')).resolves.toEqual({
        date: localYmd(),
        count: 0,
        dailyLimit: 200,
      });
    });
  });

  describe('localYmd (日付境界)', () => {
    it('ローカル日付成分で YYYY-MM-DD を生成する (1 桁月日は 0 埋め)', () => {
      expect(localYmd(new Date(2026, 0, 5, 12, 0, 0))).toBe('2026-01-05');
    });

    it('ローカル深夜 0:30 でも当日扱い (UTC 変換で前日に戻る toISOString と違う)', () => {
      // ローカル成分で組んだ 2026-07-16 00:30 は、TZ が UTC+9 なら toISOString だと '2026-07-15' になる
      const localMidnight = new Date(2026, 6, 16, 0, 30, 0);
      expect(localYmd(localMidnight)).toBe('2026-07-16');
    });
  });
});
