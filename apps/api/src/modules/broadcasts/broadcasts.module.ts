import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BroadcastsController } from './broadcasts.controller';
import { BroadcastsService } from './broadcasts.service';
import { BroadcastsProcessor } from './broadcasts.processor';
import { LineModule } from '../line/line.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'broadcasts' }), LineModule],
  controllers: [BroadcastsController],
  providers: [BroadcastsService, BroadcastsProcessor],
  exports: [BroadcastsService],
})
export class BroadcastsModule {}
