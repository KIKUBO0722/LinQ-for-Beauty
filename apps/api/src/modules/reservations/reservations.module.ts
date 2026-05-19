import { Module, forwardRef } from '@nestjs/common';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { RemindersModule } from '../reminders/reminders.module';
import { StepsModule } from '../steps/steps.module';

@Module({
  imports: [RemindersModule, forwardRef(() => StepsModule)],
  controllers: [ReservationsController],
  providers: [ReservationsService],
  exports: [ReservationsService],
})
export class ReservationsModule {}
