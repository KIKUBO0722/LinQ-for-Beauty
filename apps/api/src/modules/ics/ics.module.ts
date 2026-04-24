import { Module } from '@nestjs/common';
import { IcsController } from './ics.controller';
import { IcsService } from './ics.service';

@Module({
  controllers: [IcsController],
  providers: [IcsService],
})
export class IcsModule {}
