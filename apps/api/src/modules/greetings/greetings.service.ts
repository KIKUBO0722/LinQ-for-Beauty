import { Inject, Injectable } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { greetingMessages } from '@linq-beauty/db';
import { DB } from '../../database/database.module';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class GreetingsService {
  constructor(@Inject(DB) private readonly db: Db) {}

  async list(tenantId: string, locationId?: string) {
    return this.db
      .select()
      .from(greetingMessages)
      .where(
        and(
          eq(greetingMessages.tenantId, tenantId),
          locationId ? eq(greetingMessages.locationId, locationId) : undefined,
        ),
      )
      .orderBy(desc(greetingMessages.createdAt));
  }

  async getByType(tenantId: string, type: string, locationId?: string) {
    const [greeting] = await this.db
      .select()
      .from(greetingMessages)
      .where(
        and(
          eq(greetingMessages.tenantId, tenantId),
          eq(greetingMessages.type, type),
          eq(greetingMessages.isActive, true),
          locationId ? eq(greetingMessages.locationId, locationId) : undefined,
        ),
      )
      .orderBy(desc(greetingMessages.createdAt))
      .limit(1);
    return greeting ?? null;
  }

  async create(
    tenantId: string,
    data: {
      type: string;
      name: string;
      messages: Record<string, unknown>[];
      isActive?: boolean;
    },
    locationId?: string,
  ) {
    const [greeting] = await this.db
      .insert(greetingMessages)
      .values({
        tenantId,
        locationId: locationId ?? null,
        type: data.type,
        name: data.name,
        messages: data.messages,
        isActive: data.isActive ?? true,
      })
      .returning();
    return greeting;
  }

  async update(
    id: string,
    tenantId: string,
    data: {
      name?: string;
      messages?: Record<string, unknown>[];
      isActive?: boolean;
    },
  ) {
    const values: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) values.name = data.name;
    if (data.messages !== undefined) values.messages = data.messages;
    if (data.isActive !== undefined) values.isActive = data.isActive;

    const [updated] = await this.db
      .update(greetingMessages)
      .set(values)
      .where(
        and(
          eq(greetingMessages.id, id),
          eq(greetingMessages.tenantId, tenantId),
        ),
      )
      .returning();
    return updated;
  }

  async delete(id: string, tenantId: string) {
    await this.db
      .delete(greetingMessages)
      .where(
        and(
          eq(greetingMessages.id, id),
          eq(greetingMessages.tenantId, tenantId),
        ),
      );
  }
}
