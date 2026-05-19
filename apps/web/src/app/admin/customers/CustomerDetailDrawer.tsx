'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  X,
  Plus,
  Trash2,
  Check,
  Phone,
  Mail,
  Cake,
  MapPin,
  Calendar as CalendarIcon,
  MessageSquare,
  Tag as TagIcon,
  UserPlus,
  UserMinus,
  Save,
  Sparkles,
  Loader2,
  Copy,
} from 'lucide-react';
import {
  api,
  type CustomerWithTags,
  type CustomerAnalysisResult,
  type Tag,
  type TimelineEvent,
  type Location,
} from '@/lib/api';

const CATEGORY_LABEL: Record<string, string> = {
  treatment: '施術',
  status: 'ステータス',
  segment: '客層',
  location: '拠点',
};

const CHAT_STATUS_LABEL: Record<string, string> = {
  unread: '未読',
  replied: '返信済',
  pending: '保留',
};

const TIER_LABEL: Record<string, string> = {
  new: '新規',
  active: '活発',
  warm: '微活発',
  cold: '冷却',
  sleeping: '休眠',
  dormant: '休眠',
  unknown: '—',
};

const SUGGESTED_FIELD_KEYS = [
  '肌質',
  'アレルギー',
  '希望スタイル',
  '過去カラー',
  '担当指名',
  '苦手・NG',
];

type Props = {
  customer: CustomerWithTags | null;
  tagsAll: Tag[];
  locations: Location[];
  onClose: () => void;
  onRefresh: () => void;
  onError: (msg: string | null) => void;
};

export function CustomerDetailDrawer({
  customer,
  tagsAll,
  locations,
  onClose,
  onRefresh,
  onError,
}: Props) {
  const open = customer !== null;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (open) document.body.setAttribute('data-drawer', 'open');
    else document.body.removeAttribute('data-drawer');
    return () => document.body.removeAttribute('data-drawer');
  }, [open]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!customer) return null;

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/30 transition-opacity"
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-[640px] flex-col bg-surface-0 shadow-2xl"
        style={{ transform: 'translateX(0)' }}
      >
        <DrawerHeader customer={customer} onClose={onClose} />
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <ProfileSection customer={customer} locations={locations} />
          <AiAnalysisSection customer={customer} onError={onError} />
          <TagAssigner
            customer={customer}
            tagsAll={tagsAll}
            onRefresh={onRefresh}
            onError={onError}
          />
          <NotesSection customer={customer} onRefresh={onRefresh} onError={onError} />
          <CustomFieldsEditor customer={customer} onRefresh={onRefresh} onError={onError} />
          <TimelineSection customerId={customer.id} />
        </div>
      </aside>
    </>
  );
}

function DrawerHeader({ customer, onClose }: { customer: CustomerWithTags; onClose: () => void }) {
  return (
    <div className="flex items-start justify-between border-b border-ink-100 px-5 py-4">
      <div className="flex items-start gap-3">
        {customer.pictureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={customer.pictureUrl}
            alt=""
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-100 text-[18px] font-bold text-ink-500">
            {(customer.name || customer.displayName || '?').charAt(0)}
          </div>
        )}
        <div>
          <p className="text-[15px] font-semibold text-ink-900">
            {customer.name || customer.displayName || '(無名)'}
          </p>
          {customer.displayName && customer.name && (
            <p className="text-[11px] text-ink-500">LINE: {customer.displayName}</p>
          )}
          <div className="mt-1 flex items-center gap-1.5 text-[10px]">
            <span
              className="rounded-full px-1.5 py-0.5 font-medium"
              style={{
                background:
                  customer.chatStatus === 'unread'
                    ? '#fee2e2'
                    : customer.chatStatus === 'replied'
                      ? '#dcfce7'
                      : '#fef3c7',
                color:
                  customer.chatStatus === 'unread'
                    ? '#ef4444'
                    : customer.chatStatus === 'replied'
                      ? '#10b981'
                      : '#f59e0b',
              }}
            >
              {CHAT_STATUS_LABEL[customer.chatStatus] ?? customer.chatStatus}
            </span>
            <span className="text-ink-500">
              スコア {customer.score} · {TIER_LABEL[customer.engagementTier] ?? customer.engagementTier}
            </span>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="閉じる"
        className="rounded-full p-1.5 text-ink-400 hover:bg-surface-50 hover:text-ink-700"
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  );
}

