import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, gte, gt, lt, ne } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { reservations, services } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class ReservationsService {
  constructor(@Inject(DB) private db: Db) {}

  findAll(tenantId: string, locationId?: string, from?: string, to?: string) {
    return this.db.query.reservations.findMany({
      where: and(
        locationId ? eq(reservations.locationId, locationId) : undefined,
        from ? gte(reservations.startsAt, new Date(from)) : undefined,
        to ? lt(reservations.startsAt, new Date(to)) : undefined,
      ),
      with: { customers: true, services: true, locations: true },
      orderBy: reservations.startsAt,
    });
  }

  async findOne(id: string) {
    const r = await this.db.query.reservations.findFirst({
      where: eq(reservations.id, id),
      with: { customers: true, services: true, locations: true },
    });
    if (!r) throw new NotFoundException(`Reservation ${id} not found`);
    return r;
  }

  async create(tenantId: string, dto: CreateReservationDto) {
    const service = await this.db.query.services.findFirst({
      where: eq(services.id, dto.serviceId),
    });
    if (!service) throw new NotFoundException('Service not found');

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(startsAt.getTime() + (service.durationMin + service.bufferMin) * 60_000);

    return this.db.transaction(async (tx) => {
      const conflict = await tx.query.reservations.findFirst({
        where: and(
          eq(reservations.locationId, dto.locationId),
          lt(reservations.startsAt, endsAt),
          gt(reservations.endsAt, startsAt),
          ne(reservations.status, 'cancelled'),
        ),
      });
      if (conflict) throw new ConflictException('この時間帯はすでに予約済みです');

      const [reservation] = await tx
        .insert(reservations)
        .values({
          locationId: dto.locationId,
          serviceId: dto.serviceId,
          customerId: dto.customerId ?? null,
          guestName: dto.guestName ?? null,
          guestPhone: dto.guestPhone ?? null,
          startsAt,
          endsAt,
          note: dto.note ?? null,
          status: 'confirmed',
        })
        .returning();
      return reservation;
    });
  }

  async update(id: string, dto: UpdateReservationDto) {
    await this.findOne(id);
    const [r] = await this.db
      .update(reservations)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(reservations.id, id))
      .returning();
    return r;
  }

  async cancel(id: string) {
    await this.findOne(id);
    const [r] = await this.db
      .update(reservations)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(reservations.id, id))
      .returning();
    return r;
  }
}
