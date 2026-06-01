import { Job } from 'bullmq';
import { RemindersProcessor } from './reminders.processor';
import type { ReminderJobData } from './reminders.service';

/**
 * 🔴2 (予約リマインダーの無言失敗) 修正の肝を守るテスト。
 *
 * 守りたい仕様:
 *  - 送信が成功したときだけ「送信済み (sentAt)」を記録する (届かないのに送信済みにしない)
 *  - 送信に失敗したら例外を投げて再試行に回す (sentAt は更新しない)
 *  - 顧客が紐づく公式アカウントの鍵を優先し、無ければ同じ店舗 (テナント) の鍵で補完する
 *  - LINE 未連携の客 / 鍵未設定の店舗には送らず、送信済みにもしない
 *
 * 保管庫 (DB) と LINE 送信は偽物に差し替え、process() のロジックだけを検証する。
 */

function createMockDb() {
  const where = jest.fn().mockResolvedValue(undefined);
  const set = jest.fn(() => ({ where }));
  const update = jest.fn(() => ({ set }));
  return {
    query: {
      customers: { findFirst: jest.fn() },
      locations: { findFirst: jest.fn() },
      lineAccounts: { findFirst: jest.fn() },
    },
    update,
  };
}

function makeJob(data: Partial<ReminderJobData> = {}): Job<ReminderJobData> {
  return {
    data: {
      reminderId: 'rem-1',
      reservationId: 'res-1',
      customerId: 'cust-1',
      guestName: null,
      guestPhone: null,
      locationId: 'loc-1',
      startsAt: new Date('2026-06-10T05:00:00.000Z').toISOString(),
      endsAt: new Date('2026-06-10T06:00:00.000Z').toISOString(),
      type: '24h',
      ...data,
    },
  } as Job<ReminderJobData>;
}

describe('RemindersProcessor', () => {
  let db: ReturnType<typeof createMockDb>;
  let lineService: { pushMessage: jest.Mock };
  let processor: RemindersProcessor;

  beforeEach(() => {
    db = createMockDb();
    lineService = { pushMessage: jest.fn().mockResolvedValue(undefined) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    processor = new RemindersProcessor(db as any, lineService as any);
    // 既定の店舗: 池袋店 (テナント ten-1)
    db.query.locations.findFirst.mockResolvedValue({ name: '池袋店', tenantId: 'ten-1' });
  });

  it('送信が成功したときだけ「送信済み」を記録する', async () => {
    db.query.customers.findFirst.mockResolvedValue({
      lineUserId: 'U-customer',
      name: '田中',
      lineAccountId: 'acc-1',
    });
    db.query.lineAccounts.findFirst.mockResolvedValue({
      id: 'acc-1',
      tenantId: 'ten-1',
      channelSecret: 'sec-1',
      channelAccessToken: 'tok-1',
    });

    await processor.process(makeJob());

    expect(lineService.pushMessage).toHaveBeenCalledTimes(1);
    expect(db.update).toHaveBeenCalledTimes(1); // sentAt を記録
  });

  it('送信に失敗したら例外を投げ、「送信済み」を記録しない', async () => {
    db.query.customers.findFirst.mockResolvedValue({
      lineUserId: 'U-customer',
      name: '田中',
      lineAccountId: 'acc-1',
    });
    db.query.lineAccounts.findFirst.mockResolvedValue({
      id: 'acc-1',
      tenantId: 'ten-1',
      channelSecret: 'sec-1',
      channelAccessToken: 'tok-1',
    });
    lineService.pushMessage.mockRejectedValue(new Error('LINE API down'));

    await expect(processor.process(makeJob())).rejects.toThrow('LINE API down');
    expect(db.update).not.toHaveBeenCalled(); // 届かないのに送信済みにしない
  });

  it('LINE 未連携の客には送らず、「送信済み」も記録しない', async () => {
    db.query.customers.findFirst.mockResolvedValue({
      lineUserId: null,
      name: '田中',
      lineAccountId: null,
    });

    await processor.process(makeJob());

    expect(lineService.pushMessage).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  it('顧客が紐づく公式アカウントの鍵を優先して送る', async () => {
    db.query.customers.findFirst.mockResolvedValue({
      lineUserId: 'U-customer',
      name: '田中',
      lineAccountId: 'acc-customer',
    });
    db.query.lineAccounts.findFirst.mockResolvedValue({
      id: 'acc-customer',
      tenantId: 'ten-1',
      channelSecret: 'sec-c',
      channelAccessToken: 'tok-c',
    });

    await processor.process(makeJob());

    // 顧客アカウント (acc-customer) で1回引いて確定 → テナント補完には回らない
    expect(db.query.lineAccounts.findFirst).toHaveBeenCalledTimes(1);
    expect(lineService.pushMessage).toHaveBeenCalledWith(
      { channelSecret: 'sec-c', channelAccessToken: 'tok-c' },
      'U-customer',
      [{ type: 'text', text: expect.any(String) }],
    );
  });

  it('顧客にアカウント紐付けが無ければ、同じ店舗の鍵で補完して送る', async () => {
    db.query.customers.findFirst.mockResolvedValue({
      lineUserId: 'U-customer',
      name: '田中',
      lineAccountId: null,
    });
    // lineAccountId が無い → テナント経由で先頭アカウントを引く
    db.query.lineAccounts.findFirst.mockResolvedValue({
      id: 'acc-tenant',
      tenantId: 'ten-1',
      channelSecret: 'sec-t',
      channelAccessToken: 'tok-t',
    });

    await processor.process(makeJob());

    expect(db.query.lineAccounts.findFirst).toHaveBeenCalledTimes(1);
    expect(lineService.pushMessage).toHaveBeenCalledWith(
      { channelSecret: 'sec-t', channelAccessToken: 'tok-t' },
      'U-customer',
      expect.anything(),
    );
  });

  it('店舗に LINE アカウントが1つも無ければ、送らず「送信済み」も記録しない', async () => {
    db.query.customers.findFirst.mockResolvedValue({
      lineUserId: 'U-customer',
      name: '田中',
      lineAccountId: null,
    });
    db.query.lineAccounts.findFirst.mockResolvedValue(undefined);

    await processor.process(makeJob());

    expect(lineService.pushMessage).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });
});
