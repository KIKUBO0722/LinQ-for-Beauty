import { Inject, Injectable, Logger, NotFoundException, InternalServerErrorException, HttpException } from '@nestjs/common';
import { eq, and, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { segments, customers, customerTags } from '@linq-beauty/db';
import { DB } from '../../database/database.module';

type Db = NodePgDatabase<typeof schema>;
type SegmentRow = typeof segments.$inferSelect;

@Injectable()
export class SegmentsService {
  private readonly logger = new Logger(SegmentsService.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  async list(tenantId: string): Promise<SegmentRow[]> {
    try {
      return await this.db
        .select()
        .from(segments)
        .where(eq(segments.tenantId, tenantId))
        .orderBy(segments.createdAt);
    } catch (error) {
      this.logger.error(`Failed to list segments: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async get(tenantId: string, id: string): Promise<SegmentRow> {
    const [row] = await this.db
      .select()
      .from(segments)
      .where(and(eq(segments.id, id), eq(segments.tenantId, tenantId)))
      .limit(1);
    if (!row) throw new NotFoundException('セグメントが見つかりません');
    return row;
  }

  async create(
    tenantId: string,
    data: {
      name: string;
      description?: string;
      locationId?: string | null;
      tagIds: string[];
      matchType?: string;
      excludeTagIds?: string[];
    },
  ): Promise<SegmentRow> {
    try {
      const [segment] = await this.db
        .insert(segments)
        .values({
          tenantId,
          name: data.name,
          description: data.description,
          locationId: data.locationId ?? null,
          tagIds: data.tagIds,
          matchType: data.matchType || 'any',
          excludeTagIds: data.excludeTagIds || [],
        })
        .returning();
      return segment;
    } catch (error) {
      this.logger.error(`Failed to create segment: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async update(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      description?: string;
      locationId?: string | null;
      tagIds?: string[];
      matchType?: string;
      excludeTagIds?: string[];
    },
  ): Promise<SegmentRow> {
    try {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.locationId !== undefined) updateData.locationId = data.locationId;
      if (data.tagIds !== undefined) updateData.tagIds = data.tagIds;
      if (data.matchType !== undefined) updateData.matchType = data.matchType;
      if (data.excludeTagIds !== undefined) updateData.excludeTagIds = data.excludeTagIds;

      const [updated] = await this.db
        .update(segments)
        .set(updateData)
        .where(and(eq(segments.id, id), eq(segments.tenantId, tenantId)))
        .returning();
      if (!updated) throw new NotFoundException('セグメントが見つかりません');
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update segment ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async remove(tenantId: string, id: string): Promise<void> {
    try {
      await this.db.delete(segments).where(and(eq(segments.id, id), eq(segments.tenantId, tenantId)));
    } catch (error) {
      this.logger.error(`Failed to delete segment ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  /**
   * 指定タグ条件にマッチする顧客 ID 群を返す。
   * Day 8 の preview / broadcast で使う準備。innerJoin は dual-package 型エラーで使えないため 2 query JS-merge。
   */
  async getMatchingCustomerIds(
    tenantId: string,
    tagIds: string[],
    matchType: string = 'any',
    excludeTagIds: string[] = [],
    locationId?: string | null,
  ): Promise<string[]> {
    if (!tagIds.length) return [];

    // 1) tenant 内で対象タグを持つ顧客 ID + tagId を取得
    const tenantCustomers = await this.db
      .select({ id: customers.id, preferredLocationId: customers.preferredLocationId })
      .from(customers)
      .where(and(eq(customers.tenantId, tenantId), eq(customers.isFollowing, true)));

    const tenantCustomerIds = tenantCustomers.map((c) => c.id);
    if (!tenantCustomerIds.length) return [];

    const tagAssignments = await this.db
      .select({ customerId: customerTags.customerId, tagId: customerTags.tagId })
      .from(customerTags)
      .where(
        and(
          inArray(customerTags.customerId, tenantCustomerIds),
          inArray(customerTags.tagId, [...tagIds, ...excludeTagIds]),
        ),
      );

    // 顧客 → タグ群の Map 構築
    const customerToTags = new Map<string, Set<string>>();
    for (const a of tagAssignments) {
      const set = customerToTags.get(a.customerId) ?? new Set<string>();
      set.add(a.tagId);
      customerToTags.set(a.customerId, set);
    }

    // 2) マッチ判定
    const tagIdSet = new Set(tagIds);
    const excludeSet = new Set(excludeTagIds);
    const locationFilter = new Map(tenantCustomers.map((c) => [c.id, c.preferredLocationId]));

    const matched: string[] = [];
    for (const [customerId, tagsForCustomer] of customerToTags.entries()) {
      // 除外タグ判定: 1 つでも持っていたら除外
      if ([...tagsForCustomer].some((t) => excludeSet.has(t))) continue;

      // include 側の判定
      const matchedTags = [...tagsForCustomer].filter((t) => tagIdSet.has(t));
      const ok = matchType === 'all' ? matchedTags.length === tagIds.length : matchedTags.length > 0;
      if (!ok) continue;

      // 拠点フィルタ
      if (locationId && locationFilter.get(customerId) !== locationId) continue;

      matched.push(customerId);
    }

    return matched;
  }
}