function ProfileSection({
  customer,
  locations,
}: {
  customer: CustomerWithTags;
  locations: Location[];
}) {
  const locName = customer.preferredLocationId
    ? locations.find((l) => l.id === customer.preferredLocationId)?.name
    : null;
  return (
    <Card title="プロフィール">
      <dl className="grid grid-cols-[80px_1fr] gap-y-1.5 text-[12px]">
        <ProfileRow icon={Phone} label="電話">
          {customer.phone || '—'}
        </ProfileRow>
        <ProfileRow icon={Mail} label="メール">
          {customer.email || '—'}
        </ProfileRow>
        <ProfileRow icon={Cake} label="誕生日">
          {customer.birthday || '—'}
        </ProfileRow>
        <ProfileRow icon={MapPin} label="拠点">
          {locName ?? '—'}
        </ProfileRow>
      </dl>
    </Card>
  );
}

function ProfileRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Phone;
  label: string;
  children: ReactNode;
}) {
  return (
    <>
      <dt className="flex items-center gap-1 text-ink-500">
        <Icon size={11} strokeWidth={1.75} />
        {label}
      </dt>
      <dd className="text-ink-900">{children}</dd>
    </>
  );
}

function TagAssigner({
  customer,
  tagsAll,
  onRefresh,
  onError,
}: {
  customer: CustomerWithTags;
  tagsAll: Tag[];
  onRefresh: () => void;
  onError: (msg: string | null) => void;
}) {
  const [adderOpen, setAdderOpen] = useState(false);
  const assignedIds = useMemo(() => new Set(customer.tags.map((t) => t.id)), [customer.tags]);
  const unassigned = useMemo(
    () => tagsAll.filter((t) => !assignedIds.has(t.id)),
    [tagsAll, assignedIds],
  );

  const onAssign = async (tagId: string) => {
    try {
      await api.tags.assign(tagId, customer.id);
      setAdderOpen(false);
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  };

  const onUnassign = async (tagId: string) => {
    try {
      await api.tags.unassign(tagId, customer.id);
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  };

  const unassignedByCategory = useMemo(() => {
    const map = new Map<string, Tag[]>();
    for (const t of unassigned) {
      const key = t.category ?? 'その他';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [unassigned]);

  return (
    <Card title="タグ">
      <div className="flex flex-wrap items-center gap-1.5">
        {customer.tags.map((t) => {
          const color = t.color ?? '#94a3b8';
          return (
            <span
              key={t.id}
              className="group flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ background: `${color}22`, color }}
            >
              {t.name}
              <button
                type="button"
                onClick={() => onUnassign(t.id)}
                aria-label={`${t.name} を外す`}
                className="opacity-60 hover:opacity-100"
              >
                <X size={9} strokeWidth={2.5} />
              </button>
            </span>
          );
        })}
        {adderOpen ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setAdderOpen(false)}
              className="flex items-center gap-0.5 rounded-full border border-ink-100 px-2 py-0.5 text-[11px] text-ink-500"
            >
              キャンセル
            </button>
            <div className="absolute left-0 top-full z-10 mt-1 w-64 rounded-xl border border-ink-100 bg-surface-0 p-2 shadow-lg">
              {unassigned.length === 0 ? (
                <p className="px-2 py-3 text-center text-[11px] text-ink-400">追加できるタグなし</p>
              ) : (
                [...unassignedByCategory.entries()].map(([cat, list]) => (
                  <div key={cat} className="mb-2 last:mb-0">
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-ink-400">
                      {CATEGORY_LABEL[cat] ?? cat}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {list.map((t) => {
                        const color = t.color ?? '#94a3b8';
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => onAssign(t.id)}
                            className="rounded-full px-2 py-0.5 text-[11px] font-medium hover:opacity-80"
                            style={{ background: `${color}22`, color }}
                          >
                            + {t.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdderOpen(true)}
            className="flex items-center gap-0.5 rounded-full border border-dashed border-ink-300 px-2 py-0.5 text-[11px] font-medium text-ink-500 hover:bg-surface-50"
          >
            <Plus size={10} strokeWidth={2} />
            追加
          </button>
        )}
      </div>
    </Card>
  );
}

function NotesSection({
  customer,
  onRefresh,
  onError,
}: {
  customer: CustomerWithTags;
  onRefresh: () => void;
  onError: (msg: string | null) => void;
}) {
  const [notes, setNotes] = useState(customer.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    setNotes(customer.notes ?? '');
  }, [customer.id, customer.notes]);

  const onSave = async () => {
    if (notes === (customer.notes ?? '')) return;
    setSaving(true);
    try {
      await api.customers.update(customer.id, { notes });
      setSavedAt(Date.now());
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="メモ"
      right={
        <button
          type="button"
          onClick={onSave}
          disabled={saving || notes === (customer.notes ?? '')}
          className="flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--line-green)' }}
        >
          <Save size={10} strokeWidth={2.5} />
          {saving ? '保存中' : '保存'}
        </button>
      }
    >
      <textarea
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="髪質メモ・苦手なこと・好み などを自由に"
        className="w-full resize-none rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-[12px] outline-none"
      />
      {savedAt && (
        <p className="mt-1 text-[10px] text-ink-400">
          {new Date(savedAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} に保存
        </p>
      )}
    </Card>
  );
}

function CustomFieldsEditor({
  customer,
  onRefresh,
  onError,
}: {
  customer: CustomerWithTags;
  onRefresh: () => void;
  onError: (msg: string | null) => void;
}) {
  const existing = (customer.customFields ?? {}) as Record<string, unknown>;
  const [draft, setDraft] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(existing).map(([k, v]) => [k, String(v ?? '')])),
  );
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    const ex = (customer.customFields ?? {}) as Record<string, unknown>;
    setDraft(Object.fromEntries(Object.entries(ex).map(([k, v]) => [k, String(v ?? '')])));
  }, [customer.id, customer.customFields]);

  const onAdd = async () => {
    if (!newKey.trim()) return;
    try {
      await api.customers.updateCustomFields(customer.id, { [newKey.trim()]: newValue });
      setNewKey('');
      setNewValue('');
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  };

  const onUpdate = async (key: string, value: string) => {
    try {
      await api.customers.updateCustomFields(customer.id, { [key]: value });
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  };

  const onRemove = async (key: string) => {
    try {
      await api.customers.updateCustomFields(customer.id, { [key]: null });
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Card title="自由項目 (カスタムフィールド)">
      <div className="space-y-1.5">
        {Object.entries(draft).map(([key, value]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-24 shrink-0 text-[11px] font-medium text-ink-700">{key}</span>
            <input
              value={value}
              onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              onBlur={(e) => {
                if (e.target.value !== String(existing[key] ?? '')) onUpdate(key, e.target.value);
              }}
              className="flex-1 rounded-md border border-ink-100 bg-surface-0 px-2 py-1 text-[12px] outline-none"
            />
            <button
              type="button"
              onClick={() => onRemove(key)}
              aria-label={`${key} を削除`}
              className="rounded-full p-1 text-red-400 hover:bg-red-50"
            >
              <Trash2 size={11} strokeWidth={1.75} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <input
          list="suggested-field-keys"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="新項目名 (例: 肌質)"
          className="w-32 rounded-md border border-ink-100 bg-surface-0 px-2 py-1 text-[11px] outline-none"
        />
        <datalist id="suggested-field-keys">
          {SUGGESTED_FIELD_KEYS.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
        <input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="値"
          className="flex-1 rounded-md border border-ink-100 bg-surface-0 px-2 py-1 text-[11px] outline-none"
        />
        <button
          type="button"
          onClick={onAdd}
          disabled={!newKey.trim()}
          className="flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--line-green)' }}
        >
          <Plus size={10} strokeWidth={2.5} />
          追加
        </button>
      </div>
    </Card>
  );
}

function TimelineSection({ customerId }: { customerId: string }) {
  const [events, setEvents] = useState<TimelineEvent[] | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const LIMIT = 30;

  const load = useCallback(
    async (off: number) => {
      setLoading(true);
      try {
        const res = await api.customers.timeline(customerId, { limit: LIMIT, offset: off });
        setEvents((prev) => (off === 0 ? res.events : [...(prev ?? []), ...res.events]));
        setTotal(res.total);
      } finally {
        setLoading(false);
      }
    },
    [customerId],
  );

  useEffect(() => {
    setOffset(0);
    setEvents(null);
    load(0);
  }, [customerId, load]);

  const canLoadMore = events !== null && events.length < total;

  return (
    <Card title={`活動履歴 (${total})`}>
      {events === null ? (
        <p className="py-4 text-center text-[11px] text-ink-300">読み込み中…</p>
      ) : events.length === 0 ? (
        <p className="py-4 text-center text-[11px] text-ink-300">まだ履歴がありません</p>
      ) : (
        <ul className="space-y-2">
          {events.map((ev) => (
            <TimelineRow key={ev.id} event={ev} />
          ))}
          {canLoadMore && (
            <li>
              <button
                type="button"
                onClick={() => {
                  const next = offset + LIMIT;
                  setOffset(next);
                  load(next);
                }}
                disabled={loading}
                className="w-full rounded-md border border-ink-100 py-1.5 text-[11px] text-ink-700 hover:bg-surface-50 disabled:opacity-50"
              >
                {loading ? '読込中…' : 'さらに読み込む'}
              </button>
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}

function TimelineRow({ event }: { event: TimelineEvent }) {
  const Icon =
    event.type === 'reservation'
      ? CalendarIcon
      : event.type === 'message_received' || event.type === 'message_sent'
        ? MessageSquare
        : event.type === 'tag_added'
          ? TagIcon
          : event.type === 'followed'
            ? UserPlus
            : UserMinus;
  const color =
    event.type === 'reservation'
      ? '#06b6d4'
      : event.type === 'message_received'
        ? '#10b981'
        : event.type === 'message_sent'
          ? '#a78bfa'
          : event.type === 'tag_added'
            ? (event.data.tagColor as string) ?? '#f58fb8'
            : event.type === 'followed'
              ? '#10b981'
              : '#94a3b8';
  return (
    <li className="flex gap-2.5">
      <div
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
        style={{ background: `${color}22`, color }}
      >
        <Icon size={11} strokeWidth={1.75} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-ink-900">{summarize(event)}</p>
        <p className="text-[10px] text-ink-400">{formatDate(event.timestamp)}</p>
      </div>
    </li>
  );
}

function summarize(event: TimelineEvent): string {
  const d = event.data;
  switch (event.type) {
    case 'reservation':
      return `予約: ${d.serviceName ?? 'メニュー未設定'} (${d.locationName ?? '拠点不明'})${d.status ? ` · ${d.status}` : ''}`;
    case 'message_received':
      return `LINE 受信: ${truncate(extractText(d.content), 40)}`;
    case 'message_sent':
      return `LINE 送信: ${truncate(extractText(d.content), 40)}`;
    case 'tag_added':
      return `タグ追加: ${d.tagName}`;
    case 'followed':
      return '友だち追加';
    case 'unfollowed':
      return 'ブロック / 友だち解除';
    default:
      return event.type;
  }
}

function extractText(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  const c = content as Record<string, unknown>;
  return (c.text as string) ?? (c.type as string) ?? '';
}

function truncate(s: string, len: number): string {
  return s.length > len ? s.slice(0, len) + '…' : s;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `今日 ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-ink-100 bg-surface-0 p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-ink-900">{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

const RISK_LABEL: Record<CustomerAnalysisResult['churnRisk'], { label: string; color: string }> = {
  low: { label: '低', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  medium: { label: '中', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  high: { label: '高', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  unknown: { label: '不明', color: 'bg-slate-100 text-slate-600 border-slate-200' },
};

function AiAnalysisSection({
  customer,
  onError,
}: {
  customer: CustomerWithTags;
  onError: (msg: string | null) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CustomerAnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);

  const analyze = async () => {
    setLoading(true);
    setResult(null);
    onError(null);
    try {
      const r = await api.ai.analyzeCustomer(customer.id);
      setResult(r);
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const copySuggested = async () => {
    if (!result?.suggestedMessage) return;
    try {
      await navigator.clipboard.writeText(result.suggestedMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      onError('クリップボードへのコピーに失敗しました');
    }
  };

  return (
    <Card
      title="AI 分析"
      right={
        <button
          type="button"
          onClick={analyze}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-purple-50 px-2 py-1 text-[11px] font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {result ? '再分析' : 'AI で分析'}
        </button>
      }
    >
      {!result && !loading && (
        <p className="text-[11px] text-ink-400">
          来店履歴・タグ・会話履歴から AI が「再来店予測」「離脱リスク」「推奨アクション」「推奨メッセージ」を分析。
        </p>
      )}
      {loading && (
        <div className="flex items-center gap-2 py-3 text-[12px] text-ink-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          AI 分析中…
        </div>
      )}
      {result && (
        <div className="space-y-2 text-[12px]">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-ink-100 bg-surface-50 p-2">
              <div className="text-[10px] text-ink-400">予測再来店日</div>
              <div className="font-medium text-ink-900">{result.predictedNextVisit ?? '不明'}</div>
            </div>
            <div className="rounded-md border border-ink-100 bg-surface-50 p-2">
              <div className="text-[10px] text-ink-400">離脱リスク</div>
              <div className="font-medium">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${RISK_LABEL[result.churnRisk].color}`}
                >
                  {RISK_LABEL[result.churnRisk].label}
                </span>
              </div>
            </div>
          </div>

          {result.recommendedAction && (
            <div className="rounded-md border border-purple-100 bg-purple-50/60 p-2">
              <div className="text-[10px] font-medium text-purple-600">推奨アクション</div>
              <div className="mt-0.5 text-purple-900">{result.recommendedAction}</div>
            </div>
          )}

          {result.suggestedMessage && (
            <div className="rounded-md border border-purple-100 bg-white p-2">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-[10px] font-medium text-purple-600">推奨メッセージ</div>
                <button
                  type="button"
                  onClick={copySuggested}
                  className="inline-flex items-center gap-1 rounded border border-purple-200 px-1.5 py-0.5 text-[10px] text-purple-700 hover:bg-purple-50"
                >
                  <Copy className="h-2.5 w-2.5" />
                  {copied ? 'コピー済' : 'コピー'}
                </button>
              </div>
              <p className="whitespace-pre-wrap leading-relaxed text-ink-700">{result.suggestedMessage}</p>
            </div>
          )}

          {result.reasoning && (
            <details className="text-[11px] text-ink-500">
              <summary className="cursor-pointer">AI の判断根拠を見る</summary>
              <p className="mt-1 rounded-md bg-surface-50 p-2">{result.reasoning}</p>
            </details>
          )}
        </div>
      )}
    </Card>
  );
}
