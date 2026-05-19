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

export type RichMenuAreaAction =
  | { type: 'message'; text: string }
  | { type: 'uri'; uri: string; label?: string }
  | { type: 'postback'; data: string; label?: string; displayText?: string };

export type RichMenuArea = {
  bounds: { x: number; y: number; width: number; height: number };
  action: RichMenuAreaAction;
  label?: string;
};

export type RichMenuSize = { width: number; height: number };

export type RichMenu = {
  id: string;
  tenantId: string;
  locationId: string | null;
  lineAccountId: string;
  lineRichMenuId: string | null;
  name: string;
  chatBarText: string | null;
  size: RichMenuSize | null;
  areas: RichMenuArea[] | null;
  imageUrl: string | null;
  isDefault: boolean;
  isActive: boolean;
  groupId: string | null;
  tabIndex: number | null;
  lineAliasId: string | null;
  createdAt: string;
};

export type LineAccount = {
  id: string;
  tenantId: string;
  channelId: string;
};

export const richMenusApi = {
  list: async (locationId?: string) => {
    const params = new URLSearchParams({ tenantId: TENANT_ID });
    if (locationId) params.set('locationId', locationId);
    return req<RichMenu[]>(`/api/v1/rich-menus?${params.toString()}`);
  },
  create: async (data: {
    lineAccountId: string;
    name: string;
    chatBarText?: string;
    areas?: RichMenuArea[];
    size?: RichMenuSize;
    locationId?: string;
  }) =>
    req<RichMenu>(`/api/v1/rich-menus?tenantId=${TENANT_ID}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: async (
    id: string,
    data: {
      name?: string;
      chatBarText?: string;
      areas?: RichMenuArea[];
      size?: RichMenuSize;
    },
  ) =>
    req<RichMenu>(`/api/v1/rich-menus/${id}?tenantId=${TENANT_ID}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: async (id: string) =>
    req<{ ok: true }>(`/api/v1/rich-menus/${id}?tenantId=${TENANT_ID}`, {
      method: 'DELETE',
    }),
  setDefault: async (id: string) =>
    req<{ ok: true }>(`/api/v1/rich-menus/${id}/default?tenantId=${TENANT_ID}`, {
      method: 'POST',
    }),
  uploadImage: async (id: string, file: File) => {
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(
      `${BASE}/api/v1/rich-menus/${id}/image?tenantId=${TENANT_ID}`,
      { method: 'POST', body: form },
    );
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`${res.status} ${text}`);
    }
    return res.json() as Promise<{ ok: true }>;
  },
};

export const lineAccountsApi = {
  list: async () =>
    req<LineAccount[]>(`/api/v1/line-accounts?tenantId=${TENANT_ID}`),
};

export type RichMenuPreset = {
  presetId: string;
  name: string;
  description: string;
  chatBarText: string;
  size: RichMenuSize;
  areas: RichMenuArea[];
};

// ============== Forms ==============

export type FormFieldType =
  | 'short_text'
  | 'long_text'
  | 'single_choice'
  | 'multi_choice'
  | 'date'
  | 'image';

export type FormField = {
  id: string;
  type: FormFieldType;
  label: string;
  required: boolean;
  helperText?: string;
  placeholder?: string;
  options?: string[];
  showIf?: {
    fieldId: string;
    mode?: 'equals' | 'answered' | 'empty';
    equals?: string | string[];
  };
};

