import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { messagingApi } from '@line/bot-sdk';
import * as schema from '@linq-beauty/db';
import { customers, lineAccounts, richMenuGroups, richMenus } from '@linq-beauty/db';
import { DB } from '../../database/database.module';
import { LineService, type LineCredentials } from '../line/line.service';

const { MessagingApiBlobClient } = messagingApi;

interface RichMenuAreaInput {
  bounds?: { x: number; y: number; width: number; height: number };
  action?: Record<string, unknown>;
  text?: string;
}

@Injectable()
export class RichMenusService {
  private readonly logger = new Logger(RichMenusService.name);

  constructor(
    @Inject(DB) private readonly db: NodePgDatabase<typeof schema>,
    private readonly lineService: LineService,
  ) {}

  private async getAccount(tenantId: string, lineAccountId: string) {
    const [account] = await this.db
      .select()
      .from(lineAccounts)
      .where(and(eq(lineAccounts.id, lineAccountId), eq(lineAccounts.tenantId, tenantId)))
      .limit(1);
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  private credentialsOf(account: typeof lineAccounts.$inferSelect): LineCredentials {
    return {
      channelSecret: account.channelSecret,
      channelAccessToken: account.channelAccessToken,
    };
  }

  async findByTenant(tenantId: string, locationId?: string) {
    try {
      return await this.db
        .select()
        .from(richMenus)
        .where(
          and(
            eq(richMenus.tenantId, tenantId),
            locationId ? eq(richMenus.locationId, locationId) : undefined,
          ),
        )
        .orderBy(richMenus.createdAt);
    } catch (error) {
      this.logger.error(`Failed to find rich menus: ${error}`);
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async create(
    tenantId: string,
    data: {
      lineAccountId: string;
      name: string;
      chatBarText?: string;
      areas?: RichMenuAreaInput[];
      size?: { width: number; height: number };
      locationId?: string;
    },
  ) {
    const account = await this.getAccount(tenantId, data.lineAccountId);
    const client = this.lineService.getClient(this.credentialsOf(account));

    const size = data.size || { width: 2500, height: 1686 };
    const areas = (data.areas || []).map((area) => ({
      bounds: area.bounds || { x: 0, y: 0, width: size.width, height: size.height },
      action: area.action || { type: 'message', text: area.text || 'メニュー' },
    }));
    const richMenuAreas =
      areas.length > 0
        ? areas
        : [
            {
              bounds: { x: 0, y: 0, width: size.width, height: size.height },
              action: { type: 'message' as const, text: 'メニュー' },
            },
          ];

    let lineRichMenuId: string | null = null;
    try {
      const result = await client.createRichMenu({
        size,
        selected: true,
        name: data.name,
        chatBarText: data.chatBarText || 'メニュー',
        areas: richMenuAreas as messagingApi.RichMenuArea[],
      });
      lineRichMenuId = result.richMenuId;
    } catch (err) {
      this.logger.warn(`LINE API rich menu creation failed: ${err}`);
    }

    const [menu] = await this.db
      .insert(richMenus)
      .values({
        tenantId,
        locationId: data.locationId ?? null,
        lineAccountId: data.lineAccountId,
        name: data.name,
        lineRichMenuId,
        size,
        areas: richMenuAreas,
        chatBarText: data.chatBarText || 'メニュー',
        isActive: !!lineRichMenuId,
      })
      .returning();

    return menu;
  }

  async uploadImage(tenantId: string, id: string, imageBuffer: Buffer, contentType: string) {
    const [menu] = await this.db
      .select()
      .from(richMenus)
      .where(and(eq(richMenus.id, id), eq(richMenus.tenantId, tenantId)))
      .limit(1);
    if (!menu) throw new NotFoundException('Rich menu not found');
    if (!menu.lineRichMenuId) throw new BadRequestException('Rich menu not synced with LINE');

    const account = await this.getAccount(tenantId, menu.lineAccountId);
    const blobClient = new MessagingApiBlobClient({
      channelAccessToken: account.channelAccessToken,
    });

    const uint8 = new Uint8Array(imageBuffer);
    const blob = new Blob([uint8], { type: contentType });
    await blobClient.setRichMenuImage(menu.lineRichMenuId, blob);

    await this.db
      .update(richMenus)
      .set({ imageUrl: `line://richmenu/${menu.lineRichMenuId}` })
      .where(eq(richMenus.id, id));

    return { ok: true };
  }

  async update(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      chatBarText?: string;
      areas?: RichMenuAreaInput[];
      size?: { width: number; height: number };
    },
  ) {
    const [menu] = await this.db
      .select()
      .from(richMenus)
      .where(and(eq(richMenus.id, id), eq(richMenus.tenantId, tenantId)))
      .limit(1);
    if (!menu) throw new NotFoundException('Rich menu not found');

    const account = await this.getAccount(tenantId, menu.lineAccountId);
    const client = this.lineService.getClient(this.credentialsOf(account));

    const wasDefault = menu.isDefault;
    const newSize =
      data.size ||
      (menu.size as { width: number; height: number } | null) ||
      { width: 2500, height: 1686 };
    const newAreas = data.areas || ((menu.areas as Record<string, unknown>[] | null) ?? []);
    const newName = data.name || menu.name;
    const newChatBarText = data.chatBarText || menu.chatBarText || 'メニュー';

    if (menu.lineRichMenuId) {
      try {
        await client.deleteRichMenu(menu.lineRichMenuId);
      } catch (err) {
        this.logger.warn(`Failed to delete old LINE rich menu: ${err}`);
      }
    }

    let lineRichMenuId: string | null = null;
    try {
      const result = await client.createRichMenu({
        size: newSize,
        selected: true,
        name: newName,
        chatBarText: newChatBarText,
        areas: newAreas as messagingApi.RichMenuArea[],
      });
      lineRichMenuId = result.richMenuId;
    } catch (err) {
      this.logger.warn(`LINE API rich menu recreation failed: ${err}`);
    }

    if (wasDefault && lineRichMenuId) {
      try {
        await client.setDefaultRichMenu(lineRichMenuId);
      } catch (err) {
        this.logger.warn(`Failed to restore default: ${err}`);
      }
    }

    const [updated] = await this.db
      .update(richMenus)
      .set({
        name: newName,
        chatBarText: newChatBarText,
        size: newSize,
        areas: newAreas,
        lineRichMenuId,
        isActive: !!lineRichMenuId,
        imageUrl: null,
      })
      .where(eq(richMenus.id, id))
      .returning();

    return updated;
  }

  async delete(tenantId: string, id: string) {
    const [menu] = await this.db
      .select()
      .from(richMenus)
      .where(and(eq(richMenus.id, id), eq(richMenus.tenantId, tenantId)))
      .limit(1);
    if (!menu) throw new NotFoundException('Rich menu not found');

    if (menu.lineRichMenuId) {
      try {
        const account = await this.getAccount(tenantId, menu.lineAccountId);
        const client = this.lineService.getClient(this.credentialsOf(account));
        await client.deleteRichMenu(menu.lineRichMenuId);
      } catch (err) {
        this.logger.warn(`Failed to delete LINE rich menu: ${err}`);
      }
    }

    await this.db.delete(richMenus).where(eq(richMenus.id, id));
    return { ok: true };
  }

  async setDefault(tenantId: string, id: string) {
    try {
      const [menu] = await this.db
        .select()
        .from(richMenus)
        .where(and(eq(richMenus.id, id), eq(richMenus.tenantId, tenantId)))
        .limit(1);
      if (!menu) throw new NotFoundException('Rich menu not found');
      if (!menu.lineRichMenuId) throw new BadRequestException('Rich menu not synced with LINE');

      const account = await this.getAccount(tenantId, menu.lineAccountId);
      const client = this.lineService.getClient(this.credentialsOf(account));
      await client.setDefaultRichMenu(menu.lineRichMenuId);

      await this.db
        .update(richMenus)
        .set({ isDefault: false })
        .where(eq(richMenus.lineAccountId, menu.lineAccountId));
      await this.db.update(richMenus).set({ isDefault: true }).where(eq(richMenus.id, id));

      return { ok: true };
    } catch (error) {
      this.logger.error(`Failed to set default rich menu ${id}: ${error}`);
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async listGroups(tenantId: string) {
    try {
      const groups = await this.db
        .select()
        .from(richMenuGroups)
        .where(eq(richMenuGroups.tenantId, tenantId))
        .orderBy(richMenuGroups.createdAt);

      const result: Array<typeof groups[number] & { menus: (typeof richMenus.$inferSelect)[] }> = [];
      for (const group of groups) {
        const groupMenus = await this.db
          .select()
          .from(richMenus)
          .where(and(eq(richMenus.tenantId, tenantId), eq(richMenus.groupId, group.id)))
          .orderBy(richMenus.tabIndex);
        result.push({ ...group, menus: groupMenus });
      }
      return result;
    } catch (error) {
      this.logger.error(`Failed to list rich menu groups: ${error}`);
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException('操作に失敗しました');
    }
  }

  async createGroup(
    tenantId: string,
    data: {
      lineAccountId: string;
      name: string;
      description?: string;
      tabs: Array<{
        name: string;
        chatBarText?: string;
        areas: RichMenuAreaInput[];
        size?: { width: number; height: number };
      }>;
    },
  ) {
    const account = await this.getAccount(tenantId, data.lineAccountId);
    const credentials = this.credentialsOf(account);

    const [group] = await this.db
      .insert(richMenuGroups)
      .values({
        tenantId,
        lineAccountId: data.lineAccountId,
        name: data.name,
        description: data.description,
      })
      .returning();

    const createdMenus: (typeof richMenus.$inferSelect)[] = [];
    for (let i = 0; i < data.tabs.length; i++) {
      const tab = data.tabs[i];
      const size = tab.size || { width: 2500, height: 1686 };
      const areas =
        tab.areas.length > 0
          ? tab.areas
          : [
              {
                bounds: { x: 0, y: 0, width: size.width, height: size.height },
                action: { type: 'message', text: 'メニュー' },
              },
            ];

      let lineRichMenuId: string | null = null;
      try {
        const result = await this.lineService.getClient(credentials).createRichMenu({
          size,
          selected: true,
          name: `${data.name} - ${tab.name}`,
          chatBarText: tab.chatBarText || 'メニュー',
          areas: areas as messagingApi.RichMenuArea[],
        });
        lineRichMenuId = result.richMenuId;
      } catch (err) {
        this.logger.warn(`Failed to create tab ${i} on LINE: ${err}`);
      }

      let lineAliasId: string | null = null;
      if (lineRichMenuId) {
        const aliasId = `richmenu-alias-${group.id}-tab${i}`;
        try {
          await this.lineService.createRichMenuAlias(credentials, aliasId, lineRichMenuId);
          lineAliasId = aliasId;
        } catch (err) {
          this.logger.warn(`Failed to create alias for tab ${i}: ${err}`);
        }
      }

      const [menu] = await this.db
        .insert(richMenus)
        .values({
          tenantId,
          lineAccountId: data.lineAccountId,
          name: tab.name,
          lineRichMenuId,
          lineAliasId,
          groupId: group.id,
          tabIndex: i,
          size,
          areas,
          chatBarText: tab.chatBarText || 'メニュー',
          isActive: !!lineRichMenuId,
        })
        .returning();
      createdMenus.push(menu);
    }

    return { ...group, menus: createdMenus };
  }

  async deleteGroup(tenantId: string, groupId: string) {
    const groupMenus = await this.db
      .select()
      .from(richMenus)
      .where(and(eq(richMenus.tenantId, tenantId), eq(richMenus.groupId, groupId)));

    for (const menu of groupMenus) {
      if (menu.lineAliasId) {
        try {
          const account = await this.getAccount(tenantId, menu.lineAccountId);
          await this.lineService.deleteRichMenuAlias(
            this.credentialsOf(account),
            menu.lineAliasId,
          );
        } catch (err) {
          this.logger.warn(`Failed to delete alias: ${err}`);
        }
      }
      if (menu.lineRichMenuId) {
        try {
          const account = await this.getAccount(tenantId, menu.lineAccountId);
          const client = this.lineService.getClient(this.credentialsOf(account));
          await client.deleteRichMenu(menu.lineRichMenuId);
        } catch (err) {
          this.logger.warn(`Failed to delete LINE rich menu: ${err}`);
        }
      }
    }

    await this.db.delete(richMenus).where(eq(richMenus.groupId, groupId));
    await this.db.delete(richMenuGroups).where(eq(richMenuGroups.id, groupId));
    return { ok: true };
  }

  async setGroupDefault(tenantId: string, groupId: string) {
    const [firstTab] = await this.db
      .select()
      .from(richMenus)
      .where(
        and(
          eq(richMenus.tenantId, tenantId),
          eq(richMenus.groupId, groupId),
          eq(richMenus.tabIndex, 0),
        ),
      )
      .limit(1);
    if (!firstTab || !firstTab.lineRichMenuId)
      throw new BadRequestException('Group has no synced tabs');
    return this.setDefault(tenantId, firstTab.id);
  }

  async assignMenuToUser(
    tenantId: string,
    data: { customerId: string; richMenuId: string },
  ) {
    try {
      const [menu] = await this.db
        .select()
        .from(richMenus)
        .where(and(eq(richMenus.id, data.richMenuId), eq(richMenus.tenantId, tenantId)))
        .limit(1);
      if (!menu || !menu.lineRichMenuId)
        throw new NotFoundException('Rich menu not found or not synced');

      const account = await this.getAccount(tenantId, menu.lineAccountId);

      const [customer] = await this.db
        .select()
        .from(customers)
        .where(and(eq(customers.id, data.customerId), eq(customers.tenantId, tenantId)))
        .limit(1);
      if (!customer) throw new NotFoundException('Customer not found');
      if (!customer.lineUserId)
        throw new BadRequestException('Customer has no LINE userId');

      await this.lineService.linkRichMenuToUser(
        this.credentialsOf(account),
        customer.lineUserId,
        menu.lineRichMenuId,
      );

      return { ok: true };
    } catch (error) {
      this.logger.error(`Failed to assign rich menu to user: ${error}`);
      throw error instanceof HttpException
        ? error
        : new InternalServerErrorException('操作に失敗しました');
    }
  }
}
