import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { aiKnowledge, customers } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import { AnthropicService } from './anthropic.service';
import { AiConfigsService } from './ai-configs.service';
import { AiConversationsService } from './ai-conversations.service';
import { AiUsageService } from './ai-usage.service';

type Db = NodePgDatabase<typeof schema>;

export type AutoReplyResult = {
  responseText: string;
  source: 'handoff' | 'keyword' | 'ai' | 'disabled';
  // 引き継ぎ判定時に true (= スタッフが対応すべき) として chatStatus 更新を促す
  needsHandoff: boolean;
};

/**
 * Day 10/22: お客様メッセージへの自動応答 core 関数。
 * 3 段判定: 引き継ぎキーワード → keywordRules → Anthropic
 *
 * Day 18 で LINE webhook controller から messages.service.handleInboundMessage 経由で呼ばれる予定。
 * 管理画面の「応答プレビュー」(POST /api/v1/ai/test-reply) からも直接呼ぶ。
 */
@Injectable()
export class AiAutoReplyService {
  private readonly logger = new Logger(AiAutoReplyService.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly anthropic: AnthropicService,
    private readonly configs: AiConfigsService,
    private readonly conversations: AiConversationsService,
    private readonly usage: AiUsageService,
  ) {}

  async replyTo(tenantId: string, customerId: string, userText: string): Promise<AutoReplyResult> {
    const config = await this.configs.getOrCreate(tenantId);

    if (!config.autoReplyEnabled) {
      return { responseText: '', source: 'disabled', needsHandoff: false };
    }

    // (1) 引き継ぎキーワード判定
    const handoffMatch = (config.handoffKeywords ?? []).find((k) => k && userText.includes(k));
    if (handoffMatch) {
      const text = `お問い合わせありがとうございます。担当スタッフから折り返しご連絡いたします。少々お待ちください。`;
      // 会話履歴に記録 (transparency 用)
      await this.conversations.appendMessage(tenantId, customerId, { role: 'user', content: userText });
      await this.conversations.appendMessage(tenantId, customerId, { role: 'assistant', content: text });
      return { responseText: text, source: 'handoff', needsHandoff: true };
    }

    // (2) keywordRules 判定
    const ruleMatch = (config.keywordRules ?? []).find((r) => this.matchRule(r, userText));
    if (ruleMatch) {
      await this.conversations.appendMessage(tenantId, customerId, { role: 'user', content: userText });
      await this.conversations.appendMessage(tenantId, customerId, { role: 'assistant', content: ruleMatch.response });
      return { responseText: ruleMatch.response, source: 'keyword', needsHandoff: false };
    }

    // (3) Anthropic で生成
    if (!this.anthropic.isEnabled) {
      const fallback = `お問い合わせありがとうございます。担当スタッフから折り返しご連絡いたします。`;
      return { responseText: fallback, source: 'handoff', needsHandoff: true };
    }

    // v0.1a: AI 日次上限 — 超過時は Anthropic を呼ばず引き継ぎ文面 (客への沈黙は営業事故なので必ず何か返す)。
    // keyword/handoff 応答 (上の (1)(2)) はカウント消費しない位置関係。
    const quota = await this.usage.tryConsume(tenantId);
    if (!quota.allowed) {
      const text = `お問い合わせありがとうございます。担当スタッフから折り返しご連絡いたします。少々お待ちください。`;
      await this.conversations.appendMessage(tenantId, customerId, { role: 'user', content: userText });
      await this.conversations.appendMessage(tenantId, customerId, { role: 'assistant', content: text });
      return { responseText: text, source: 'handoff', needsHandoff: true };
    }

    // ナレッジを system prompt に統合
    const knowledgeRows = await this.db
      .select({ category: aiKnowledge.category, title: aiKnowledge.title, content: aiKnowledge.content })
      .from(aiKnowledge)
      .where(eq(aiKnowledge.tenantId, tenantId));
    const activeKnowledge = knowledgeRows.length > 0
      ? '\n\n--- お店の基本情報 ---\n' +
        knowledgeRows.map((k) => `[${k.category}] ${k.title}\n${k.content}`).join('\n\n')
      : '';

    // 直近の会話履歴 (最大 10 件) を user prompt に添付
    const conv = await this.conversations.getForCustomer(tenantId, customerId);
    const customerInfo = await this.getCustomerContext(tenantId, customerId);

    let historyContext = '';
    if (conv && conv.messages.length > 0) {
      const recent = conv.messages.slice(-10);
      historyContext = '\n\n--- 直近の会話履歴 ---\n' +
        recent.map((m) => `${m.role === 'user' ? 'お客様' : 'AI'}: ${m.content}`).join('\n');
    }

    const systemPrompt = (config.systemPrompt ?? '') + activeKnowledge;
    const userPrompt = `${customerInfo}${historyContext}\n\n--- 今回のメッセージ ---\nお客様: ${userText}\n\nこのメッセージに、上記の指示・基本情報・履歴を踏まえて応答してください。`;

    const temperature = (config.temperature ?? 7) / 10;

    try {
      const responseText = await this.anthropic.generateText(systemPrompt, userPrompt, {
        model: config.model,
        maxTokens: config.maxTokens,
        temperature,
      });

      // 履歴に追記
      await this.conversations.appendMessage(tenantId, customerId, { role: 'user', content: userText });
      await this.conversations.appendMessage(tenantId, customerId, { role: 'assistant', content: responseText });

      return { responseText, source: 'ai', needsHandoff: false };
    } catch (error) {
      this.logger.error(`AI 応答生成失敗: ${error}`);
      const fallback = `申し訳ございません、ただいま AI 応答が利用できません。スタッフから折り返しご連絡いたします。`;
      return { responseText: fallback, source: 'handoff', needsHandoff: true };
    }
  }

  private matchRule(
    rule: { keyword: string; response: string; matchType?: 'contains' | 'exact' | 'startsWith' },
    text: string,
  ): boolean {
    const type = rule.matchType ?? 'contains';
    if (type === 'exact') return text === rule.keyword;
    if (type === 'startsWith') return text.startsWith(rule.keyword);
    return text.includes(rule.keyword);
  }

  private async getCustomerContext(tenantId: string, customerId: string): Promise<string> {
    const [c] = await this.db
      .select({ name: customers.name, displayName: customers.displayName })
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);
    if (!c) return '';
    const name = c.displayName ?? c.name ?? 'お客様';
    return `--- お客様情報 ---\nお名前: ${name} 様`;
  }
}
