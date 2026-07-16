import { Controller, Post, Param, Headers, Req, HttpCode } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { LineWebhookService } from './line-webhook.service';
import { Public } from '../auth/public.decorator';

/**
 * LINE の webhook 受け口。
 * URL: POST /api/v1/line/webhook/:tenantId
 *   - LINE 公式アカウント管理画面の Webhook URL にこの住所 (店舗の識別子入り) を設定してもらう。
 *   - 署名が正しければ 200 を返す (LINE は 200 以外だと再送し続けるため、処理の成否に関わらず 200)。
 *   - 署名が不正なら 401 (LineWebhookService が UnauthorizedException を投げる)。
 */
@Controller('api/v1/line/webhook')
export class LineWebhookController {
  constructor(private readonly webhook: LineWebhookService) {}

  @Public()
  @Post(':tenantId')
  @HttpCode(200)
  async receive(
    @Param('tenantId') tenantId: string,
    @Headers('x-line-signature') signature: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ ok: boolean }> {
    await this.webhook.handleCallback(tenantId, req.rawBody, signature);
    return { ok: true };
  }
}
