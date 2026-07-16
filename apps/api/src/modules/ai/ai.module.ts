import { Module } from '@nestjs/common';
import { AnthropicService } from './anthropic.service';
import { AiConfigsService } from './ai-configs.service';
import { AiUsageService } from './ai-usage.service';
import { AiKnowledgeService } from './ai-knowledge.service';
import { AiConversationsService } from './ai-conversations.service';
import { AiAutoReplyService } from './ai-auto-reply.service';
import { AiGenerationService } from './ai-generation.service';
import { AiAnalysisService } from './ai-analysis.service';
import { AiCopilotService } from './ai-copilot.service';
import { AiController } from './ai.controller';

@Module({
  controllers: [AiController],
  providers: [
    AnthropicService,
    AiConfigsService,
    AiUsageService,
    AiKnowledgeService,
    AiConversationsService,
    AiAutoReplyService,
    AiGenerationService,
    AiAnalysisService,
    AiCopilotService,
  ],
  exports: [
    AnthropicService,
    AiConfigsService,
    AiUsageService,
    AiKnowledgeService,
    AiConversationsService,
    AiAutoReplyService,
    AiGenerationService,
    AiAnalysisService,
    AiCopilotService,
  ],
})
export class AiModule {}
