import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { tenants } from '@linq-beauty/db';
import { DB } from '../../database/database.module';

export type UpdateTenantDto = {
  name?: string;
  email?: string;
  ownerName?: string | null;
  ownerRole?: string | null;
  phone?: string | null;
  address?: string | null;
  lineId?: string | null;
};

@Injectable()
export class TenantsService {
  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {}

  async findOne(id: string) {
    const tenant = await this.db.query.tenants.findFirst({
      where: eq(tenants.id, id),
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }
    return tenant;
  }

  async update(id: string, dto: UpdateTenantDto) {
    await this.findOne(id);
    const [tenant] = await this.db
      .update(tenants)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return tenant;
  }
}
