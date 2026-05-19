import { Module } from '@nestjs/common';
import { SegmentsController } from './segments.controller';
import { SegmentsService } from './segments.service';
import { LineModule } from '../line/line.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [LineModule, AiModule],
  controllers: [SegmentsController],
  providers: [SegmentsService],
  exports: [SegmentsService],
})
export class SegmentsModule {}
