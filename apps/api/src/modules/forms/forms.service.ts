import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as schema from '@linq-beauty/db';
import { customerTags, forms, formResponses } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import type { CreateFormDto, SubmitResponseDto, UpdateFormDto } from './dto/forms.dto';

const STORAGE_BUCKET = 'forms-images';

// 日本語ファイル名 sanitize (BGJ-task `src/lib/storage.ts` から移植)
function sanitizeFileName(name: string): string {
  const lastDot = name.lastIndexOf('.');
  const base = lastDot === -1 ? name : name.slice(0, lastDot);
  const rawExt = lastDot === -1 ? '' : name.slice(lastDot + 1);
  const safeBase = base
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[_.-]+|[_.-]+$/g, '');
  const safeExt = rawExt.replace(/[^a-zA-Z0-9]/g, '');
  const finalBase = safeBase || 'file';
  return safeExt ? `${finalBase}.${safeExt}` : finalBase;
}

@Injectable()
export class FormsService {
  private readonly logger = new Logger(FormsService.name);
  private supabase: SupabaseClient | null = null;

  constructor(@Inject(DB) private readonly db: NodePgDatabase<typeof schema>) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      this.supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    } else {
      this.logger.warn('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set, image upload disabled');
    }
  }

  async uploadImage(buffer: Buffer, mimetype: string, originalName: string): Promise<string> {
    if (!this.supabase) {
      throw new InternalServerErrorException(
        'Image upload is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)',
      );
    }
    if (!mimetype.startsWith('image/')) {
      throw new BadRequestException('画像ファイルのみアップロード可');
    }
    const safe = sanitizeFileName(originalName);
    const path = `${new Date().toISOString().slice(0, 7)}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
    const { error } = await this.supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, buffer, { contentType: mimetype, upsert: false });
    if (error) {
      this.logger.error(`Supabase Storage upload failed: ${error.message}`);
      throw new InternalServerErrorException(`画像アップロード失敗: ${error.message}`);
    }
    const { data } = this.supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async findByTenant(tenantId: string, locationId?: string) {
    try {
      return await this.db
        .select()
        .from(forms)
        .where(
          and(
            eq(forms.tenantId, tenantId),
            locationId ? eq(forms.locationId, locationId) : undefined,
          ),
        )
        .orderBy(desc(forms.createdAt));
    } catch (error) {
      this.logger.error(`Failed to list forms: ${error}`);
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async findOne(tenantId: string, id: string) {
    const [form] = await this.db
      .select()
      .from(forms)
      .where(and(eq(forms.id, id), eq(forms.tenantId, tenantId)))
      .limit(1);
    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  async findBySlug(slug: string) {
    // 公開ページ用、認証なし
    const [form] = await this.db
      .select()
      .from(forms)
      .where(and(eq(forms.slug, slug), eq(forms.isPublished, true)))
      .limit(1);
    if (!form) throw new NotFoundException('Form not found or not published');
    return form;
  }

  async create(tenantId: string, data: CreateFormDto) {
    if (!/^[a-z0-9-]{3,100}$/.test(data.slug)) {
      throw new BadRequestException(
        'slug は英小文字 / 数字 / ハイフン 3-100 文字のみ',
      );
    }
    const [created] = await this.db
      .insert(forms)
      .values({
        tenantId,
        locationId: data.locationId ?? null,
        name: data.name,
        slug: data.slug,
        category: data.category ?? null,
        description: data.description ?? null,
        fields: data.fields ?? [],
        autoTagIds: data.autoTagIds ?? [],
        thankYouMessage: data.thankYouMessage ?? null,
        isPublished: data.isPublished ?? false,
      })
      .returning();
    return created;
  }

  async update(tenantId: string, id: string, data: UpdateFormDto) {
    await this.findOne(tenantId, id);
    if (data.slug && !/^[a-z0-9-]{3,100}$/.test(data.slug)) {
      throw new BadRequestException(
        'slug は英小文字 / 数字 / ハイフン 3-100 文字のみ',
      );
    }
    const [updated] = await this.db
      .update(forms)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.locationId !== undefined && { locationId: data.locationId }),
        ...(data.fields !== undefined && { fields: data.fields }),
        ...(data.autoTagIds !== undefined && { autoTagIds: data.autoTagIds }),
        ...(data.thankYouMessage !== undefined && { thankYouMessage: data.thankYouMessage }),
        ...(data.isPublished !== undefined && { isPublished: data.isPublished }),
        updatedAt: new Date(),
      })
      .where(eq(forms.id, id))
      .returning();
    return updated;
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.db.delete(forms).where(eq(forms.id, id));
    return { ok: true };
  }

  async submitResponse(slug: string, data: SubmitResponseDto) {
    const form = await this.findBySlug(slug);
    const [created] = await this.db
      .insert(formResponses)
      .values({
        formId: form.id,
        customerId: data.customerId ?? null,
        lineUserId: data.lineUserId ?? null,
        answers: data.answers,
      })
      .returning();

    // 回答後の自動タグ付与 (customerId がある場合のみ)
    if (data.customerId && form.autoTagIds.length > 0) {
      for (const tagId of form.autoTagIds) {
        try {
          await this.db
            .insert(customerTags)
            .values({ customerId: data.customerId, tagId })
            .onConflictDoNothing();
        } catch (err) {
          this.logger.warn(`Failed to auto-tag ${tagId}: ${err}`);
        }
      }
    }

    return {
      responseId: created.id,
      thankYouMessage: form.thankYouMessage,
    };
  }

  async listResponses(tenantId: string, formId: string) {
    await this.findOne(tenantId, formId);
    return this.db
      .select()
      .from(formResponses)
      .where(eq(formResponses.formId, formId))
      .orderBy(desc(formResponses.submittedAt));
  }
}