export type Form = {
  id: string;
  tenantId: string;
  locationId: string | null;
  name: string;
  slug: string;
  category: string | null;
  description: string | null;
  fields: FormField[];
  autoTagIds: string[];
  thankYouMessage: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type FormResponse = {
  id: string;
  formId: string;
  customerId: string | null;
  lineUserId: string | null;
  answers: Record<string, string | string[]>;
  submittedAt: string;
};

export const formsApi = {
  list: async (locationId?: string) => {
    const params = new URLSearchParams({ tenantId: TENANT_ID });
    if (locationId) params.set('locationId', locationId);
    return req<Form[]>(`/api/v1/forms?${params.toString()}`);
  },
  get: async (id: string) =>
    req<Form>(`/api/v1/forms/${id}?tenantId=${TENANT_ID}`),
  create: async (data: {
    name: string;
    slug: string;
    category?: string;
    description?: string;
    locationId?: string;
    fields?: FormField[];
    autoTagIds?: string[];
    thankYouMessage?: string;
    isPublished?: boolean;
  }) =>
    req<Form>(`/api/v1/forms?tenantId=${TENANT_ID}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: async (id: string, data: Partial<Form>) =>
    req<Form>(`/api/v1/forms/${id}?tenantId=${TENANT_ID}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: async (id: string) =>
    req<{ ok: true }>(`/api/v1/forms/${id}?tenantId=${TENANT_ID}`, {
      method: 'DELETE',
    }),
  listResponses: async (id: string) =>
    req<FormResponse[]>(`/api/v1/forms/${id}/responses?tenantId=${TENANT_ID}`),
  // 公開ページ用 (認証不要)
  getPublic: async (slug: string) =>
    req<Form>(`/api/v1/forms/public/${slug}`),
  submitPublic: async (
    slug: string,
    data: {
      customerId?: string;
      lineUserId?: string;
      answers: Record<string, string | string[]>;
    },
  ) =>
    req<{ responseId: string; thankYouMessage: string | null }>(
      `/api/v1/forms/public/${slug}/submit`,
      { method: 'POST', body: JSON.stringify(data) },
    ),
  uploadImage: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('image', file);
    const res = await fetch(`${BASE}/api/v1/forms/upload-image?tenantId=${TENANT_ID}`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`${res.status} ${text}`);
    }
    const { url } = (await res.json()) as { url: string };
    return url;
  },
};

export type FormPreset = {
  presetId: string;
  category: string;
  name: string;
  description: string;
  fields: FormField[];
};

// 業種テンプレ 6 種 — 業界実例ベース (出典: LINEビューティープラス / リザービア / Beaute-P / ai-bouz 等)
// サロン名・拠点名 hardcode せず汎用文面、placeholder + helperText 付き
function f(
  id: string,
  type: FormFieldType,
  label: string,
  required = false,
  extra: { options?: string[]; placeholder?: string; helperText?: string } = {},
): FormField {
  const base: FormField = { id, type, label, required };
  if (extra.options) base.options = extra.options;
  if (extra.placeholder) base.placeholder = extra.placeholder;
  if (extra.helperText) base.helperText = extra.helperText;
  return base;
}

