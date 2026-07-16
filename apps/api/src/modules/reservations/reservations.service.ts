import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { and, eq, gte, gt, inArray, lt, ne, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { locations, reservations, services } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { RemindersService } from '../reminders/reminders.service';
import { StepsService } from '../steps/steps.service';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class ReservationsService {
  constructor(
    @Inject(DB) private db: Db,
    private remindersService: RemindersService,
    @Inject(forwardRef(() => StepsService)) private steps: StepsService,
  ) {}

  async findAll(tenantId: string, locationId?: string, from?: string, to?: string) {
    let resolvedLocationIds: string[];
    if (locationId) {
      const location = await this.db.query.locations.findFirst({
        where: eq(locations.id, locationId),
      });
      if (!location || location.tenantId !== tenantId) {
        throw new ForbiddenException('他テナントの店舗は操作できません');
      }
      resolvedLocationIds = [locationId];
    } else {
      const tenantLocations = await this.db.query.locations.findMany({
        where: eq(locations.tenantId, tenantId),
        columns: { id: true },
      });
      resolvedLocationIds = tenantLocations.map((l) => l.id);
      if (resolvedLocationIds.length === 0) return [];
    }

    return this.db.query.reservations.findMany({
      where: and(
        inArray(reservations.locationId, resolvedLocationIds),
        from ? gte(reservations.startsAt, new Date(from)) : undefined,
        to ? lt(reservations.startsAt, new Date(to)) : undefined,
      ),
      with: { customers: true, services: true, locations: true },
      orderBy: reservations.startsAt,
    });
  }

  async findOne(id: string, tenantId?: string) {
    const r = await this.db.query.reservations.findFirst({
      where: eq(reservations.id, id),
      with: { customers: true, services: true, locations: true },
    });
    if (!r) throw new NotFoundException(`Reservation ${id} not found`);
    if (tenantId && r.locations?.tenantId !== tenantId) {
      throw new ForbiddenException('他テナントの予約は操作できません'); // tenants/:idと同じ403流儀
    }
    return r;
  }

  async create(tenantId: string, dto: CreateReservationDto) {
    const location = await this.db.query.locations.findFirst({
      where: eq(locations.id, dto.locationId),
    });
    if (!location) throw new NotFoundException('Location not found');
    if (location.tenantId !== tenantId) {
      throw new ForbiddenException('他テナントの店舗には予約を作成できません');
    }

    const service = await this.db.query.services.findFirst({
      where: eq(services.id, dto.serviceId),
    });
    if (!service) throw new NotFoundException('Service not found');
    if (service.tenantId !== tenantId) {
      throw new ForbiddenException('他テナントのサービスは指定できません');
    }

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(startsAt.getTime() + (service.durationMin + service.bufferMin) * 60_000);

    const reservation = await this.db.transaction(async (tx) => {
      const conflict = await tx.query.reservations.findFirst({
        where: and(
          eq(reservations.locationId, dto.locationId),
          lt(reservations.startsAt, endsAt),
          gt(reservations.endsAt, startsAt),
          ne(reservations.status, 'cancelled'),
        ),
      });
      if (conflict) throw new ConflictException('この時間帯はすでに予約済みです');

      const [created] = await tx
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
      return created;
    });

    await this.remindersService.scheduleReminders(reservation);
    return reservation;
  }

  async update(id: string, tenantId: string, dto: UpdateReservationDto) {
    await this.findOne(id, tenantId);
    const [r] = await this.db
      .update(reservations)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(reservations.id, id))
      .returning();

    // Day 13: 来店完了になったら reservation-completed トリガーのステップ配信を起動
    if (dto.status === 'completed' && r.customerId) {
      const rows = await this.db.execute<{ tenant_id: string; service_id: string }>(sql`
        SELECT l.tenant_id, r.service_id FROM reservations r JOIN locations l ON l.id = r.location_id WHERE r.id = ${id} LIMIT 1
      `);
      const full = rows[0];
      if (full) {
        void this.steps.triggerByEvent(full.tenant_id, 'reservation-completed', {
          customerId: r.customerId,
          serviceId: full.service_id,
        });
      }
    }
    return r;
  }

  async cancel(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    const [r] = await this.db
      .update(reservations)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(reservations.id, id))
      .returning();
    return r;
  }
}
