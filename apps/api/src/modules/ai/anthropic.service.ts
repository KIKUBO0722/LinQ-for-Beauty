import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

/**
 * Anthropic Claude を呼ぶ共通サービス。
 * Day 8 (segments) で初導入、Day 9-10 (auto-reply / knowledge) でも再利用予定。
 *
 * - ANTHROPIC_API_KEY 未設定時は failSafe(='AI 機能は現在無効です' を返す) モード
 * - 既定モデル: Claude Haiku 4.5 (軽量・低コスト)、必要に応じ呼び出し側で sonnet 上書き可
 */
@Injectable()
export class AnthropicService {
  private readonly logger = new Logger(AnthropicService.name);
  private readonly client: Anthropic | null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      this.logger.warn('ANTHROPIC_API_KEY 未設定: AI 機能は無効モードで動作');
      this.client = null;
    } else {
      this.client = new Anthropic({ apiKey });
    }
  }

  get isEnabled(): boolean {
    return this.client !== null;
  }

  async generateText(
    systemPrompt: string,
    userPrompt: string,
    opts: { model?: string; maxTokens?: number; temperature?: number } = {},
  ): Promise<string> {
    if (!this.client) {
      throw new ServiceUnavailableException('AI 機能が現在無効です (API キー未設定)');
    }
    const model = opts.model ?? 'claude-haiku-4-5-20251001';
    const maxTokens = opts.maxTokens ?? 1024;
    const temperature = opts.temperature ?? 0.7;

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      return text;
    } catch (error) {
      this.logger.error(`Anthropic API error: ${error}`);
      throw new ServiceUnavailableException('AI 応答の生成に失敗しました');
    }
  }
}
