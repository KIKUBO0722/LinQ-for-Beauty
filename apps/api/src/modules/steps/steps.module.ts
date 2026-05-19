import { Module, forwardRef } from '@nestjs/common';
import { StepsController } from './steps.controller';
import { StepsService } from './steps.service';
import { StepsScheduler } from './steps.scheduler';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [forwardRef(() => MessagesModule)],
  controllers: [StepsController],
  providers: [StepsService, StepsScheduler],
  exports: [StepsService],
})
export class StepsModule {}