export const FORM_PRESETS: FormPreset[] = [
  {
    presetId: 'hair-salon',
    category: 'hair_salon',
    name: '美容室向け カウンセリング',
    description: 'カット / カラー / パーマ サロン向け 6 項目',
    fields: [
      f('name', 'short_text', 'お名前', true, { placeholder: '例: 山田 花子' }),
      f('motivation', 'long_text', '今回の来店理由・なりたいイメージ', false, {
        placeholder: '例: 伸びたので整えたい / 髪色を明るくしたい / 結婚式に向けてイメチェン',
        helperText: '「ふんわり」などの曖昧表現より、雰囲気が伝わると提案精度が上がります',
      }),
      f('hair_concern', 'multi_choice', '髪の悩み', false, {
        options: ['くせ毛', 'ボリューム不足', '白髪', 'ダメージ', 'カラー退色', '広がり', '頭皮のかゆみ', 'その他'],
      }),
      f('color_allergy', 'single_choice', 'カラー・パーマでかぶれた経験', true, {
        options: ['ない', 'ある', '不明'],
      }),
      f('allergy_detail', 'long_text', 'かぶれた経験の詳細', false, {
        placeholder: '例: 〇〇というカラー剤で頭皮が赤くなった / かゆみが 1 週間続いた',
        helperText: '「ある」と回答した方のみご記入ください',
      }),
      f('reference_image', 'image', '理想のヘアスタイル写真 (任意)', false, {
        helperText: 'なりたい雰囲気が伝わる写真を 1〜3 枚。SNS のスクリーンショットも OK',
      }),
    ],
  },
  {
    presetId: 'nail',
    category: 'nail',
    name: 'ネイル向け カウンセリング',
    description: 'ネイルサロン向け 5 項目',
    fields: [
      f('name', 'short_text', 'お名前', true, { placeholder: '例: 山田 花子' }),
      f('nail_status', 'single_choice', '現在の爪の状態', true, {
        options: ['自爪', 'ジェル装着中 (オフ希望)', 'スカルプ装着中 (オフ希望)', 'その他'],
      }),
      f('design_image', 'image', '希望デザイン画像 (任意)', false, {
        helperText: 'SNS で見つけたサンプルなど 1〜5 枚。配色・パーツの優先順位が伝わります',
      }),
      f('allergy', 'long_text', 'アレルギー・過去のトラブル', false, {
        placeholder: '例: 特定の素材でかぶれた / グリーンネイルになったことがある',
      }),
      f('preference', 'multi_choice', 'デザインの雰囲気 (複数選択可)', false, {
        options: ['シンプル', '上品・大人', '可愛い', 'ガーリー', '個性的', 'ブライダル', 'オフィス向け'],
      }),
    ],
  },
  {
    presetId: 'esthetic',
    category: 'esthetic',
    name: 'エステ向け カウンセリング',
    description: 'フェイシャル / 痩身 エステ向け 6 項目',
    fields: [
      f('name', 'short_text', 'お名前', true, { placeholder: '例: 山田 花子' }),
      f('skin_type', 'single_choice', '肌質', false, {
        options: ['乾燥肌', '脂性肌', '混合肌', '敏感肌', '普通肌', '不明'],
      }),
      f('concern', 'multi_choice', '気になる悩み・部位', false, {
        options: ['しわ', 'たるみ', '毛穴', 'シミ', 'くすみ', 'ニキビ', 'むくみ', 'セルライト', 'その他'],
      }),
      f('concern_image', 'image', '気になる部位の写真 (任意)', false, {
        helperText: '明るい場所・自然光・ノーメイクで撮影してください',
      }),
      f('medical_history', 'long_text', '既往歴・現在の服薬', false, {
        placeholder: '例: 高血圧で服薬中 / アトピー性皮膚炎',
      }),
      f('pregnancy', 'single_choice', '妊娠・授乳の有無', true, {
        options: ['該当なし', '妊娠中', '授乳中'],
      }),
    ],
  },
  {
    presetId: 'eyelash',
    category: 'eyelash',
    name: 'マツエク向け カウンセリング',
    description: 'まつげエクステ サロン向け 5 項目',
    fields: [
      f('name', 'short_text', 'お名前', true, { placeholder: '例: 山田 花子' }),
      f('lash_status', 'single_choice', '自まつげの状態', false, {
        options: ['健康', '抜けやすい', '短い', '量が少ない', '不明'],
      }),
      f('preference', 'long_text', '希望カール・長さ・太さ・雰囲気', false, {
        placeholder: '例: Jカール / 11mm / 0.15 / ナチュラル目に / ゴージャスに',
      }),
      f('design_image', 'image', '希望デザイン画像 (任意)', false, {
        helperText: 'SNS で見かけた写真を 1〜3 枚。雰囲気 (ナチュラル / ゴージャス / キュート) も併せて',
      }),
      f('contact_use', 'single_choice', 'コンタクト使用', true, {
        options: ['使用なし', 'ハードコンタクト', 'ソフトコンタクト'],
      }),
    ],
  },
  {
    presetId: 'hair-removal',
    category: 'hair_removal',
    name: '脱毛向け カウンセリング',
    description: '脱毛サロン向け 5 項目',
    fields: [
      f('name', 'short_text', 'お名前', true, { placeholder: '例: 山田 花子' }),
      f('skin_type', 'single_choice', '肌質', false, {
        options: ['通常', '敏感肌', 'アトピー', '色素沈着あり', '不明'],
      }),
      f('medical_history', 'long_text', '既往歴・現在の服薬', false, {
        placeholder: '例: 光過敏症 / イソトレチノイン服用中 / 妊娠中',
      }),
      f('areas', 'multi_choice', '希望部位', true, {
        options: ['顔', 'うで', 'わき', '足', 'VIO', '背中', 'うなじ', '全身'],
      }),
      f('skin_trouble_image', 'image', '気になる肌トラブル箇所の写真 (任意)', false, {
        helperText: '埋没毛・色素沈着・ニキビなどがある部位の写真。施術可否の判断に使用します',
      }),
    ],
  },
  {
    presetId: 'chiro',
    category: 'chiro',
    name: '整体 / 整骨向け カウンセリング',
    description: '整体・整骨院向け 5 項目',
    fields: [
      f('name', 'short_text', 'お名前', true, { placeholder: '例: 山田 花子' }),
      f('chief_complaint', 'long_text', '主訴 (いつから・どこが・どんな痛みか)', true, {
        placeholder: '例: 1 ヶ月前から右肩に重い痛み / 朝起きた時に首が回らない',
      }),
      f('medical_history', 'long_text', '既往歴・通院歴', false, {
        placeholder: '例: 5 年前にぎっくり腰 / 整形外科で頚椎ヘルニア診断',
      }),
      f('accident', 'single_choice', '事故・怪我との関連', false, {
        options: ['なし', '交通事故', 'スポーツ外傷', '転倒', 'その他'],
      }),
      f('pain_image', 'image', '痛む箇所の写真 (任意)', false, {
        helperText: '腫れ・あざ・変色など視覚的に分かる症状があれば',
      }),
    ],
  },
];

