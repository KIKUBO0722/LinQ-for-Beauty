import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { broadcasts } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import { BroadcastsService, type BroadcastJobData } from './broadcasts.service';

type Db = NodePgDatabase<typeof schema>;

@Processor('broadcasts')
export class BroadcastsProcessor extends WorkerHost {
  private readonly logger = new Logger(BroadcastsProcessor.name);

  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly broadcastsService: BroadcastsService,
  ) {
    super();
  }

  async process(job: Job<BroadcastJobData>): Promise<void> {
    const { broadcastId, tenantId } = job.data;

    const [broadcast] = await this.db
      .select()
      .from(broadcasts)
      .where(eq(broadcasts.id, broadcastId))
      .limit(1);

    if (!broadcast) {
      this.logger.warn(`Broadcast ${broadcastId} not found, skipping`);
      return;
    }
    if (broadcast.status !== 'scheduled') {
      this.logger.warn(`Broadcast ${broadcastId} status=${broadcast.status}, skipping`);
      return;
    }

    const text = broadcast.contentPreview || '';
    await this.broadcastsService.executeBroadcast(broadcastId, tenantId, text);
    this.logger.log(`Broadcast ${broadcastId} dispatched`);
  }
}
