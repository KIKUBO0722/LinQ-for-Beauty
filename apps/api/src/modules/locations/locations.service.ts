import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
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
    await this.db.delete(locations).where(eq(locations.id, id));
  }
}
