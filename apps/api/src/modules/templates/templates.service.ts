import { Inject, Injectable, Logger, InternalServerErrorException, HttpException } from '@nestjs/common';
import { eq, and, desc } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '@linq-beauty/db';
import { messageTemplates } from '@linq-beauty/db';
import { DB } from '../../database/database.module';

type Db = NodePgDatabase<typeof schema>;
type MessageTemplate = typeof messageTemplates.$inferSelect;

interface LineUriAction { type: 'uri'; label: string; uri: string; }
interface LineMessageAction { type: 'message'; label: string; text: string; }
interface LinePostbackAction { type: 'postback'; label: string; data: string; }
type LineAction = LineUriAction | LineMessageAction | LinePostbackAction;

interface TemplateActionInput {
  type: string;
  label?: string;
  uri?: string;
  text?: string;
  data?: string;
}

interface ButtonsMessageData {
  text?: string;
  title?: string;
  thumbnailImageUrl?: string;
  thumbnailUrl?: string;
  actions?: TemplateActionInput[];
}

interface CarouselColumn {
  text?: string;
  title?: string;
  thumbnailImageUrl?: string;
  thumbnailUrl?: string;
  actions?: TemplateActionInput[];
}

interface CarouselMessageData { columns?: CarouselColumn[]; }
interface ConfirmMessageData { text?: string; actions?: TemplateActionInput[]; }
interface ImageMessageData { imageUrl?: string; previewUrl?: string; }

type TemplateMessageData =
  | ButtonsMessageData
  | CarouselMessageData
  | ConfirmMessageData
  | ImageMessageData
  | Record<string, unknown>;

interface LineTextMessage { type: 'text'; text: string; }
interface LineImageMessage { type: 'image'; originalContentUrl: string; previewImageUrl: string; }
interface LineButtonsTemplate {
  type: 'buttons';
  text: string;
  actions: LineAction[];
  thumbnailImageUrl?: string;
  title?: string;
}
interface LineCarouselColumnOutput {
  text: string;
  actions: LineAction[];
  thumbnailImageUrl?: string;
  title?: string;
}
interface LineCarouselTemplate { type: 'carousel'; columns: LineCarouselColumnOutput[]; }
interface LineConfirmTemplate { type: 'confirm'; text: string; actions: LineAction[]; }
interface LineTemplateMessage {
  type: 'template';
  altText: string;
  template: LineButtonsTemplate | LineCarouselTemplate | LineConfirmTemplate;
}
interface LineFlexMessage { type: 'flex'; altText: string; contents: unknown; }

