import { createHmac } from 'crypto';
import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import ical from 'ical-generator';
import { and, eq, isNull, or, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import {
  icsTokens,
  reservations,
  personalBlocks,
  type NewIcsToken,
} from '@linq-beauty/db';
import { DB } from '../../database/database.module';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class IcsService {
  constructor(
    @Inject(DB) private db: Db,
    private config: ConfigService,
  ) {}

  async issueToken(tenantId: string, locationId?: string) {
    const secret = this.config.get<string>('ICS_SECRET');
    if (!secret) {
      throw new InternalServerErrorException('ICS_SECRET is not configured');
    }
    const token = createHmac('sha256', secret)
      .update(`${tenantId}:${locationId ?? 'all'}:${Date.now()}`)
      .digest('hex');
    const [record] = await this.db
      .insert(icsTokens)
      .values({ tenantId, locationId: locationId ?? null, token } satisfies NewIcsToken)
      .returning();
    return record;
  }

  async generateFeed(token: string): Promise<string> {
    const record = await this.db.query.icsTokens.findFirst({
      where: eq(icsTokens.token, token),
    });
    if (!record) throw new NotFoundException('Invalid ICS token');

    const reservationFilters: (SQL | undefined)[] = [eq(reservations.status, 'confirmed')];
    if (record.locationId) {
      reservationFilters.push(eq(reservations.locationId, record.locationId));
    }

    const resList = await this.db.query.reservations.findMany({
      where: and(...reservationFilters),
      with: {
        services: true,
        customers: true,
        locations: true,
      },
    });

    const blockFilters: (SQL | undefined)[] = [eq(personalBlocks.tenantId, record.tenantId)];
    if (record.locationId) {
      blockFilters.push(
        or(isNull(personalBlocks.locationId), eq(personalBlocks.locationId, record.locationId)),
      );
    }

    const blockList = await this.db.query.personalBlocks.findMany({
      where: and(...blockFilters),
    });

    const cal = ical({ name: 'LinQ for Beauty スケジュール', timezone: 'Asia/Tokyo' });

    for (const r of resList) {
      const displayName = r.customers?.name ?? r.guestName ?? 'ゲスト';
      const serviceName = r.services?.name ?? '';
      const locationName = r.locations?.name ?? '';
      cal.createEvent({
        id: `reservation-${r.id}`,
        start: r.startsAt,
        end: r.endsAt,
        summary: `[予約] ${displayName} - ${serviceName}`.trim(),
        description: locationName ? `拠点: ${locationName}` : undefined,
      });
    }

    for (const b of blockList) {
      cal.createEvent({
        id: `block-${b.id}`,
        start: b.startsAt,
        end: b.endsAt,
        summary: `[個人] ${b.title}`,
      });
    }

    return cal.toString();
  }
}
