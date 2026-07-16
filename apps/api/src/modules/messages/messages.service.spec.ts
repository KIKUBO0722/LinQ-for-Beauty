import { MessagesService } from './messages.service';

/**
 * v0.1a: 自動応答の無料化 (reply 優先 + push fallback) の肝を守るテスト。
 *
 * 守りたい仕様 (sendMessageToCustomer の送信部):
 *  - replyToken があれば replyMessage (無料経路) を使い、push は呼ばない。sendType='reply' で記録
 *  - replyMessage が失敗 (失効/二重使用) したら pushMessage に切替えて必ず届ける。sendType='push'
 *  - replyToken が無ければ従来どおり pushMessage。sendType='push'
 *  - reply も push も失敗したら status='failed' で記録 (DB insert は続行 — 既存挙動の維持)
 *  - handleInboundMessage は受け取った opts (replyToken) を自動応答の送信へそのまま伝搬する
 *
 * 保管庫(DB)・LINE送信・AI応答は偽物に差し替え、送信経路の分岐だけを検証する。
 */

const CUSTOMER = {
  id: 'cust-1',
  tenantId: 'ten-1',
  lineUserId: 'U1',
  lineAccountId: 'acc-1',
  preferredLocationId: 'loc-1',
};

const ACCOUNT = {
  id: 'acc-1',
  tenantId: 'ten-1',
  channelSecret: 'sec',
  channelAccessToken: 'tok',
};

function createMockDb() {
  const limit = jest.fn();
  const where = jest.fn(() => ({ limit }));
  const from = jest.fn(() => ({ where }));
  const select = jest.fn(() => ({ from }));

  const returning = jest.fn().mockResolvedValue([{ id: 'msg-1' }]);
  const values = jest.fn(() => ({ returning }));
  const insert = jest.fn(() => ({ values }));

  const updateWhere = jest.fn().mockResolvedValue(undefined);
  const set = jest.fn(() => ({ where: updateWhere }));
  const update = jest.fn(() => ({ set }));

  return { select, insert, update, _limit: limit, _values: values };
}

describe('MessagesService', () => {
  let db: ReturnType<typeof createMockDb>;
  let lineService: { replyMessage: jest.Mock; pushMessage: jest.Mock };
  let aiAutoReply: { replyTo: jest.Mock };
  let service: MessagesService;

  beforeEach(() => {
    db = createMockDb();
    // select は customer → LINE アカウント の順に呼ばれる
    db._limit.mockResolvedValueOnce([CUSTOMER]).mockResolvedValueOnce([ACCOUNT]);
    lineService = {
      replyMessage: jest.fn().mockResolvedValue(undefined),
      pushMessage: jest.fn().mockResolvedValue(undefined),
    };
    aiAutoReply = { replyTo: jest.fn() };
    service = new MessagesService(db as any, lineService as any, aiAutoReply as any);
  });

  describe('sendMessageToCustomer (reply 優先 + push fallback)', () => {
    it('replyToken あり → replyMessage を使い push は呼ばない。sendType=reply で記録', async () => {
      await service.sendMessageToCustomer('ten-1', 'cust-1', { type: 'text', text: 'こんにちは' }, {
        replyToken: 'rt-1',
      });

      expect(lineService.replyMessage).toHaveBeenCalledWith(
        expect.objectContaining({ channelAccessToken: 'tok' }),
        'rt-1',
        [expect.objectContaining({ type: 'text' })],
      );
      expect(lineService.pushMessage).not.toHaveBeenCalled();
      expect(db._values).toHaveBeenCalledWith(
        expect.objectContaining({ sendType: 'reply', status: 'sent' }),
      );
    });

    it('replyMessage 失敗 → pushMessage に切替えて届ける。sendType=push・status=sent', async () => {
      lineService.replyMessage.mockRejectedValue(new Error('Invalid reply token'));

      await service.sendMessageToCustomer('ten-1', 'cust-1', { type: 'text', text: 'こんにちは' }, {
        replyToken: 'rt-expired',
      });

      expect(lineService.pushMessage).toHaveBeenCalledWith(
        expect.objectContaining({ channelAccessToken: 'tok' }),
        'U1',
        [expect.objectContaining({ type: 'text' })],
      );
      expect(db._values).toHaveBeenCalledWith(
        expect.objectContaining({ sendType: 'push', status: 'sent' }),
      );
    });

    it('replyToken なし → 従来どおり pushMessage。sendType=push', async () => {
      await service.sendMessageToCustomer('ten-1', 'cust-1', { type: 'text', text: 'こんにちは' });

      expect(lineService.replyMessage).not.toHaveBeenCalled();
      expect(lineService.pushMessage).toHaveBeenCalledTimes(1);
      expect(db._values).toHaveBeenCalledWith(
        expect.objectContaining({ sendType: 'push', status: 'sent' }),
      );
    });

    it('reply も push も失敗 → status=failed で記録 (insert は続行)', async () => {
      lineService.replyMessage.mockRejectedValue(new Error('expired'));
      lineService.pushMessage.mockRejectedValue(new Error('rate limited'));

      await service.sendMessageToCustomer('ten-1', 'cust-1', { type: 'text', text: 'x' }, {
        replyToken: 'rt-1',
      });

      expect(db._values).toHaveBeenCalledWith(
        expect.objectContaining({ sendType: 'push', status: 'failed' }),
      );
    });
  });

  describe('handleInboundMessage (opts の伝搬)', () => {
    it('受け取った replyToken を自動応答の送信へそのまま渡す', async () => {
      // inbound insert → AI 応答 → sendMessageToCustomer (spy) の流れ
      aiAutoReply.replyTo.mockResolvedValue({ responseText: '応答です', source: 'ai', needsHandoff: false });
      const spy = jest
        .spyOn(service, 'sendMessageToCustomer')
        .mockResolvedValue({ id: 'out-1' } as never);

      await service.handleInboundMessage('ten-1', 'cust-1', '空いてますか', { replyToken: 'rt-9' });

      expect(spy).toHaveBeenCalledWith(
        'ten-1',
        'cust-1',
        { type: 'text', text: '応答です' },
        { replyToken: 'rt-9' },
      );
    });
  });
});
