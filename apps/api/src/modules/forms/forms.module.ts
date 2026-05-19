import { Module, forwardRef } from '@nestjs/common';
import { FormsController } from './forms.controller';
import { FormsService } from './forms.service';
import { StepsModule } from '../steps/steps.module';

@Module({
  imports: [forwardRef(() => StepsModule)],
  controllers: [FormsController],
  providers: [FormsService],
})
export class FormsModule {}
