import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RemindersService } from './reminders.service';
import { RemindersProcessor } from './reminders.processor';
import { LineModule } from '../line/line.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'reminders' }),
    LineModule,
  ],
  providers: [RemindersService, RemindersProcessor],
  exports: [RemindersService],
})
export class RemindersModule {}
