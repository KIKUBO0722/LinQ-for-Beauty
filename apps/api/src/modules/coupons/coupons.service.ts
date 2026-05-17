import { Inject, Injectable, Logger, InternalServerErrorException, HttpException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { coupons } from '@linq-beauty/db';
import { DB } from '../../database/database.module';

type Db = NodePgDatabase<typeof schema>;

// O/0/I/1 等の紛らわしい文字を除外 (32 文字、log2(32) = 5 bits/char、8 文字 = 40 bit 強度)
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  generateCode(length = 8): string {
    let out = '';
    for (let i = 0; i < length; i++) {
      out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return out;
  }

  async list(tenantId: string, locationId?: string) {
    try {
      return await this.db
        .select()
        .from(coupons)
        .where(
          and(
            eq(coupons.tenantId, tenantId),
            locationId ? eq(coupons.locationId, locationId) : undefined,
          ),
        )
        .orderBy(desc(coupons.createdAt));
    } catch (error) {
      this.logger.error(`Failed to list coupons: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async create(
    tenantId: string,
    data: {
      name: string;
      code: string;
      discountType: string;
      discountValue: number;
      description?: string;
      expiresAt?: string;
      maxUses?: number;
    },
    locationId?: string,
  ) {
    try {
      const [coupon] = await this.db
        .insert(coupons)
        .values({
          tenantId,
          locationId: locationId ?? null,
          name: data.name,
          code: data.code,
          discountType: data.discountType,
          discountValue: data.discountValue,
          description: data.description,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          maxUses: data.maxUses ?? null,
        })
        .returning();
      return coupon;
    } catch (error) {
      this.logger.error(`Failed to create coupon: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async update(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      code?: string;
      discountType?: string;
      discountValue?: number;
      description?: string;
      expiresAt?: string | null;
      maxUses?: number | null;
    },
  ) {
    try {
      const values: Record<string, unknown> = { updatedAt: new Date() };
      if (data.name !== undefined) values.name = data.name;
      if (data.code !== undefined) values.code = data.code;
      if (data.discountType !== undefined) values.discountType = data.discountType;
      if (data.discountValue !== undefined) values.discountValue = data.discountValue;
      if (data.description !== undefined) values.description = data.description;
      if (data.expiresAt !== undefined)
        values.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
      if (data.maxUses !== undefined) values.maxUses = data.maxUses;

      const [coupon] = await this.db
        .update(coupons)
        .set(values)
        .where(and(eq(coupons.id, id), eq(coupons.tenantId, tenantId)))
        .returning();
      return coupon;
    } catch (error) {
      this.logger.error(`Failed to update coupon ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async toggle(tenantId: string, id: string, isActive: boolean) {
    try {
      const [coupon] = await this.db
        .update(coupons)
        .set({ isActive, updatedAt: new Date() })
        .where(and(eq(coupons.id, id), eq(coupons.tenantId, tenantId)))
        .returning();
      return coupon;
    } catch (error) {
      this.logger.error(`Failed to toggle coupon ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async delete(tenantId: string, id: string) {
    try {
      await this.db.delete(coupons).where(and(eq(coupons.id, id), eq(coupons.tenantId, tenantId)));
    } catch (error) {
      this.logger.error(`Failed to delete coupon ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }
}
