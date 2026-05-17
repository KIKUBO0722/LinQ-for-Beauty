import { Inject, Injectable, Logger, NotFoundException, InternalServerErrorException, HttpException } from '@nestjs/common';
import { eq, and, desc, ilike, or, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { customers, customerTags, tags, messages, reservations, services, locations, lineAccounts } from '@linq-beauty/db';
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
    opts: {
      locationId?: string;
      search?: string;
      tagIds?: string[];
      chatStatus?: string;
      engagementTier?: string;
      limit: number;
      offset: number;
    },
  ): Promise<CustomerWithTags[]> {
    try {
      const conditions = [eq(customers.tenantId, tenantId)];
      if (opts.locationId) conditions.push(eq(customers.preferredLocationId, opts.locationId));
      if (opts.chatStatus) conditions.push(eq(customers.chatStatus, opts.chatStatus));
      if (opts.engagementTier) conditions.push(eq(customers.engagementTier, opts.engagementTier));
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

      // タグ AND 絞り込み: 指定タグ全てを持つ customerId だけに事前絞り込み
      if (opts.tagIds && opts.tagIds.length > 0) {
        const allCtRows = await this.db
          .select()
          .from(customerTags)
          .where(inArray(customerTags.tagId, opts.tagIds));
        const tagsByCustomer = new Map<string, Set<string>>();
        for (const r of allCtRows) {
          if (!tagsByCustomer.has(r.customerId)) tagsByCustomer.set(r.customerId, new Set());
          tagsByCustomer.get(r.customerId)!.add(r.tagId);
        }
        const matchedCustomerIds = [...tagsByCustomer.entries()]
          .filter(([, set]) => opts.tagIds!.every((id) => set.has(id)))
          .map(([cid]) => cid);
        if (matchedCustomerIds.length === 0) return [];
        conditions.push(inArray(customers.id, matchedCustomerIds));
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

  async updateCustomFields(id: string, tenantId: string, patch: Record<string, unknown>) {
    try {
      const customer = await this.findByIdOrThrow(id, tenantId);
      const existing = (customer.customFields as Record<string, unknown>) || {};
      const merged = { ...existing, ...patch };
      // 値 null/'' のキーは削除 (フィールド削除)
      for (const key of Object.keys(merged)) {
        if (merged[key] === null || merged[key] === '') delete merged[key];
      }
      await this.db
        .update(customers)
        .set({ customFields: merged, updatedAt: new Date() })
        .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
      return merged;
    } catch (error) {
      this.logger.error(`Failed to update customFields for customer ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async getTimeline(
    tenantId: string,
    customerId: string,
    opts: { limit: number; offset: number },
  ) {
    try {
      const customer = await this.findByIdOrThrow(customerId, tenantId);

      const [msgRows, resRows, ctRows] = await Promise.all([
        this.db
          .select()
          .from(messages)
          .where(and(eq(messages.tenantId, tenantId), eq(messages.customerId, customerId)))
          .orderBy(desc(messages.createdAt)),
        this.db
          .select()
          .from(reservations)
          .where(eq(reservations.customerId, customerId))
          .orderBy(desc(reservations.startsAt)),
        this.db
          .select()
          .from(customerTags)
          .where(eq(customerTags.customerId, customerId)),
      ]);

      // 名前解決のための補助取得 (2 query JS-merge、innerJoin 回避)
      const tagIds = [...new Set(ctRows.map((r) => r.tagId))];
      const serviceIds = [...new Set(resRows.map((r) => r.serviceId))];
      const locationIds = [
        ...new Set(
          [
            ...msgRows.map((m) => m.locationId),
            ...resRows.map((r) => r.locationId),
          ].filter((id): id is string => !!id),
        ),
      ];

      const [tagList, serviceList, locationList] = await Promise.all([
        tagIds.length === 0
          ? Promise.resolve([])
          : this.db.select().from(tags).where(inArray(tags.id, tagIds)),
        serviceIds.length === 0
          ? Promise.resolve([])
          : this.db.select().from(services).where(inArray(services.id, serviceIds)),
        locationIds.length === 0
          ? Promise.resolve([])
          : this.db.select().from(locations).where(inArray(locations.id, locationIds)),
      ]);

      const tagById = new Map(tagList.map((t) => [t.id, t]));
      const serviceById = new Map(serviceList.map((s) => [s.id, s]));
      const locationById = new Map(locationList.map((l) => [l.id, l]));

      type TimelineEvent = {
        id: string;
        type:
          | 'message_received'
          | 'message_sent'
          | 'reservation'
          | 'tag_added'
          | 'followed'
          | 'unfollowed';
        timestamp: string;
        data: Record<string, unknown>;
      };

      const events: TimelineEvent[] = [];

      for (const m of msgRows) {
        events.push({
          id: `msg-${m.id}`,
          type: m.direction === 'inbound' ? 'message_received' : 'message_sent',
          timestamp: (m.createdAt instanceof Date ? m.createdAt : new Date(m.createdAt as unknown as string)).toISOString(),
          data: {
            messageType: m.messageType,
            content: m.content,
            status: m.status,
            locationName: m.locationId ? locationById.get(m.locationId)?.name ?? null : null,
          },
        });
      }

      for (const r of resRows) {
        events.push({
          id: `res-${r.id}`,
          type: 'reservation',
          timestamp: (r.startsAt instanceof Date ? r.startsAt : new Date(r.startsAt as unknown as string)).toISOString(),
          data: {
            status: r.status,
            serviceName: serviceById.get(r.serviceId)?.name ?? null,
            locationName: locationById.get(r.locationId)?.name ?? null,
            note: r.note,
            endsAt: (r.endsAt instanceof Date ? r.endsAt : new Date(r.endsAt as unknown as string)).toISOString(),
          },
        });
      }

      for (const ct of ctRows) {
        const tag = tagById.get(ct.tagId);
        if (!tag) continue;
        events.push({
          id: `tag-${ct.customerId}-${ct.tagId}`,
          type: 'tag_added',
          timestamp: (ct.assignedAt instanceof Date ? ct.assignedAt : new Date(ct.assignedAt as unknown as string)).toISOString(),
          data: {
            tagName: tag.name,
            tagCategory: tag.category,
            tagColor: tag.color,
          },
        });
      }

      if (customer.followedAt) {
        events.push({
          id: `follow-${customer.id}`,
          type: 'followed',
          timestamp: (customer.followedAt instanceof Date
            ? customer.followedAt
            : new Date(customer.followedAt as unknown as string)
          ).toISOString(),
          data: {},
        });
      }
      if (customer.unfollowedAt) {
        events.push({
          id: `unfollow-${customer.id}`,
          type: 'unfollowed',
          timestamp: (customer.unfollowedAt instanceof Date
            ? customer.unfollowedAt
            : new Date(customer.unfollowedAt as unknown as string)
          ).toISOString(),
          data: {},
        });
      }

      // sort desc + page
      events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return {
        events: events.slice(opts.offset, opts.offset + opts.limit),
        total: events.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get timeline for customer ${customerId}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async exportCsv(tenantId: string): Promise<string> {
    const list = await this.list(tenantId, { limit: 10000, offset: 0 });
    const locationList = await this.db
      .select()
      .from(locations)
      .where(eq(locations.tenantId, tenantId));
    const locationById = new Map(locationList.map((l) => [l.id, l.name]));

    const header =
      '名前,表示名,LINE ID,電話,メール,誕生日,拠点,タグ,対応状況,活性度,スコア,登録日';
    const escape = (v: unknown) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const rows = list.map((c) => {
      const tagStr = c.tags.map((t) => t.name).join('|');
      const locName = c.preferredLocationId ? locationById.get(c.preferredLocationId) ?? '' : '';
      const created = c.createdAt
        ? new Date(c.createdAt as unknown as string).toISOString().slice(0, 10)
        : '';
      return [
        escape(c.name),
        escape(c.displayName),
        escape(c.lineUserId),
        escape(c.phone),
        escape(c.email),
        escape(c.birthday),
        escape(locName),
        escape(tagStr),
        escape(c.chatStatus),
        escape(c.engagementTier),
        c.score,
        created,
      ].join(',');
    });

    return '﻿' + header + '\r\n' + rows.join('\r\n');
  }

  async importFromCsv(
    tenantId: string,
    csvText: string,
  ): Promise<{ imported: number; updated: number; tagsCreated: number; errors: string[] }> {
    const lines = csvText
      .replace(/^﻿/, '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2)
      return { imported: 0, updated: 0, tagsCreated: 0, errors: ['CSVにデータ行がありません'] };

    const header = this.parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
    const findIdx = (...keys: string[]) =>
      header.findIndex((h) => keys.some((k) => h.includes(k.toLowerCase())));

    const nameIdx = findIdx('名前', 'name');
    const displayIdx = findIdx('表示名', 'displayname', 'display_name');
    const lineIdIdx = findIdx('line id', 'lineuserid', 'line_user_id', 'uid');
    const phoneIdx = findIdx('電話', 'phone');
    const emailIdx = findIdx('メール', 'email');
    const birthdayIdx = findIdx('誕生日', 'birthday');
    const tagIdx = findIdx('タグ', 'tag');
    const chatIdx = findIdx('対応状況', 'chatstatus', 'chat_status');
    const tierIdx = findIdx('活性度', 'engagementtier', 'engagement_tier');
    const scoreIdx = findIdx('スコア', 'score');

    if (lineIdIdx === -1 && nameIdx === -1 && displayIdx === -1) {
      return {
        imported: 0,
        updated: 0,
        tagsCreated: 0,
        errors: ['「名前」「表示名」「LINE ID」のいずれかの列が必要です'],
      };
    }

    // 既存タグキャッシュ
    const existingTags = await this.db.select().from(tags).where(eq(tags.tenantId, tenantId));
    const tagMap = new Map<string, string>();
    for (const t of existingTags) tagMap.set(t.name.toLowerCase(), t.id);

    let imported = 0;
    let updated = 0;
    let tagsCreated = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const cols = this.parseCsvLine(lines[i]);
        const name = nameIdx >= 0 ? cols[nameIdx]?.trim() : '';
        const displayName = displayIdx >= 0 ? cols[displayIdx]?.trim() : '';
        const lineUserId = lineIdIdx >= 0 ? cols[lineIdIdx]?.trim() : '';
        const phone = phoneIdx >= 0 ? cols[phoneIdx]?.trim() : undefined;
        const email = emailIdx >= 0 ? cols[emailIdx]?.trim() : undefined;
        const birthday = birthdayIdx >= 0 ? cols[birthdayIdx]?.trim() || undefined : undefined;
        const tagStr = tagIdx >= 0 ? cols[tagIdx]?.trim() : '';
        const chatStatus = chatIdx >= 0 ? cols[chatIdx]?.trim() || undefined : undefined;
        const engagementTier = tierIdx >= 0 ? cols[tierIdx]?.trim() || undefined : undefined;
        const score = scoreIdx >= 0 ? parseInt(cols[scoreIdx]) || 0 : 0;

        if (!name && !displayName && !lineUserId) {
          errors.push(`行${i + 1}: 名前/表示名/LINE ID が全て空です`);
          continue;
        }

        // lineUserId で既存判定 (NULL の場合は新規)
        let existing: (typeof customers.$inferSelect) | null = null;
        if (lineUserId) {
          const [hit] = await this.db
            .select()
            .from(customers)
            .where(
              and(eq(customers.tenantId, tenantId), eq(customers.lineUserId, lineUserId)),
            )
            .limit(1);
          existing = hit ?? null;
        }

        let customerId: string;
        if (existing) {
          const [up] = await this.db
            .update(customers)
            .set({
              name: name || existing.name,
              displayName: displayName || existing.displayName,
              phone: phone ?? existing.phone,
              email: email ?? existing.email,
              birthday: birthday ?? existing.birthday,
              chatStatus: chatStatus ?? existing.chatStatus,
              engagementTier: engagementTier ?? existing.engagementTier,
              score: score > 0 ? score : existing.score,
              updatedAt: new Date(),
            })
            .where(eq(customers.id, existing.id))
            .returning();
          customerId = up.id;
          updated++;
        } else {
          const [created] = await this.db
            .insert(customers)
            .values({
              tenantId,
              name: name || null,
              displayName: displayName || null,
              lineUserId: lineUserId || null,
              phone: phone || null,
              email: email || null,
              birthday: birthday || null,
              chatStatus: chatStatus || 'unread',
              engagementTier: engagementTier || 'unknown',
              score: score || 0,
              acquisitionSource: 'csv_import',
            })
            .returning();
          customerId = created.id;
          imported++;
        }

        // タグ処理 (パイプ区切り)
        if (tagStr) {
          const tagNames = tagStr.split('|').map((t) => t.trim()).filter(Boolean);
          for (const tagName of tagNames) {
            let tagId = tagMap.get(tagName.toLowerCase());
            if (!tagId) {
              const [newTag] = await this.db
                .insert(tags)
                .values({ tenantId, name: tagName })
                .returning();
              tagId = newTag.id;
              tagMap.set(tagName.toLowerCase(), tagId);
              tagsCreated++;
            }
            await this.db
              .insert(customerTags)
              .values({ customerId, tagId })
              .onConflictDoNothing();
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : '処理エラー';
        errors.push(`行${i + 1}: ${message}`);
      }
    }

    return { imported, updated, tagsCreated, errors: errors.slice(0, 20) };
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current);
    return result;
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
