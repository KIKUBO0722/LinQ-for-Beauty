import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { messagingApi } from '@line/bot-sdk';

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);
  private client: messagingApi.MessagingApiClient | null = null;

  constructor(private config: ConfigService) {
    const token = config.get<string>('LINE_CHANNEL_ACCESS_TOKEN');
    if (token) {
      this.client = new messagingApi.MessagingApiClient({ channelAccessToken: token });
    } else {
      this.logger.warn('LINE_CHANNEL_ACCESS_TOKEN not set — LINE messages will be logged only');
    }
  }

  async pushMessage(to: string, text: string): Promise<void> {
    if (!this.client) {
      this.logger.log(`[LINE mock] to=${to} | ${text}`);
      return;
    }
    await this.client.pushMessage({ to, messages: [{ type: 'text', text }] });
    this.logger.log(`LINE push sent to ${to}`);
  }
}
