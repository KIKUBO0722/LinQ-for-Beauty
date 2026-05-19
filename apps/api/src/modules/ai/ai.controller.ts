import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AiConfigsService } from './ai-configs.service';
import { AiKnowledgeService } from './ai-knowledge.service';
import { AiConversationsService } from './ai-conversations.service';
import { CreateKnowledgeDto, UpdateAiConfigDto, UpdateKnowledgeDto } from './dto/ai.dto';

@Controller('api/v1/ai')
export class AiController {
  constructor(
    private readonly configs: AiConfigsService,
    private readonly knowledge: AiKnowledgeService,
    private readonly conversations: AiConversationsService,
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
}
