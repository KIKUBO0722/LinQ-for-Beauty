const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';
export const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID ?? '';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export type Location = {
  id: string;
  name: string;
  address: string | null;
};

export type Reservation = {
  id: string;
  locationId: string;
  serviceId: string;
  customerId: string | null;
  guestName: string | null;
  guestPhone: string | null;
  startsAt: string;
  endsAt: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  note: string | null;
  services: { name: string; durationMin: number } | null;
  customers: { name: string; phone: string | null } | null;
  locations: { id: string; name: string } | null;
};

export type PersonalBlock = {
  id: string;
  tenantId: string;
  locationId: string | null;
  title: string;
  startsAt: string;
  endsAt: string;
};

export type LineMessageContent =
  | { type: 'text'; text: string }
  | { type: 'image'; originalContentUrl: string; previewImageUrl?: string }
  | { type: 'video'; originalContentUrl: string; previewImageUrl?: string }
  | { type: 'audio'; originalContentUrl: string; duration?: number }
  | { type: 'flex'; altText: string; contents: unknown }
  | { type: string; [k: string]: unknown };

export type MessageThread = {
  customerId: string;
  customerName: string | null;
  lineUserId: string | null;
  preferredLocationId: string | null;
  lastReadAt: string | null;
  unreadCount: number;
  lastMessage: LineMessageContent | null;
  lastMessageDirection: 'inbound' | 'outbound' | null;
  lastMessageAt: string | null;
};

export type Message = {
  id: string;
  tenantId: string;
  locationId: string | null;
  lineAccountId: string;
  customerId: string | null;
  direction: 'inbound' | 'outbound';
  messageType: string;
  content: LineMessageContent;
  sendType: string | null;
  status: string;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
};

