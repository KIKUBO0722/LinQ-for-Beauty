import { Module } from '@nestjs/common';
import { LineModule } from '../line/line.module';
import { MessagesModule } from '../messages/messages.module';
import { CustomersModule } from '../customers/customers.module';
import { LineWebhookController } from './line-webhook.controller';
import { LineWebhookService } from './line-webhook.service';

/**
 * LINE webhook (お客さんからの受信の入口) 専用区画。
 * line / messages / customers を束ねるため独立モジュールにする
 * (line モジュール内に置くと messages ⇔ line で循環参照になるため)。
 * DB は @Global なので imports 不要。
 */
@Module({
  imports: [LineModule, MessagesModule, CustomersModule],
  controllers: [LineWebhookController],
  providers: [LineWebhookService],
})
export class LineWebhookModule {}
