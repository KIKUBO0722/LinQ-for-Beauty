import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, gte, isNull, lt, ne, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { locations, personalBlocks, reservations, services, type NewPersonalBlock } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import { CreateBlockDto } from './dto/create-block.dto';
import { generateAvailableSlots } from './slot-generator';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class CalendarService {
  constructor(@Inject(DB) private db: Db) {}

  // ── Slots ─────────────────────────────────────────────────────────────

  async getSlots(tenantId: string, locationId: string, serviceId: string, dateStr: string) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) throw new NotFoundException('Invalid date');

    const location = await this.db.query.locations.findFirst({
      where: and(eq(locations.id, locationId), eq(locations.tenantId, tenantId)),
    });
    if (!location) throw new NotFoundException('Location not found');

    const service = await this.db.query.services.findFirst({
      where: and(eq(services.id, serviceId), eq(services.tenantId, tenantId)),
    });
    if (!service) throw new NotFoundException('Service not found');

    const slotMin = service.durationMin + service.bufferMin;
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);

    const [existingReservations, blocks] = await Promise.all([
      this.db.query.reservations.findMany({
        where: and(
          eq(reservations.locationId, locationId),
          gte(reservations.startsAt, dayStart),
          lt(reservations.startsAt, dayEnd),
          ne(reservations.status, 'cancelled'),
        ),
      }),
      this.db.query.personalBlocks.findMany({
        where: and(
          eq(personalBlocks.tenantId, tenantId),
          or(isNull(personalBlocks.locationId), eq(personalBlocks.locationId, locationId)),
          gte(personalBlocks.startsAt, dayStart),
          lt(personalBlocks.startsAt, dayEnd),
        ),
      }),
    ]);

    const allBlocks = [...existingReservations, ...blocks].map((b) => ({
      startsAt: new Date(b.startsAt),
      endsAt: new Date(b.endsAt),
    }));

    return generateAvailableSlots(date, slotMin, location.businessHours, allBlocks);
  }

  // ── Personal Blocks ───────────────────────────────────────────────────

  getBlocks(tenantId: string, locationId?: string) {
    return this.db.query.personalBlocks.findMany({
      where: and(
        eq(personalBlocks.tenantId, tenantId),
        locationId ? eq(personalBlocks.locationId, locationId) : undefined,
      ),
      orderBy: personalBlocks.startsAt,
    });
  }

  async createBlock(tenantId: string, dto: CreateBlockDto) {
    const [block] = await this.db
      .insert(personalBlocks)
      .values({
        tenantId,
        locationId: dto.locationId ?? null,
        title: dto.title,
        startsAt: new Date(dto.startsAt),
        endsAt: new Date(dto.endsAt),
      } satisfies NewPersonalBlock)
      .returning();
    return block;
  }

  async removeBlock(id: string, tenantId: string) {
    const block = await this.db.query.personalBlocks.findFirst({
      where: eq(personalBlocks.id, id),
    });
    if (!block || block.tenantId !== tenantId) throw new NotFoundException('Block not found');
    await this.db.delete(personalBlocks).where(eq(personalBlocks.id, id));
  }
}