export const api = {
  locations: {
    list: () => req<Location[]>(`/api/v1/locations?tenantId=${TENANT_ID}`),
  },
  reservations: {
    list: (locationId: string, from: string, to: string) =>
      req<Reservation[]>(
        `/api/v1/reservations?tenantId=${TENANT_ID}&locationId=${locationId}&from=${from}&to=${to}`,
      ),
    listAll: (from?: string, to?: string) => {
      const qs = [
        `tenantId=${TENANT_ID}`,
        from ? `from=${from}` : '',
        to ? `to=${to}` : '',
      ]
        .filter(Boolean)
        .join('&');
      return req<Reservation[]>(`/api/v1/reservations?${qs}`);
    },
    cancel: (id: string) => req<Reservation>(`/api/v1/reservations/${id}`, { method: 'DELETE' }),
  },
  personalBlocks: {
    list: (locationId: string) =>
      req<PersonalBlock[]>(`/api/v1/personal-blocks?tenantId=${TENANT_ID}&locationId=${locationId}`),
    create: (body: { locationId: string; title: string; startsAt: string; endsAt: string }) =>
      req<PersonalBlock>(`/api/v1/personal-blocks?tenantId=${TENANT_ID}`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      req<PersonalBlock>(`/api/v1/personal-blocks/${id}?tenantId=${TENANT_ID}`, { method: 'DELETE' }),
  },
  ics: {
    issueToken: (locationId?: string) =>
      req<{
        id: string;
        token: string;
        icsUrl: string;
        locationId: string | null;
        createdAt: string;
      }>(`/api/v1/ics/tokens?tenantId=${TENANT_ID}`, {
        method: 'POST',
        body: JSON.stringify({ locationId }),
      }),
  },
  messages: {
    threads: (locationId?: string) => {
      const loc = locationId ? `&locationId=${locationId}` : '';
      return req<MessageThread[]>(`/api/v1/messages/threads?tenantId=${TENANT_ID}${loc}`);
    },
    conversation: (customerId: string, locationId?: string) => {
      const loc = locationId ? `&locationId=${locationId}` : '';
      return req<Message[]>(
        `/api/v1/messages/conversation/${customerId}?tenantId=${TENANT_ID}${loc}`,
      );
    },
    markAsRead: (customerId: string) =>
      req<{ ok: boolean }>(
        `/api/v1/messages/read/${customerId}?tenantId=${TENANT_ID}`,
        { method: 'POST' },
      ),
    send: (customerId: string, text: string) =>
      req<Message>(`/api/v1/messages/send?tenantId=${TENANT_ID}`, {
        method: 'POST',
        body: JSON.stringify({ customerId, text }),
      }),
  },
  broadcasts: {
    list: (locationId?: string) => {
      const loc = locationId ? `&locationId=${locationId}` : '';
      return req<Broadcast[]>(`/api/v1/broadcasts?tenantId=${TENANT_ID}${loc}`);
    },
    get: (id: string) => req<Broadcast>(`/api/v1/broadcasts/${id}?tenantId=${TENANT_ID}`),
    create: (
      body: {
        type: 'all' | 'segment' | 'scheduled';
        title?: string;
        text: string;
        messageType?: 'text' | 'image' | 'video' | 'audio' | 'flex';
        scheduledAt?: string;
      },
      locationId?: string,
    ) => {
      const loc = locationId ? `&locationId=${locationId}` : '';
      return req<Broadcast>(`/api/v1/broadcasts?tenantId=${TENANT_ID}${loc}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    cancel: (id: string) =>
      req<Broadcast>(`/api/v1/broadcasts/${id}?tenantId=${TENANT_ID}`, { method: 'DELETE' }),
  },
  templates: {
    list: (locationId?: string) => {
      const loc = locationId ? `&locationId=${locationId}` : '';
      return req<MessageTemplate[]>(`/api/v1/templates?tenantId=${TENANT_ID}${loc}`);
    },
    create: (
      body: {
        name: string;
        content: string;
        category?: string;
        messageType?: string;
        messageData?: Record<string, unknown> | null;
      },
      locationId?: string,
    ) => {
      const loc = locationId ? `&locationId=${locationId}` : '';
      return req<MessageTemplate>(`/api/v1/templates?tenantId=${TENANT_ID}${loc}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    update: (
      id: string,
      body: {
        name?: string;
        content?: string;
        category?: string;
        messageType?: string;
        messageData?: Record<string, unknown> | null;
      },
    ) =>
      req<MessageTemplate>(`/api/v1/templates/${id}?tenantId=${TENANT_ID}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      req<{ ok: boolean }>(`/api/v1/templates/${id}?tenantId=${TENANT_ID}`, { method: 'DELETE' }),
  },
  customers: {
    list: (opts?: {
      locationId?: string;
      search?: string;
      tagIds?: string[];
      chatStatus?: string;
      engagementTier?: string;
      limit?: number;
      offset?: number;
    }) => {
      const qs = [
        `tenantId=${TENANT_ID}`,
        opts?.locationId ? `locationId=${opts.locationId}` : '',
        opts?.search ? `search=${encodeURIComponent(opts.search)}` : '',
        opts?.tagIds && opts.tagIds.length > 0 ? `tagIds=${opts.tagIds.join(',')}` : '',
        opts?.chatStatus ? `chatStatus=${opts.chatStatus}` : '',
        opts?.engagementTier ? `engagementTier=${opts.engagementTier}` : '',
        opts?.limit ? `limit=${opts.limit}` : '',
        opts?.offset ? `offset=${opts.offset}` : '',
      ]
        .filter(Boolean)
        .join('&');
      return req<CustomerWithTags[]>(`/api/v1/customers?${qs}`);
    },
    get: (id: string) => req<CustomerWithTags>(`/api/v1/customers/${id}?tenantId=${TENANT_ID}`),
    listTags: (id: string) =>
      req<Tag[]>(`/api/v1/customers/${id}/tags?tenantId=${TENANT_ID}`),
    timeline: (id: string, opts?: { limit?: number; offset?: number }) => {
      const qs = [
        `tenantId=${TENANT_ID}`,
        opts?.limit ? `limit=${opts.limit}` : '',
        opts?.offset ? `offset=${opts.offset}` : '',
      ]
        .filter(Boolean)
        .join('&');
      return req<{ events: TimelineEvent[]; total: number }>(
        `/api/v1/customers/${id}/timeline?${qs}`,
      );
    },
    update: (
      id: string,
      body: {
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
    ) =>
      req<Customer>(`/api/v1/customers/${id}?tenantId=${TENANT_ID}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    updateCustomFields: (id: string, patch: Record<string, unknown>) =>
      req<{ ok: boolean; customFields: Record<string, unknown> }>(
        `/api/v1/customers/${id}/custom-fields?tenantId=${TENANT_ID}`,
        { method: 'PATCH', body: JSON.stringify(patch) },
      ),
    exportCsvUrl: () =>
      `${BASE}/api/v1/customers/export/csv?tenantId=${TENANT_ID}`,
    importCsv: (csv: string) =>
      req<{ imported: number; updated: number; tagsCreated: number; errors: string[] }>(
        `/api/v1/customers/import/csv?tenantId=${TENANT_ID}`,
        { method: 'POST', body: JSON.stringify({ csv }) },
      ),
  },
  tags: {
    list: (category?: string) => {
      const cat = category ? `&category=${category}` : '';
      return req<Tag[]>(`/api/v1/tags?tenantId=${TENANT_ID}${cat}`);
    },
    create: (body: { name: string; color?: string; category?: string }) =>
      req<Tag>(`/api/v1/tags?tenantId=${TENANT_ID}`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    update: (id: string, body: { name?: string; color?: string; category?: string }) =>
      req<{ ok: boolean }>(`/api/v1/tags/${id}?tenantId=${TENANT_ID}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      req<{ ok: boolean }>(`/api/v1/tags/${id}?tenantId=${TENANT_ID}`, { method: 'DELETE' }),
    assign: (tagId: string, customerId: string) =>
      req<{ ok: boolean }>(
        `/api/v1/tags/${tagId}/assign/${customerId}?tenantId=${TENANT_ID}`,
        { method: 'POST' },
      ),
    unassign: (tagId: string, customerId: string) =>
      req<{ ok: boolean }>(
        `/api/v1/tags/${tagId}/assign/${customerId}?tenantId=${TENANT_ID}`,
        { method: 'DELETE' },
      ),
  },
  coupons: {
    list: (locationId?: string) => {
      const loc = locationId ? `&locationId=${locationId}` : '';
      return req<Coupon[]>(`/api/v1/coupons?tenantId=${TENANT_ID}${loc}`);
    },
    generateCode: () =>
      req<{ code: string }>(`/api/v1/coupons/generate-code?tenantId=${TENANT_ID}`, { method: 'POST' }),
    create: (
      body: {
        name: string;
        code: string;
        discountType: 'percent' | 'fixed';
        discountValue: number;
        description?: string;
        expiresAt?: string;
        maxUses?: number;
      },
      locationId?: string,
    ) => {
      const loc = locationId ? `&locationId=${locationId}` : '';
      return req<Coupon>(`/api/v1/coupons?tenantId=${TENANT_ID}${loc}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    update: (
      id: string,
      body: {
        name?: string;
        code?: string;
        discountType?: 'percent' | 'fixed';
        discountValue?: number;
        description?: string;
        expiresAt?: string | null;
        maxUses?: number | null;
      },
    ) =>
      req<Coupon>(`/api/v1/coupons/${id}?tenantId=${TENANT_ID}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    toggle: (id: string, isActive: boolean) =>
      req<Coupon>(`/api/v1/coupons/${id}/toggle?tenantId=${TENANT_ID}`, {
        method: 'POST',
        body: JSON.stringify({ isActive }),
      }),
    remove: (id: string) =>
      req<{ ok: boolean }>(`/api/v1/coupons/${id}?tenantId=${TENANT_ID}`, { method: 'DELETE' }),
  },
  greetings: {
    list: (locationId?: string) => {
      const loc = locationId ? `&locationId=${locationId}` : '';
      return req<Greeting[]>(`/api/v1/greetings?tenantId=${TENANT_ID}${loc}`);
    },
    create: (
      body: { type: string; name: string; messages: Array<Record<string, unknown>>; isActive?: boolean },
      locationId?: string,
    ) => {
      const loc = locationId ? `&locationId=${locationId}` : '';
      return req<Greeting>(`/api/v1/greetings?tenantId=${TENANT_ID}${loc}`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    update: (
      id: string,
      body: { name?: string; messages?: Array<Record<string, unknown>>; isActive?: boolean },
    ) =>
      req<Greeting>(`/api/v1/greetings/${id}?tenantId=${TENANT_ID}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    remove: (id: string) =>
      req<{ success: boolean }>(`/api/v1/greetings/${id}?tenantId=${TENANT_ID}`, { method: 'DELETE' }),
  },
};

export type Broadcast = {
  id: string;
  tenantId: string;
  locationId: string | null;
  type: 'all' | 'segment' | 'scheduled';
  segmentId: string | null;
  title: string | null;
  contentPreview: string | null;
  messageType: string | null;
  recipientCount: number;
  sentAt: string | null;
  scheduledAt: string | null;
  status: 'sent' | 'scheduled' | 'cancelled' | 'failed';
  autoTagOnResponse: string | null;
  createdAt: string;
  // 開封 / クリック集計 — v0.1 では未集計のため通常 null or 0、Phase 2 で本実装
  openCount?: number | null;
  clickCount?: number | null;
};

export type MessageTemplate = {
  id: string;
  tenantId: string;
  locationId: string | null;
  name: string;
  content: string;
  category: string | null;
  messageType: string;
  messageData: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type Customer = {
  id: string;
  tenantId: string;
  lineAccountId: string | null;
  lineUserId: string | null;
  name: string | null;
  displayName: string | null;
  pictureUrl: string | null;
  statusMessage: string | null;
  language: string | null;
  phone: string | null;
  email: string | null;
  birthday: string | null;
  notes: string | null;
  preferredLocationId: string | null;
  isFollowing: boolean;
  score: number;
  customFields: Record<string, unknown>;
  acquisitionSource: string | null;
  chatStatus: string;
  engagementTier: string;
  followedAt: string | null;
  unfollowedAt: string | null;
  profileSyncedAt: string | null;
  lastInteractionAt: string | null;
  lastReadAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Tag = {
  id: string;
  tenantId: string;
  category: string | null;
  name: string;
  color: string | null;
  createdAt: string;
};

export type CustomerWithTags = Customer & { tags: Tag[] };

export type TimelineEvent = {
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

export type Coupon = {
  id: string;
  tenantId: string;
  locationId: string | null;
  name: string;
  code: string;
  discountType: string;
  discountValue: number;
  description: string | null;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Greeting = {
  id: string;
  tenantId: string;
  locationId: string | null;
  type: string;
  name: string;
  messages: Array<Record<string, unknown>>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
