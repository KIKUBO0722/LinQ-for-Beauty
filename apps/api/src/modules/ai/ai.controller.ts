import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AiConfigsService } from './ai-configs.service';
import { AiUsageService } from './ai-usage.service';
import { AiKnowledgeService } from './ai-knowledge.service';
import { AiConversationsService } from './ai-conversations.service';
import { AiAutoReplyService } from './ai-auto-reply.service';
import { AiGenerationService } from './ai-generation.service';
import { AiAnalysisService } from './ai-analysis.service';
import { AiCopilotService, type CopilotContext } from './ai-copilot.service';
import { CreateKnowledgeDto, UpdateAiConfigDto, UpdateKnowledgeDto, GenerateDto, TestReplyDto } from './dto/ai.dto';

@Controller('api/v1/ai')
export class AiController {
  constructor(
    private readonly configs: AiConfigsService,
    private readonly usage: AiUsageService,
    private readonly knowledge: AiKnowledgeService,
    private readonly conversations: AiConversationsService,
    private readonly autoReply: AiAutoReplyService,
    private readonly generation: AiGenerationService,
    private readonly analysis: AiAnalysisService,
    private readonly copilot: AiCopilotService,
  ) {}

  // ====== AI 設定 ======
  @Get('config')
  async getConfig(@Query('tenantId') tenantId: string) {
    return this.configs.getOrCreate(tenantId);
  }

  @Patch('config')
  async updateConfig(@Query('tenantId') tenantId: string, @Body() body: UpdateAiConfigDto) {
    return this.configs.update(tenantId, body);
  }

  // v0.1a: 本日の AI 使用量 (表示用 — 消費しない)
  @Get('usage')
  async getUsage(@Query('tenantId') tenantId: string) {
    return this.usage.getToday(tenantId);
  }

  // ====== ナレッジ ======
  @Get('knowledge')
  async listKnowledge(
    @Query('tenantId') tenantId: string,
    @Query('category') category?: string,
  ) {
    return this.knowledge.list(tenantId, category);
  }

  @Post('knowledge')
  async createKnowledge(@Query('tenantId') tenantId: string, @Body() body: CreateKnowledgeDto) {
    return this.knowledge.create(tenantId, body);
  }

  @Patch('knowledge/:id')
  async updateKnowledge(
    @Query('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() body: UpdateKnowledgeDto,
  ) {
    return this.knowledge.update(tenantId, id, body);
  }

  @Delete('knowledge/:id')
  async removeKnowledge(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    await this.knowledge.remove(tenantId, id);
    return { ok: true };
  }

  // ====== 会話履歴 ======
  @Get('conversations')
  async listConversations(@Query('tenantId') tenantId: string) {
    return this.conversations.list(tenantId);
  }

  @Get('conversations/:customerId')
  async getConversation(
    @Query('tenantId') tenantId: string,
    @Param('customerId') customerId: string,
  ) {
    return this.conversations.getForCustomer(tenantId, customerId);
  }

  // ====== Day 10: 文章生成 + 応答プレビュー ======

  @Post('generate')
  async generate(@Query('tenantId') tenantId: string, @Body() body: GenerateDto) {
    return this.generation.generate(tenantId, {
      purpose: body.purpose,
      tone: body.tone,
      extraContext: body.extraContext,
    });
  }

  @Post('test-reply')
  async testReply(@Query('tenantId') tenantId: string, @Body() body: TestReplyDto) {
    return this.autoReply.replyTo(tenantId, body.customerId, body.userText);
  }

  // ====== Day 11: 顧客分析 + Copilot ======

  @Post('analyze-customer/:id')
  async analyzeCustomer(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.analysis.analyzeCustomer(tenantId, id);
  }

  @Post('copilot-suggest')
  async copilotSuggest(@Query('tenantId') tenantId: string, @Query('context') context: CopilotContext) {
    if (!['dashboard', 'inbox', 'broadcast', 'customers', 'segments'].includes(context)) {
      return { suggestions: [] };
    }
    return this.copilot.suggest(tenantId, context);
  }
}
