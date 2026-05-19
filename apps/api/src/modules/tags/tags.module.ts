import { Module, forwardRef } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { StepsModule } from '../steps/steps.module';

@Module({
  imports: [forwardRef(() => StepsModule)],
  controllers: [TagsController],
  providers: [TagsService],
  exports: [TagsService],
})
export class TagsModule {}
