import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { messagingApi, validateSignature } from '@line/bot-sdk';

const { MessagingApiClient } = messagingApi;

export interface LineCredentials {
  channelSecret: string;
  channelAccessToken: string;
}

export type LineMessage = messagingApi.Message;

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);
  private clients = new Map<string, InstanceType<typeof MessagingApiClient>>();
  private envClient: InstanceType<typeof MessagingApiClient> | null = null;

  constructor(private config: ConfigService) {
    const token = config.get<string>('LINE_CHANNEL_ACCESS_TOKEN');
    if (token) {
      this.envClient = new MessagingApiClient({ channelAccessToken: token });
    } else {
      this.logger.warn('LINE_CHANNEL_ACCESS_TOKEN not set — env-fallback messages will be logged only');
    }
  }

  getClient(credentials: LineCredentials): InstanceType<typeof MessagingApiClient> {
    const key = credentials.channelAccessToken.slice(0, 20);
    if (!this.clients.has(key)) {
      this.clients.set(
        key,
        new MessagingApiClient({ channelAccessToken: credentials.channelAccessToken }),
      );
    }
    return this.clients.get(key)!;
  }

  validateWebhookSignature(body: Buffer, signature: string, channelSecret: string): boolean {
    return validateSignature(body, channelSecret, signature);
  }

  async pushMessage(credentials: LineCredentials, to: string, messages: LineMessage[]) {
    const client = this.getClient(credentials);
    return client.pushMessage({ to, messages });
  }

  async replyMessage(
    credentials: LineCredentials,
    replyToken: string,
    messages: LineMessage[],
  ) {
    const client = this.getClient(credentials);
    return client.replyMessage({ replyToken, messages });
  }

  async multicast(credentials: LineCredentials, to: string[], messages: LineMessage[]) {
    const client = this.getClient(credentials);
    return client.multicast({ to, messages });
  }

  async broadcast(credentials: LineCredentials, messages: LineMessage[]) {
    const client = this.getClient(credentials);
    return client.broadcast({ messages });
  }

  async getProfile(credentials: LineCredentials, userId: string) {
    const client = this.getClient(credentials);
    return client.getProfile(userId);
  }

  async linkRichMenuToUser(credentials: LineCredentials, userId: string, richMenuId: string) {
    return this.getClient(credentials).linkRichMenuIdToUser(userId, richMenuId);
  }

  async unlinkRichMenuFromUser(credentials: LineCredentials, userId: string) {
    return this.getClient(credentials).unlinkRichMenuIdFromUser(userId);
  }

  async createRichMenuAlias(
    credentials: LineCredentials,
    richMenuAliasId: string,
    richMenuId: string,
  ) {
    const client = this.getClient(credentials) as unknown as {
      createRichMenuAlias: (body: { richMenuAliasId: string; richMenuId: string }) => Promise<unknown>;
    };
    return client.createRichMenuAlias({ richMenuAliasId, richMenuId });
  }

  async deleteRichMenuAlias(credentials: LineCredentials, richMenuAliasId: string) {
    const client = this.getClient(credentials) as unknown as {
      deleteRichMenuAlias: (id: string) => Promise<unknown>;
    };
    return client.deleteRichMenuAlias(richMenuAliasId);
  }

  async pushTextEnv(to: string, text: string): Promise<void> {
    if (!this.envClient) {
      this.logger.log(`[LINE mock] to=${to} | ${text}`);
      return;
    }
    await this.envClient.pushMessage({ to, messages: [{ type: 'text', text }] });
    this.logger.log(`LINE push (env) sent to ${to}`);
  }
}
