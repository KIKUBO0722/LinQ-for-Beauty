import { Inject, Injectable, Logger, NotFoundException, InternalServerErrorException, HttpException } from '@nestjs/common';
import { eq, and, desc, ilike, or, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { customers, customerTags, tags } from '@linq-beauty/db';
import { DB } from '../../database/database.module';

type Db = NodePgDatabase<typeof schema>;
type CustomerRow = typeof customers.$inferSelect;
type TagRow = typeof tags.$inferSelect;

export type CustomerWithTags = CustomerRow & { tags: TagRow[] };

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  async list(
    tenantId: string,
    opts: { locationId?: string; search?: string; limit: number; offset: number },
  ): Promise<CustomerWithTags[]> {
    try {
      const conditions = [eq(customers.tenantId, tenantId)];
      if (opts.locationId) conditions.push(eq(customers.preferredLocationId, opts.locationId));
      if (opts.search) {
        const term = `%${opts.search}%`;
        const searchCondition = or(
          ilike(customers.name, term),
          ilike(customers.displayName, term),
          ilike(customers.phone, term),
          ilike(customers.email, term),
        );
        if (searchCondition) conditions.push(searchCondition);
      }

      const rows = await this.db
        .select()
        .from(customers)
        .where(and(...conditions))
        .orderBy(desc(customers.createdAt))
        .limit(opts.limit)
        .offset(opts.offset);

      if (rows.length === 0) return [];

      // 2 query JS-merge (drizzle dual-package 型エラー回避、broadcasts.list と同パターン)
      const customerIds = rows.map((c) => c.id);
      const ctRows = await this.db
        .select()
        .from(customerTags)
        .where(inArray(customerTags.customerId, customerIds));

      const uniqueTagIds = [...new Set(ctRows.map((r) => r.tagId))];
      const tagList =
        uniqueTagIds.length === 0
          ? []
          : await this.db.select().from(tags).where(inArray(tags.id, uniqueTagIds));
      const tagById = new Map<string, TagRow>(tagList.map((t) => [t.id, t]));

      const tagMap = new Map<string, TagRow[]>();
      for (const r of ctRows) {
        const tag = tagById.get(r.tagId);
        if (!tag) continue;
        if (!tagMap.has(r.customerId)) tagMap.set(r.customerId, []);
        tagMap.get(r.customerId)!.push(tag);
      }

      return rows.map((c) => ({ ...c, tags: tagMap.get(c.id) ?? [] }));
    } catch (error) {
      this.logger.error(`Failed to list customers: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async findById(id: string, tenantId: string): Promise<CustomerWithTags | null> {
    try {
      const [customer] = await this.db
        .select()
        .from(customers)
        .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
        .limit(1);
      if (!customer) return null;

      // 2 query JS-merge (drizzle dual-package 型エラー回避)
      const ctRows = await this.db
        .select()
        .from(customerTags)
        .where(eq(customerTags.customerId, id));
      const tagIds = ctRows.map((r) => r.tagId);
      const tagList =
        tagIds.length === 0
          ? []
          : await this.db.select().from(tags).where(inArray(tags.id, tagIds));

      return { ...customer, tags: tagList };
    } catch (error) {
      this.logger.error(`Failed to find customer ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async findByIdOrThrow(id: string, tenantId: string) {
    const c = await this.findById(id, tenantId);
    if (!c) throw new NotFoundException('顧客が見つかりません');
    return c;
  }

  async update(
    id: string,
    tenantId: string,
    data: {
      name?: string;
      phone?: string;
      email?: string;
      birthday?: string | null;
      notes?: string;
      preferredLocationId?: string | null;
      score?: number;
      chatStatus?: string;
      engagementTier?: string;
      acquisitionSource?: string;
      customFields?: Record<string, unknown>;
    },
  ) {
    try {
      const values: Record<string, unknown> = { updatedAt: new Date() };
      if (data.name !== undefined) values.name = data.name;
      if (data.phone !== undefined) values.phone = data.phone;
      if (data.email !== undefined) values.email = data.email;
      if (data.birthday !== undefined) values.birthday = data.birthday;
      if (data.notes !== undefined) values.notes = data.notes;
      if (data.preferredLocationId !== undefined)
        values.preferredLocationId = data.preferredLocationId;
      if (data.score !== undefined) values.score = data.score;
      if (data.chatStatus !== undefined) values.chatStatus = data.chatStatus;
      if (data.engagementTier !== undefined) values.engagementTier = data.engagementTier;
      if (data.acquisitionSource !== undefined) values.acquisitionSource = data.acquisitionSource;
      if (data.customFields !== undefined) values.customFields = data.customFields;

      const [updated] = await this.db
        .update(customers)
        .set(values)
        .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
        .returning();
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update customer ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }
}