type LineMessage = LineTextMessage | LineImageMessage | LineTemplateMessage | LineFlexMessage;

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(@Inject(DB) private readonly db: Db) {}

  async list(tenantId: string, locationId?: string) {
    try {
      return await this.db
        .select()
        .from(messageTemplates)
        .where(
          and(
            eq(messageTemplates.tenantId, tenantId),
            locationId ? eq(messageTemplates.locationId, locationId) : undefined,
          ),
        )
        .orderBy(desc(messageTemplates.updatedAt));
    } catch (error) {
      this.logger.error(`Failed to list templates: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async create(
    tenantId: string,
    data: { name: string; content: string; category?: string; messageType?: string; messageData?: Record<string, unknown> },
    locationId?: string,
  ) {
    try {
      const [template] = await this.db
        .insert(messageTemplates)
        .values({
          tenantId,
          locationId: locationId ?? null,
          name: data.name,
          content: data.content,
          category: data.category,
          messageType: data.messageType || 'text',
          messageData: data.messageData || null,
        })
        .returning();
      return template;
    } catch (error) {
      this.logger.error(`Failed to create template: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async update(
    tenantId: string,
    id: string,
    data: { name?: string; content?: string; category?: string; messageType?: string; messageData?: Record<string, unknown> },
  ) {
    try {
      const values: Record<string, unknown> = { updatedAt: new Date() };
      if (data.name !== undefined) values.name = data.name;
      if (data.content !== undefined) values.content = data.content;
      if (data.category !== undefined) values.category = data.category;
      if (data.messageType !== undefined) values.messageType = data.messageType;
      if (data.messageData !== undefined) values.messageData = data.messageData;

      const [template] = await this.db
        .update(messageTemplates)
        .set(values)
        .where(and(eq(messageTemplates.id, id), eq(messageTemplates.tenantId, tenantId)))
        .returning();
      return template;
    } catch (error) {
      this.logger.error(`Failed to update template ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async delete(tenantId: string, id: string) {
    try {
      await this.db
        .delete(messageTemplates)
        .where(and(eq(messageTemplates.id, id), eq(messageTemplates.tenantId, tenantId)));
    } catch (error) {
      this.logger.error(`Failed to delete template ${id}: ${error}`);
      throw error instanceof HttpException ? error : new InternalServerErrorException('操作に失敗しました');
    }
  }

  convertToLineMessage(template: MessageTemplate): LineMessage {
    const type = template.messageType || 'text';
    const data = template.messageData as TemplateMessageData | null;

    if (type === 'text' || !data) {
      return { type: 'text', text: template.content };
    }

    if (type === 'buttons') {
      const btnData = data as ButtonsMessageData;
      const tpl: LineButtonsTemplate = {
        type: 'buttons',
        text: btnData.text || template.content,
        actions: (btnData.actions || []).map(this.convertAction),
      };
      const thumb = btnData.thumbnailImageUrl || btnData.thumbnailUrl;
      if (thumb) tpl.thumbnailImageUrl = thumb;
      if (btnData.title) tpl.title = btnData.title;
      return { type: 'template', altText: template.content || template.name, template: tpl };
    }

    if (type === 'carousel') {
      const carouselData = data as CarouselMessageData;
      const columns: LineCarouselColumnOutput[] = (carouselData.columns || []).map((col: CarouselColumn) => {
        const c: LineCarouselColumnOutput = {
          text: col.text || '',
          actions: (col.actions || []).map(this.convertAction),
        };
        const colThumb = col.thumbnailImageUrl || col.thumbnailUrl;
        if (colThumb) c.thumbnailImageUrl = colThumb;
        if (col.title) c.title = col.title;
        return c;
      });
      if (columns.length === 0) return { type: 'text', text: template.content || template.name };
      return { type: 'template', altText: template.content || template.name, template: { type: 'carousel', columns } };
    }

    if (type === 'confirm') {
      const confirmData = data as ConfirmMessageData;
      return {
        type: 'template',
        altText: template.content || template.name,
        template: {
          type: 'confirm',
          text: confirmData.text || template.content,
          actions: (confirmData.actions || []).map(this.convertAction),
        },
      };
    }

    if (type === 'image') {
      const imgData = data as ImageMessageData;
      return {
        type: 'image',
        originalContentUrl: imgData.imageUrl || '',
        previewImageUrl: imgData.previewUrl || imgData.imageUrl || '',
      };
    }

    if (type === 'flex') {
      try {
        return {
          type: 'flex',
          altText: template.content || template.name,
          contents: typeof data === 'string' ? JSON.parse(data as string) : data,
        };
      } catch {
        return { type: 'text', text: template.content };
      }
    }

    return { type: 'text', text: template.content };
  }

  private convertAction(action: TemplateActionInput): LineAction {
    if (action.type === 'uri') {
      return { type: 'uri', label: action.label || 'リンク', uri: action.uri || '' };
    }
    if (action.type === 'message') {
      return { type: 'message', label: action.label || '送信', text: action.text || '' };
    }
    if (action.type === 'postback') {
      return { type: 'postback', label: action.label || 'アクション', data: action.data || '' };
    }
    return { type: 'message', label: action.label || '', text: action.text || '' };
  }
}
