import { Inject, Injectable, Logger, NotFoundException, InternalServerErrorException, HttpException } from '@nestjs/common';
import { eq, and, asc, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { tags, customerTags } from '@linq-beauty/db';
import { DB } from '../../database/database.module';

type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class TagsService {
  private readonly logger = new Logger(TagsService.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  async list(tenantId: string, category?: string) {
    try {
      return await this.db
        .select()
        .from(tags)
        .where(
          and(eq(tags.tenantId, tenantId), category ? eq(tags.category, category) : undefined),
        )
        .orderBy(asc(tags.category), asc(tags.name));
    } catch (error) {
      this.logger.error(`Failed to list tags: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async create(tenantId: string, data: { name: string; color?: string; category?: string }) {
    try {
      const [tag] = await this.db.insert(tags).values({ tenantId, ...data }).returning();
      return tag;
    } catch (error) {
      this.logger.error(`Failed to create tag: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async verifyOwnership(tagId: string, tenantId: string) {
    const [tag] = await this.db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.tenantId, tenantId)))
      .limit(1);
    if (!tag) throw new NotFoundException('タグが見つかりません');
    return tag;
  }

  async update(id: string, data: { name?: string; color?: string; category?: string }, tenantId: string) {
    try {
      await this.verifyOwnership(id, tenantId);
      await this.db.update(tags).set(data).where(and(eq(tags.id, id), eq(tags.tenantId, tenantId)));
    } catch (error) {
      this.logger.error(`Failed to update tag ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async delete(id: string, tenantId: string) {
    try {
      await this.verifyOwnership(id, tenantId);
      // customer_tags は cascade で自動削除されるが、明示的に削除も可能
      await this.db.delete(tags).where(and(eq(tags.id, id), eq(tags.tenantId, tenantId)));
    } catch (error) {
      this.logger.error(`Failed to delete tag ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async assignToCustomer(customerId: string, tagId: string) {
    try {
      await this.db.insert(customerTags).values({ customerId, tagId }).onConflictDoNothing();
    } catch (error) {
      this.logger.error(`Failed to assign tag ${tagId} to customer ${customerId}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async removeFromCustomer(customerId: string, tagId: string) {
    try {
      await this.db
        .delete(customerTags)
        .where(and(eq(customerTags.customerId, customerId), eq(customerTags.tagId, tagId)));
    } catch (error) {
      this.logger.error(`Failed to remove tag ${tagId} from customer ${customerId}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async listForCustomer(customerId: string) {
    try {
      // 2 query JS-merge (drizzle dual-package 型エラー回避)
      const ctRows = await this.db
        .select()
        .from(customerTags)
        .where(eq(customerTags.customerId, customerId));
      const tagIds = ctRows.map((r) => r.tagId);
      if (tagIds.length === 0) return [];
      return this.db.select().from(tags).where(inArray(tags.id, tagIds));
    } catch (error) {
      this.logger.error(`Failed to list tags for customer ${customerId}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }
}
