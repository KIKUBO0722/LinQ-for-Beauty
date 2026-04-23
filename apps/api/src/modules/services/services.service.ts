import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, isNull, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { services, type NewService } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class ServicesService {
  constructor(@Inject(DB) private db: Db) {}

  findAll(tenantId: string, locationId?: string) {
    return this.db.query.services.findMany({
      where: and(
        eq(services.tenantId, tenantId),
        locationId
          ? or(eq(services.locationId, locationId), isNull(services.locationId))
          : undefined,
      ),
      orderBy: services.displayOrder,
    });
  }

  async findOne(id: string, tenantId: string) {
    const service = await this.db.query.services.findFirst({
      where: eq(services.id, id),
    });
    if (!service || service.tenantId !== tenantId) {
      throw new NotFoundException(`Service ${id} not found`);
    }
    return service;
  }

  async create(tenantId: string, dto: CreateServiceDto) {
    const [service] = await this.db
      .insert(services)
      .values({ ...dto, tenantId } satisfies NewService)
      .returning();
    return service;
  }

  async update(id: string, tenantId: string, dto: UpdateServiceDto) {
    await this.findOne(id, tenantId);
    const [service] = await this.db
      .update(services)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(services.id, id))
      .returning();
    return service;
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    await this.db.delete(services).where(eq(services.id, id));
  }
}
