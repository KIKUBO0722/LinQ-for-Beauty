import { Module } from '@nestjs/common';
import { RichMenusController } from './rich-menus.controller';
import { RichMenusService } from './rich-menus.service';
import { LineModule } from '../line/line.module';

@Module({
  imports: [LineModule],
  controllers: [RichMenusController],
  providers: [RichMenusService],
  exports: [RichMenusService],
})
export class RichMenusModule {}
