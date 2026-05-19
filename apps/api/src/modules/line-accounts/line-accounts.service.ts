import { Injectable, Inject } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { lineAccounts } from '@linq-beauty/db';
import { DB } from '../../database/database.module';

@Injectable()
export class LineAccountsService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  async findByTenant(tenantId: string) {
    return this.db
      .select({
        id: lineAccounts.id,
        tenantId: lineAccounts.tenantId,
        channelId: lineAccounts.channelId,
      })
      .from(lineAccounts)
      .where(eq(lineAccounts.tenantId, tenantId));
  }
}
