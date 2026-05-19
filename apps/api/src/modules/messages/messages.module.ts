import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { LineModule } from '../line/line.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [LineModule, AiModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
