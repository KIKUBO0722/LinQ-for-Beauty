import { Module } from '@nestjs/common';
import { LineAccountsController } from './line-accounts.controller';
import { LineAccountsService } from './line-accounts.service';

@Module({
  controllers: [LineAccountsController],
  providers: [LineAccountsService],
})
export class LineAccountsModule {}
