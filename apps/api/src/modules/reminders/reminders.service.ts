import { Injectable, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { reservationReminders } from '@linq-beauty/db';
import type { Reservation } from '@linq-beauty/db';
import { DB } from '../../database/database.module';

type Db = NodePgDatabase<typeof schema>;

export interface ReminderJobData {
  reminderId: string;
  reservationId: string;
  customerId: string | null;
  guestName: string | null;
  guestPhone: string | null;
  locationId: string;
  startsAt: string;
  endsAt: string;
  type: '24h' | '1h';
}

@Injectable()
export class RemindersService {
  constructor(
    @InjectQueue('reminders') private queue: Queue,
    @Inject(DB) private db: Db,
  ) {}

  async scheduleReminders(reservation: Reservation): Promise<void> {
    const startsAt = new Date(reservation.startsAt);
    const now = Date.now();

    const configs: Array<{ type: '24h' | '1h'; offsetMs: number }> = [
      { type: '24h', offsetMs: 24 * 60 * 60 * 1000 },
      { type: '1h', offsetMs: 60 * 60 * 1000 },
    ];

    for (const { type, offsetMs } of configs) {
      const scheduledAt = new Date(startsAt.getTime() - offsetMs);
      const delay = scheduledAt.getTime() - now;
      if (delay <= 0) continue;

      const [reminder] = await this.db
        .insert(reservationReminders)
        .values({ reservationId: reservation.id, scheduledAt, type })
        .returning();

      const jobData: ReminderJobData = {
        reminderId: reminder.id,
        reservationId: reservation.id,
        customerId: reservation.customerId ?? null,
        guestName: reservation.guestName ?? null,
        guestPhone: reservation.guestPhone ?? null,
        locationId: reservation.locationId,
        startsAt: reservation.startsAt.toISOString(),
        endsAt: reservation.endsAt.toISOString(),
        type,
      };

      await this.queue.add('send-reminder', jobData, {
        delay,
        removeOnComplete: true,
        removeOnFail: false,
      });
    }
  }
}
