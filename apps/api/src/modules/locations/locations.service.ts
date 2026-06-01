import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { count, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { locations, type NewLocation } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class LocationsService {
  constructor(@Inject(DB) private db: Db) {}

  findAll(tenantId: string) {
    return this.db.query.locations.findMany({
      where: eq(locations.tenantId, tenantId),
      orderBy: locations.name,
    });
  }

  async findOne(id: string, tenantId: string) {
    const location = await this.db.query.locations.findFirst({
      where: eq(locations.id, id),
    });
    if (!location || location.tenantId !== tenantId) {
      throw new NotFoundException(`Location ${id} not found`);
    }
    return location;
  }

  async create(tenantId: string, dto: CreateLocationDto) {
    const [location] = await this.db
      .insert(locations)
      .values({ ...dto, tenantId } satisfies NewLocation)
      .returning();
    return location;
  }

  async update(id: string, tenantId: string, dto: UpdateLocationDto) {
    await this.findOne(id, tenantId);
    const [location] = await this.db
      .update(locations)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(locations.id, id))
      .returning();
    return location;
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    // 予約が紐づく店舗を物理削除すると外部キー制約で 500 になる → 事前に件数を確認し、
    // 0 件以外は日本語で丁寧に止める (運用上は「非公開 (isActive=false)」での引退を主動線にする)
    const [{ value }] = await this.db
      .select({ value: count() })
      .from(schema.reservations)
      .where(eq(schema.reservations.locationId, id));
    if (Number(value) > 0) {
      throw new ConflictException(
        `この店舗には予約が ${value} 件あるため削除できません。先に「公開を止める」で非公開にしてください。`,
      );
    }
    await this.db.delete(locations).where(eq(locations.id, id));
  }
}
