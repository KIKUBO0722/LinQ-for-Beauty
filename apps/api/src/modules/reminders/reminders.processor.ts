import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { customers, locations, reservationReminders } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import { LineService } from '../line/line.service';
import type { ReminderJobData } from './reminders.service';

type Db = NodePgDatabase<typeof schema>;

@Processor('reminders')
export class RemindersProcessor extends WorkerHost {
  private readonly logger = new Logger(RemindersProcessor.name);

  constructor(
    @Inject(DB) private db: Db,
    private lineService: LineService,
  ) {
    super();
  }

  async process(job: Job<ReminderJobData>): Promise<void> {
    const { reminderId, reservationId, customerId, guestName, locationId, startsAt, endsAt, type } = job.data;

    let lineUserId: string | null = null;
    let displayName: string | null = guestName;
    if (customerId) {
      const customer = await this.db.query.customers.findFirst({
        where: eq(customers.id, customerId),
      });
      lineUserId = customer?.lineUserId ?? null;
      displayName = customer?.name ?? guestName;
    }

    const location = await this.db.query.locations.findFirst({
      where: eq(locations.id, locationId),
    });
    const locationName = location?.name ?? 'サロン';

    const label = type === '24h' ? '24時間' : '1時間';
    const startsJst = new Date(startsAt).toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    const endsJst = new Date(endsAt).toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
    });

    const text =
      `【LinQ for Beauty】${displayName ?? 'お客様'}、ご予約の${label}前です。\n` +
      `予約日時: ${startsJst}〜${endsJst}\n` +
      `${locationName}へのご来店をお待ちしております。`;

    if (lineUserId) {
      await this.lineService.pushMessage(lineUserId, text);
      this.logger.log(`Reminder [${type}] sent to ${lineUserId} for reservation ${reservationId}`);
    } else {
      this.logger.warn(`No LINE userId for reservation ${reservationId} — reminder not sent`);
      this.logger.log(`[no-LINE] ${text}`);
    }

    await this.db
      .update(reservationReminders)
      .set({ sentAt: new Date() })
      .where(eq(reservationReminders.id, reminderId));
  }
}
