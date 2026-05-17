'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Check,
  X,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  api,
  type CustomerWithTags,
  type Tag,
  type Location,
  TENANT_ID,
} from '@/lib/api';

const CATEGORIES: { id: string; label: string; defaultColor: string }[] = [
  { id: 'treatment', label: '施術タイプ', defaultColor: '#f58fb8' },
  { id: 'status', label: '顧客ステータス', defaultColor: '#a78bfa' },
  { id: 'segment', label: '客層', defaultColor: '#94a3b8' },
];

const CHAT_STATUS_LABEL: Record<string, string> = {
  unread: '未読',
  replied: '返信済',
  pending: '保留',
};

const TIER_LABEL: Record<string, string> = {
  new: '新規',
  active: '活発',
  sleeping: '休眠',
  unknown: '—',
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerWithTags[] | null>(null);
  const [tagsAll, setTagsAll] = useState<Tag[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [tagsExpanded, setTagsExpanded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [cs, ts, locs] = await Promise.all([
        api.customers.list({ search: search || undefined }),
        api.tags.list(),
        api.locations.list(),
      ]);
      setCustomers(cs);
      setTagsAll(ts);
      setLocations(locs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setCustomers([]);
    }
  }, [search]);

  useEffect(() => {
    if (TENANT_ID) refresh();
  }, [refresh]);

  if (!TENANT_ID) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ink-500">
        NEXT_PUBLIC_TENANT_ID が未設定です (.env.local を確認してください)
      </div>
    );
  }

  const tagsByCategory = useMemo(() => {
    const map = new Map<string, Tag[]>();
    for (const t of tagsAll) {
      const key = t.category ?? 'その他';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tagsAll]);

  return (
    <div className="space-y-4 px-6 py-5">
      <TagManager
        tagsAll={tagsAll}
        tagsByCategory={tagsByCategory}
        expanded={tagsExpanded}
        onToggleExpanded={() => setTagsExpanded((v) => !v)}
        onRefresh={refresh}
        onError={setError}
      />

      <Card
        title={`顧客一覧 (${customers?.length ?? 0})`}
        right={
          <div className="flex items-center gap-1.5 rounded-full border border-ink-100 bg-surface-0 px-3 py-1">
            <Search size={11} strokeWidth={1.75} className="text-ink-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="名前 / phone / email で検索"
              className="w-56 bg-transparent text-[11px] outline-none"
            />
          </div>
        }
      >
        {customers === null ? (
          <Spinner />
        ) : customers.length === 0 ? (
          <Empty Icon={Users} label="顧客がまだいません" />
        ) : (
          <table className="w-full text-[12px]">
            <thead className="text-[10px] text-ink-500">
              <tr className="border-b border-ink-100">
                <th className="py-2 text-left font-medium">名前</th>
                <th className="py-2 text-left font-medium">連絡先</th>
                <th className="py-2 text-left font-medium">タグ</th>
                <th className="py-2 text-left font-medium">対応</th>
                <th className="py-2 text-left font-medium">活性度</th>
                <th className="py-2 text-right font-medium numeric">スコア</th>
                <th className="py-2 text-left font-medium">拠点</th>
                <th className="py-2 text-left font-medium">登録</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-ink-100/70 transition-colors last:border-0 hover:bg-surface-50"
                >
                  <td className="py-2.5 align-top">
                    <p className="font-semibold text-ink-900">{c.name || c.displayName || '（無名）'}</p>
                    {c.displayName && c.name && (
                      <p className="text-[10px] text-ink-500">{c.displayName}</p>
                    )}
                  </td>
                  <td className="py-2.5 align-top text-ink-700">
                    <p>{c.phone || '—'}</p>
                    {c.email && <p className="text-[10px] text-ink-500">{c.email}</p>}
                  </td>
                  <td className="py-2.5 align-top">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.length === 0 ? (
                        <span className="text-[10px] text-ink-400">—</span>
                      ) : (
                        c.tags.map((t) => <TagBadge key={t.id} tag={t} />)
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 align-top">
                    <ChatStatusBadge status={c.chatStatus} />
                  </td>
                  <td className="py-2.5 align-top">
                    <TierBadge tier={c.engagementTier} />
                  </td>
                  <td className="py-2.5 numeric align-top text-ink-700">{c.score}</td>
                  <td className="py-2.5 align-top text-ink-500">
                    {c.preferredLocationId
                      ? locations.find((l) => l.id === c.preferredLocationId)?.name ?? '—'
                      : '—'}
                  </td>
                  <td className="py-2.5 align-top text-[10px] text-ink-500">
                    {formatDate(c.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {error && <ErrorToast text={error} onClose={() => setError(null)} />}
    </div>
  );
}

function TagManager({
  tagsAll,
  tagsByCategory,
  expanded,
  onToggleExpanded,
  onRefresh,
  onError,
}: {
  tagsAll: Tag[];
  tagsByCategory: Map<string, Tag[]>;
  expanded: boolean;
  onToggleExpanded: () => void;
  onRefresh: () => void;
  onError: (e: string) => void;
}) {
  const [creatingCategory, setCreatingCategory] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const onCreate = async (category: string, defaultColor: string) => {
    if (!newName.trim()) return;
    try {
      await api.tags.create({ name: newName.trim(), category, color: defaultColor });
      setNewName('');
      setCreatingCategory(null);
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  };

  const onDelete = async (tag: Tag) => {
    if (!confirm(`タグ「${tag.name}」を削除しますか? (顧客への割当も解除されます)`)) return;
    try {
      await api.tags.remove(tag.id);
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Card
      title={`タグ管理 (${tagsAll.length})`}
      right={
        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex items-center gap-0.5 rounded-full border border-ink-100 px-2.5 py-1 text-[10px] font-medium text-ink-700 hover:bg-surface-50"
        >
          {expanded ? (
            <>
              <ChevronUp size={11} strokeWidth={2} />
              折りたたむ
            </>
          ) : (
            <>
              <ChevronDown size={11} strokeWidth={2} />
              開く
            </>
          )}
        </button>
      }
    >
      {!expanded ? null : (
        <div className="space-y-3">
          {CATEGORIES.map(({ id, label, defaultColor }) => {
            const list = tagsByCategory.get(id) ?? [];
            const isCreating = creatingCategory === id;
            return (
              <div key={id} className="rounded-xl border border-ink-100 bg-surface-50 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-ink-700">
                    {label} ({list.length})
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatingCategory(id);
                      setNewName('');
                    }}
                    className="flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium text-ink-700 hover:bg-surface-100"
                  >
                    <Plus size={10} strokeWidth={2} />
                    追加
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((t) => (
                    <div
                      key={t.id}
                      className="group flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium"
                      style={{ background: `${t.color ?? defaultColor}22`, color: t.color ?? defaultColor }}
                    >
                      {t.name}
                      <button
                        type="button"
                        onClick={() => onDelete(t)}
                        className="opacity-0 transition-opacity hover:opacity-100 group-hover:opacity-60"
                        aria-label="削除"
                      >
                        <Trash2 size={10} strokeWidth={2} />
                      </button>
                    </div>
                  ))}
                  {isCreating ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') onCreate(id, defaultColor);
                          if (e.key === 'Escape') {
                            setCreatingCategory(null);
                            setNewName('');
                          }
                        }}
                        placeholder="新しいタグ"
                        className="rounded-full border border-ink-100 bg-surface-0 px-2 py-1 text-[11px] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => onCreate(id, defaultColor)}
                        className="rounded-full p-1 text-emerald-600 hover:bg-emerald-50"
                        aria-label="確定"
                      >
                        <Check size={11} strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCreatingCategory(null);
                          setNewName('');
                        }}
                        className="rounded-full p-1 text-ink-400 hover:bg-surface-100"
                        aria-label="キャンセル"
                      >
                        <X size={11} strokeWidth={2} />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function TagBadge({ tag }: { tag: Tag }) {
  const color = tag.color ?? '#94a3b8';
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
      style={{ background: `${color}22`, color }}
    >
      {tag.name}
    </span>
  );
}

function ChatStatusBadge({ status }: { status: string }) {
  const label = CHAT_STATUS_LABEL[status] ?? status;
  const color =
    status === 'unread' ? '#ef4444' : status === 'replied' ? '#10b981' : '#f59e0b';
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
      style={{ background: `${color}1a`, color }}
    >
      {label}
    </span>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const label = TIER_LABEL[tier] ?? tier;
  if (tier === 'unknown') return <span className="text-[10px] text-ink-400">{label}</span>;
  const color =
    tier === 'new' ? '#06b6d4' : tier === 'active' ? '#10b981' : '#94a3b8';
  return (
    <span
      className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
      style={{ background: `${color}1a`, color }}
    >
      {label}
    </span>
  );
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
    <section className="rounded-2xl border border-ink-100 bg-surface-0 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-ink-900">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Spinner() {
  return (
    <div className="flex h-32 items-center justify-center text-[11px] text-ink-300">
      読み込み中…
    </div>
  );
}

function Empty({ Icon, label }: { Icon: typeof Users; label: string }) {
  return (
    <div className="flex h-32 flex-col items-center justify-center text-ink-300">
      <Icon size={24} strokeWidth={1.5} />
      <p className="mt-1.5 text-[11px]">{label}</p>
    </div>
  );
}

function ErrorToast({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700 shadow-lg">
      <span>{text}</span>
      <button onClick={onClose} aria-label="閉じる" className="text-red-400 hover:text-red-700">
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
