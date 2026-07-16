import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AnthropicService } from './anthropic.service';
import { AiConfigsService } from './ai-configs.service';
import { AiUsageService } from './ai-usage.service';

export type GenerationPurpose = 'broadcast' | 'coupon' | 'seasonal' | 'counseling';
export type GenerationTone = 'formal' | 'friendly' | 'short';

export const PURPOSE_LABELS: Record<GenerationPurpose, string> = {
  broadcast: '一斉配信メッセージ',
  coupon: 'クーポン案内文',
  seasonal: '季節キャンペーン文',
  counseling: 'カウンセリング項目案',
};

export const TONE_LABELS: Record<GenerationTone, string> = {
  formal: '丁寧 (敬語ベース)',
  friendly: '親しみ (フレンドリー寄り)',
  short: '短文 (簡潔・絵文字控えめ)',
};

const PURPOSE_PROMPTS: Record<GenerationPurpose, string> = {
  broadcast:
    'LINE 公式アカウントの一斉配信メッセージを 100〜180 文字、本文末尾に CTA (予約 / 詳細 / 返信) 1 行で。',
  coupon:
    'クーポン案内文 (LINE 配信向け) を 80〜140 文字、特典内容 + 期限 + 利用方法を盛り込み末尾に CTA。',
  seasonal:
    '季節キャンペーンの告知文 (LINE 配信向け) を 100〜180 文字、季節感のあるイントロ + 特典 + CTA。',
  counseling:
    '美容サロンのカウンセリングシート項目案を 3〜5 個、各項目: 「項目名: 質問文 (入力例)」のフォーマットで列挙。',
};

const TONE_PROMPTS: Record<GenerationTone, string> = {
  formal: '丁寧な敬語ベース、お客様への敬意を最優先、絵文字は使わない。',
  friendly: '親しみのある自然体、敬語と話し言葉のバランス、絵文字は文末に控えめに 1〜2 個まで。',
  short: '短文で要点のみ、絵文字なし、改行最小限。',
};

/**
 * Day 10/22: AI 文章生成 (purpose × tone で 3 案)
 */
@Injectable()
export class AiGenerationService {
  private readonly logger = new Logger(AiGenerationService.name);

  constructor(
    private readonly anthropic: AnthropicService,
    private readonly configs: AiConfigsService,
    private readonly aiUsage: AiUsageService,
  ) {}

  async generate(
    tenantId: string,
    opts: { purpose: GenerationPurpose; tone: GenerationTone; extraContext?: string },
  ): Promise<{ suggestions: string[] }> {
    if (!this.anthropic.isEnabled) {
      throw new BadRequestException('AI 機能が現在無効です (API キー未設定)');
    }
    if (!PURPOSE_PROMPTS[opts.purpose]) {
      throw new BadRequestException('purpose が不正です');
    }
    if (!TONE_PROMPTS[opts.tone]) {
      throw new BadRequestException('tone が不正です');
    }

    const config = await this.configs.getOrCreate(tenantId);

    const systemPrompt = `あなたは美容サロン (美容室・ネイル・エステ・脱毛・整体など) のオーナー支援 AI です。
${PURPOSE_PROMPTS[opts.purpose]}
トーン: ${TONE_PROMPTS[opts.tone]}
出力フォーマットは厳守: 「### 案 1」「### 案 2」「### 案 3」の見出しで区切り、本文のみを書く。前置きや解説は不要。`;

    const userPrompt = `用途: ${PURPOSE_LABELS[opts.purpose]}
お店のシステムプロンプト (人格):
${config.systemPrompt ?? '(未設定)'}

${opts.extraContext ? `追加要望: ${opts.extraContext}` : ''}

このサロンに合う ${PURPOSE_LABELS[opts.purpose]} を 3 案、上記フォーマットで提示してください。`;

    await this.aiUsage.guardOrThrow(tenantId); // v0.1a: AI 日次上限 (超過は 429)
    const text = await this.anthropic.generateText(systemPrompt, userPrompt, {
      model: config.model,
      maxTokens: 1500,
      temperature: 0.8,
    });

    const sections = text.split(/###\s*案\s*\d+\s*/u).map((s) => s.trim()).filter((s) => s.length > 0);
    const suggestions = sections.length >= 3 ? sections.slice(0, 3) : [text.trim()];
    return { suggestions };
  }
}
