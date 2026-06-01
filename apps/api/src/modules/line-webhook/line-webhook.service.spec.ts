import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { LineWebhookService } from './line-webhook.service';

/**
 * 🔴3 (LINE 受信の口) の肝を守るテスト。
 *
 * 守りたい仕様:
 *  - 本体/署名が欠ければ 400、署名が不正なら 401 (なりすまし拒否)
 *  - LINE アカウント未登録なら署名検証もせず正常終了 (再送を誘発しない)
 *  - 友だち追加 → プロフィール取得して顧客を upsert (友だち中)
 *  - ブロック → 友だち解除の印 (顧客 upsert はしない)
 *  - 文字メッセージ → 顧客 upsert + 受信箱記録&自動応答へ受け渡し
 *  - スタンプ等の非テキストは自動応答しない
 *  - 1 イベントが転んでも例外を投げず残りを処理する (LINE の再送ループ防止)
 *
 * 保管庫(DB)・LINE送信・受信箱・顧客サービスは偽物に差し替え、振り分けロジックだけを検証する。
 */

const ACCOUNT = {
  id: 'acc-1',
  tenantId: 'ten-1',
  channelSecret: 'sec',
  channelAccessToken: 'tok',
};

function createMockDb(account: typeof ACCOUNT | null) {
  const limit = jest.fn().mockResolvedValue(account ? [account] : []);
  const selectWhere = jest.fn(() => ({ limit }));
  const from = jest.fn(() => ({ where: selectWhere }));
  const select = jest.fn(() => ({ from }));

  const updateWhere = jest.fn().mockResolvedValue(undefined);
  const set = jest.fn(() => ({ where: updateWhere }));
  const update = jest.fn(() => ({ set }));

  return { select, update, _set: set };
}

function rawBodyOf(events: unknown[]): Buffer {
  return Buffer.from(JSON.stringify({ destination: 'Ubot', events }));
}

describe('LineWebhookService', () => {
  let db: ReturnType<typeof createMockDb>;
  let lineService: { validateWebhookSignature: jest.Mock; getProfile: jest.Mock };
  let messagesService: { handleInboundMessage: jest.Mock };
  let customersService: { upsertByLineUser: jest.Mock };
  let service: LineWebhookService;

  function build(account: typeof ACCOUNT | null = ACCOUNT) {
    db = createMockDb(account);
    lineService = {
      validateWebhookSignature: jest.fn().mockReturnValue(true),
      getProfile: jest
        .fn()
        .mockResolvedValue({ displayName: '田中', pictureUrl: 'http://x/p.jpg', statusMessage: 'hi' }),
    };
    messagesService = {
      handleInboundMessage: jest
        .fn()
        .mockResolvedValue({ inboundId: 'in-1', reply: {}, outboundId: null }),
    };
    customersService = { upsertByLineUser: jest.fn().mockResolvedValue({ id: 'cust-1' }) };
    service = new LineWebhookService(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      db as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      lineService as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messagesService as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      customersService as any,
    );
  }

  beforeEach(() => build());

  it('本体や署名が欠ければ 400', async () => {
    await expect(service.handleCallback('ten-1', undefined, 'sig')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.handleCallback('ten-1', rawBodyOf([]), undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('LINE アカウント未登録なら、署名検証もせず正常終了する (再送を誘発しない)', async () => {
    build(null);
    await expect(service.handleCallback('ten-1', rawBodyOf([]), 'sig')).resolves.toBeUndefined();
    expect(lineService.validateWebhookSignature).not.toHaveBeenCalled();
  });

  it('署名が不正なら 401 (なりすまし拒否)', async () => {
    lineService.validateWebhookSignature.mockReturnValue(false);
    await expect(service.handleCallback('ten-1', rawBodyOf([]), 'bad')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('友だち追加 → プロフィール取得して顧客を upsert (友だち中)', async () => {
    const events = [{ type: 'follow', source: { type: 'user', userId: 'U1' }, replyToken: 'r' }];
    await service.handleCallback('ten-1', rawBodyOf(events), 'sig');
    expect(lineService.getProfile).toHaveBeenCalled();
    expect(customersService.upsertByLineUser).toHaveBeenCalledWith(
      'ten-1',
      'acc-1',
      'U1',
      expect.objectContaining({ isFollowing: true }),
    );
  });

  it('ブロック → 友だち解除の印を付ける (顧客 upsert はしない)', async () => {
    const events = [{ type: 'unfollow', source: { type: 'user', userId: 'U1' } }];
    await service.handleCallback('ten-1', rawBodyOf(events), 'sig');
    expect(db.update).toHaveBeenCalledTimes(1);
    expect(db._set).toHaveBeenCalledWith(expect.objectContaining({ isFollowing: false }));
    expect(customersService.upsertByLineUser).not.toHaveBeenCalled();
  });

  it('文字メッセージ → 顧客 upsert + 受信箱記録&自動応答へ受け渡し', async () => {
    const events = [
      { type: 'message', source: { type: 'user', userId: 'U1' }, message: { type: 'text', text: 'こんにちは' } },
    ];
    await service.handleCallback('ten-1', rawBodyOf(events), 'sig');
    expect(customersService.upsertByLineUser).toHaveBeenCalled();
    expect(messagesService.handleInboundMessage).toHaveBeenCalledWith('ten-1', 'cust-1', 'こんにちは');
  });

  it('スタンプ等の非テキストは自動応答しない', async () => {
    const events = [
      { type: 'message', source: { type: 'user', userId: 'U1' }, message: { type: 'sticker' } },
    ];
    await service.handleCallback('ten-1', rawBodyOf(events), 'sig');
    expect(messagesService.handleInboundMessage).not.toHaveBeenCalled();
  });

  it('1 イベントが転んでも例外を投げず残りを処理する', async () => {
    customersService.upsertByLineUser
      .mockRejectedValueOnce(new Error('boom')) // 1件目 (follow) で失敗
      .mockResolvedValueOnce({ id: 'cust-2' }); // 2件目 (message) は成功
    const events = [
      { type: 'follow', source: { type: 'user', userId: 'U1' }, replyToken: 'r' },
      { type: 'message', source: { type: 'user', userId: 'U2' }, message: { type: 'text', text: 'hi' } },
    ];
    await expect(service.handleCallback('ten-1', rawBodyOf(events), 'sig')).resolves.toBeUndefined();
    expect(messagesService.handleInboundMessage).toHaveBeenCalledWith('ten-1', 'cust-2', 'hi');
  });
});
