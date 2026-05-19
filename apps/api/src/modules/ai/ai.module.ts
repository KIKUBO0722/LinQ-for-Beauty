import { Module } from '@nestjs/common';
import { AnthropicService } from './anthropic.service';
import { AiConfigsService } from './ai-configs.service';
import { AiKnowledgeService } from './ai-knowledge.service';
import { AiConversationsService } from './ai-conversations.service';
import { AiAutoReplyService } from './ai-auto-reply.service';
import { AiGenerationService } from './ai-generation.service';
import { AiController } from './ai.controller';

@Module({
  controllers: [AiController],
  providers: [
    AnthropicService,
    AiConfigsService,
    AiKnowledgeService,
    AiConversationsService,
    AiAutoReplyService,
    AiGenerationService,
  ],
  exports: [
    AnthropicService,
    AiConfigsService,
    AiKnowledgeService,
    AiConversationsService,
    AiAutoReplyService,
    AiGenerationService,
  ],
})
export class AiModule {}