export const RICH_MENU_PRESETS: RichMenuPreset[] = [
  {
    presetId: 'classic-6',
    name: '定番 6 ボタン',
    description: '通常営業用の標準セット (予約 / クーポン / メニュー / 店舗 / カード / SNS)',
    chatBarText: 'メニュー',
    size: { width: 2500, height: 1686 },
    areas: [
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: 'uri', uri: '', label: '予約する' },
        label: '予約する',
      },
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: { type: 'message', text: 'クーポンを見たい' },
        label: 'クーポン',
      },
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: 'message', text: 'メニューを教えて' },
        label: 'メニュー・料金',
      },
      {
        bounds: { x: 0, y: 843, width: 833, height: 843 },
        action: { type: 'message', text: '店舗情報を教えて' },
        label: '店舗・アクセス',
      },
      {
        bounds: { x: 833, y: 843, width: 834, height: 843 },
        action: { type: 'message', text: 'スタンプを見せて' },
        label: 'ショップカード',
      },
      {
        bounds: { x: 1667, y: 843, width: 833, height: 843 },
        action: { type: 'uri', uri: '', label: 'SNS' },
        label: 'SNS',
      },
    ],
  },
  {
    presetId: 'campaign',
    name: 'キャンペーン用',
    description: '季節キャンペーン期間用 (左半分大 + 右上下小)',
    chatBarText: 'キャンペーン中',
    size: { width: 2500, height: 1686 },
    areas: [
      {
        bounds: { x: 0, y: 0, width: 1250, height: 1686 },
        action: { type: 'message', text: 'キャンペーンを教えて' },
        label: 'キャンペーン詳細',
      },
      {
        bounds: { x: 1250, y: 0, width: 1250, height: 843 },
        action: { type: 'uri', uri: '', label: '予約する' },
        label: '予約する',
      },
      {
        bounds: { x: 1250, y: 843, width: 1250, height: 843 },
        action: { type: 'message', text: 'クーポンを見たい' },
        label: 'クーポン',
      },
    ],
  },
];
