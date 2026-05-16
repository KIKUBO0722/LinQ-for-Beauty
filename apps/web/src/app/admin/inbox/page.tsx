'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  UserRound,
  Sparkles,
  Loader2,
  Inbox as InboxIcon,
  Heart,
} from 'lucide-react';
import { api, type MessageThread, type Message, TENANT_ID } from '@/lib/api';
import { CustomerDetailDrawer, threadToSummary, type CustomerSummary } from './CustomerDetailDrawer';

// 「お気に入り」は v0.1 では localStorage 永続化、Phase 2 で customers.isFavorite 列に移行
const filters = ['すべて', '未対応', '返信待ち', 'お気に入り'] as const;
type Filter = (typeof filters)[number];

const FAVORITES_STORAGE_KEY = 'linq-beauty:inbox-favorites';

function loadFavorites(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.filter((x): x is string => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function saveFavorites(s: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(s)));
  } catch {
    // ignore quota / privacy mode errors
  }
}

export default function InboxPage() {
  const [threads, setThreads] = useState<MessageThread[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [convLoading, setConvLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<Filter>('すべて');
  const [drawerCustomer, setDrawerCustomer] = useState<CustomerSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  const toggleFavorite = useCallback((customerId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      saveFavorites(next);
      return next;
    });
  }, []);

  const refreshThreads = useCallback(async () => {
    try {
      const data = await api.messages.threads();
      setThreads(data);
      if (data.length > 0 && !selectedId) setSelectedId(data[0].customerId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setThreads([]);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!TENANT_ID) {
      setThreads([]);
      setError('NEXT_PUBLIC_TENANT_ID が未設定です (.env を確認してください)');
      return;
    }
    refreshThreads();
  }, [refreshThreads]);

  const selectedThread = useMemo(
    () => threads?.find((t) => t.customerId === selectedId) ?? null,
    [threads, selectedId],
  );

  useEffect(() => {
    if (!selectedId) {
      setConversation([]);
      return;
    }
    let cancelled = false;
    setConvLoading(true);
    api.messages
      .conversation(selectedId)
      .then((data) => {
        if (cancelled) return;
        setConversation(data.slice().reverse());
        // mark as read
        api.messages.markAsRead(selectedId).then(refreshThreads).catch(() => {});
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!cancelled) setConvLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, refreshThreads]);

  const filteredThreads = useMemo(() => {
    if (!threads) return [];
    if (filter === '未対応') return threads.filter((t) => t.unreadCount > 0);
    if (filter === '返信待ち')
      return threads.filter((t) => t.lastMessageDirection === 'inbound');
    if (filter === 'お気に入り') return threads.filter((t) => favorites.has(t.customerId));
    return threads;
  }, [threads, filter, favorites]);

  const onSend = async () => {
    if (!selectedId || !draft.trim() || sending) return;
    setSending(true);
    try {
      const sent = await api.messages.send(selectedId, draft.trim());
      setConversation((prev) => [...prev, sent]);
      setDraft('');
      refreshThreads();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid h-full grid-cols-[300px_1fr] overflow-hidden">
      <ListPane
        threads={filteredThreads}
        loading={threads === null}
        filter={filter}
        onFilter={setFilter}
        selectedId={selectedId}
        onSelect={setSelectedId}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
      />
      <ChatPane
        thread={selectedThread}
        conversation={conversation}
        loading={convLoading}
        draft={draft}
        setDraft={setDraft}
        onSend={onSend}
        sending={sending}
        onOpenDetail={() =>
          selectedThread && setDrawerCustomer(threadToSummary(selectedThread))
        }
      />
      <CustomerDetailDrawer
        customer={drawerCustomer}
        onClose={() => setDrawerCustomer(null)}
      />
      {error && <ErrorToast text={error} onClose={() => setError(null)} />}
    </div>
  );
}

function ListPane({
  threads,
  loading,
  filter,
  onFilter,
  selectedId,
  onSelect,
  favorites,
  onToggleFavorite,
}: {
  threads: MessageThread[];
  loading: boolean;
  filter: Filter;
  onFilter: (f: Filter) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  favorites: Set<string>;
  onToggleFavorite: (customerId: string) => void;
}) {
  const [burstingId, setBurstingId] = useState<string | null>(null);
  return (
    <aside className="flex h-full flex-col border-r border-ink-100 bg-surface-0">
      <div className="px-4 pt-4">
        <h2 className="text-sm font-semibold text-ink-900">対応リスト</h2>
        <div className="mt-3 flex gap-1 text-xs">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFilter(f)}
              className={
                f === filter
                  ? 'rounded-full px-2.5 py-1 font-medium text-white'
                  : 'rounded-full bg-surface-100 px-2.5 py-1 text-ink-500 hover:text-ink-900'
              }
              style={f === filter ? { background: 'var(--line-green)' } : undefined}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 flex-1 overflow-y-auto px-2 pb-3">
        {loading ? (
          <div className="flex h-full items-center justify-center text-ink-300">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : threads.length === 0 ? (
          <EmptyList />
        ) : (
          <ul>
            {threads.map((t) => {
              const lastText = previewText(t.lastMessage);
              const isActive = t.customerId === selectedId;
              const isFavorite = favorites.has(t.customerId);
              return (
                <li key={t.customerId}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(t.customerId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect(t.customerId);
                      }
                    }}
                    className="flex w-full cursor-pointer items-start gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-50"
                    style={isActive ? { background: '#e8f6ee' } : undefined}
                  >
                    <Avatar initial={t.customerName?.charAt(0) ?? '?'} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {t.customerName ?? '名前未登録'}
                        </p>
                        {t.unreadCount > 0 && (
                          <span
                            className="inline-block h-2 w-2 shrink-0 rounded-full"
                            style={{ background: 'var(--line-green)' }}
                          />
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-ink-500">{lastText}</p>
                      {t.unreadCount > 0 && (
                        <span
                          className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px]"
                          style={{ background: '#dff5e6', color: '#1d7a3a' }}
                        >
                          未読 {t.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
                      <span className="text-[10px] text-ink-300">
                        {formatTime(t.lastMessageAt)}
                      </span>
                      <button
                        type="button"
                        aria-label={isFavorite ? 'お気に入り解除' : 'お気に入りに追加'}
                        onClick={(e) => {
                          e.stopPropagation();
                          const wasFavorite = isFavorite;
                          onToggleFavorite(t.customerId);
                          // 登録時のみバースト発火 (解除時は静かに)
                          if (!wasFavorite) {
                            setBurstingId(t.customerId);
                            window.setTimeout(() => {
                              setBurstingId((cur) => (cur === t.customerId ? null : cur));
                            }, 450);
                          }
                        }}
                        className="relative rounded-full p-0.5 transition-transform hover:scale-110"
                      >
                        <Heart
                          size={14}
                          strokeWidth={1.75}
                          fill={isFavorite ? '#f58fb8' : 'none'}
                          color={isFavorite ? '#f58fb8' : '#a8a8a8'}
                        />
                        {burstingId === t.customerId && (
                          <span className="heart-burst" aria-hidden>
                            {[0, 72, 144, 216, 288].map((deg) => (
                              <span
                                key={deg}
                                className="heart-burst-line"
                                style={{ ['--burst-deg' as string]: `${deg}deg` }}
                              />
                            ))}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="border-t border-ink-100 px-4 py-3 text-xs text-ink-500">
        {threads.length > 0 ? (
          <>
            未読: <span className="numeric text-ink-900">
              {threads.reduce((s, t) => s + t.unreadCount, 0)}
            </span>{' '}
            / 全 <span className="numeric">{threads.length}</span> 件
          </>
        ) : (
          '会話なし'
        )}
      </div>
    </aside>
  );
}

function ChatPane({
  thread,
  conversation,
  loading,
  draft,
  setDraft,
  onSend,
  sending,
  onOpenDetail,
}: {
  thread: MessageThread | null;
  conversation: Message[];
  loading: boolean;
  draft: string;
  setDraft: (s: string) => void;
  onSend: () => void;
  sending: boolean;
  onOpenDetail: () => void;
}) {
  if (!thread) {
    return (
      <section className="flex h-full flex-col items-center justify-center bg-surface-50 text-ink-300">
        <InboxIcon size={32} strokeWidth={1.5} />
        <p className="mt-2 text-sm">会話を選択してください</p>
      </section>
    );
  }
  return (
    <section className="flex h-full flex-col bg-surface-50">
      <header className="flex h-12 items-center justify-between border-b border-ink-100 bg-surface-0 px-5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink-900">
            {thread.customerName ?? '名前未登録'}
          </h3>
          {thread.unreadCount > 0 && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px]"
              style={{ background: '#dff5e6', color: '#1d7a3a' }}
            >
              新着 {thread.unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-ink-500">
          <button
            type="button"
            onClick={onOpenDetail}
            className="flex items-center gap-1 rounded-full border border-ink-100 px-3 py-1 hover:text-ink-900"
          >
            <UserRound size={12} strokeWidth={1.75} />
            顧客詳細
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-ink-300">
            <Loader2 size={18} className="animate-spin" />
          </div>
        ) : conversation.length === 0 ? (
          <div className="flex h-full items-center justify-center text-ink-300">
            <p className="text-sm">まだメッセージがありません</p>
          </div>
        ) : (
          conversation.map((m) => (
            <Bubble key={m.id} message={m} customerInitial={thread.customerName?.charAt(0) ?? '?'} />
          ))
        )}
      </div>

      <div className="border-t border-ink-100 bg-surface-0 px-5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-ink-100 px-3 py-2">
            <Paperclip size={15} className="text-ink-300" strokeWidth={1.75} />
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder="メッセージを入力…"
              className="flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-300"
            />
            <Smile size={15} className="text-ink-300" strokeWidth={1.75} />
          </div>
          <button
            type="button"
            onClick={onSend}
            disabled={!draft.trim() || sending}
            className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--line-green)' }}
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} strokeWidth={2} />}
            送信
          </button>
        </div>
      </div>
    </section>
  );
}

function Bubble({ message, customerInitial }: { message: Message; customerInitial: string }) {
  const text = bubbleText(message);
  const time = formatTime(message.createdAt);
  if (message.direction === 'inbound') {
    return (
      <div className="flex items-end gap-2">
        <Avatar initial={customerInitial} />
        <div className="max-w-[70%]">
          <div
            className="whitespace-pre-line rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm text-ink-900"
            style={{ background: '#dff5e6' }}
          >
            {text}
          </div>
          <p className="mt-1 text-[10px] text-ink-300">{time}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-end justify-end gap-2">
      <div className="max-w-[70%]">
        {message.sendType === 'broadcast' && (
          <p
            className="mb-1 flex items-center justify-end gap-1 text-[10px]"
            style={{ color: '#b89aec' }}
          >
            <Sparkles size={11} strokeWidth={2} /> 一斉配信
          </p>
        )}
        <div className="whitespace-pre-line rounded-2xl rounded-br-sm border border-ink-100 bg-surface-0 px-3.5 py-2.5 text-sm text-ink-900">
          {text}
        </div>
        <p className="mt-1 text-right text-[10px] text-ink-300">{time}</p>
      </div>
    </div>
  );
}

function Avatar({ initial }: { initial: string }) {
  return (
    <span
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
      style={{ background: '#dff5e6', color: '#1d7a3a' }}
    >
      {initial}
    </span>
  );
}

function EmptyList() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center text-ink-300">
      <InboxIcon size={28} strokeWidth={1.5} />
      <p className="mt-2 text-xs">まだ会話がありません</p>
      <p className="mt-1 text-[10px]">LINE 連携後にここに表示されます</p>
    </div>
  );
}

function ErrorToast({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-lg">
      <p className="text-xs text-red-700">{text}</p>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 text-red-400 hover:text-red-700"
        aria-label="閉じる"
      >
        ×
      </button>
    </div>
  );
}

function previewText(content: MessageThread['lastMessage']): string {
  if (!content) return '—';
  if (typeof content === 'object' && content && 'type' in content) {
    if (content.type === 'text' && 'text' in content && typeof content.text === 'string') {
      return content.text;
    }
    if (content.type === 'image') return '[画像]';
    if (content.type === 'video') return '[動画]';
    if (content.type === 'audio') return '[音声]';
    if (content.type === 'flex') return '[Flex メッセージ]';
    return `[${content.type}]`;
  }
  return '—';
}

function bubbleText(m: Message): string {
  const c = m.content;
  if (c && typeof c === 'object' && 'type' in c) {
    if (c.type === 'text' && 'text' in c && typeof c.text === 'string') return c.text;
    if (c.type === 'image') return '[画像]';
    if (c.type === 'video') return '[動画]';
    if (c.type === 'audio') return '[音声]';
    if (c.type === 'flex') return '[Flex メッセージ]';
    return `[${c.type}]`;
  }
  return '';
}

function formatTime(s: string | null): string {
  if (!s) return '';
  try {
    const d = new Date(s);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return '昨日';
    return d.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
  } catch {
    return '';
  }
}
