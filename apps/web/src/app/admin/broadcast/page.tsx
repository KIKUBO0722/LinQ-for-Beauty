'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Send,
  Smartphone,
  Loader2,
  Calendar,
  Plus,
  Trash2,
  Check,
  Megaphone,
  FileText,
  Hand,
} from 'lucide-react';
import {
  api,
  type Broadcast,
  type Greeting,
  type MessageTemplate,
  TENANT_ID,
} from '@/lib/api';
import { BroadcastDetailDrawer } from './BroadcastDetailDrawer';

type SubTab = '新規配信' | '過去配信' | 'テンプレ' | 'あいさつ';
const subTabs: SubTab[] = ['新規配信', '過去配信', 'テンプレ', 'あいさつ'];

export default function BroadcastPage() {
  const [tab, setTab] = useState<SubTab>('新規配信');
  const [error, setError] = useState<string | null>(null);

  if (!TENANT_ID) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-ink-500">
        NEXT_PUBLIC_TENANT_ID が未設定です (.env.local を確認してください)
      </div>
    );
  }

  return (
    <div className="px-6 py-5">
      <div className="mb-4 flex items-center gap-1 text-sm">
        {subTabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              tab === t
                ? 'rounded-full px-3 py-1.5 font-medium text-white'
                : 'rounded-full px-3 py-1.5 text-ink-500 hover:text-ink-900'
            }
            style={tab === t ? { background: 'var(--line-green)' } : undefined}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === '新規配信' && <NewBroadcastTab onError={setError} />}
      {tab === '過去配信' && <BroadcastsListTab onError={setError} />}
      {tab === 'テンプレ' && <TemplatesTab onError={setError} />}
      {tab === 'あいさつ' && <GreetingsTab onError={setError} />}

      {error && <ErrorToast text={error} onClose={() => setError(null)} />}
    </div>
  );
}

function NewBroadcastTab({ onError }: { onError: (e: string) => void }) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setSuccess(null);
    try {
      const scheduled = scheduledAt.trim();
      const isScheduled = scheduled && new Date(scheduled).getTime() > Date.now();
      const created = await api.broadcasts.create({
        type: isScheduled ? 'scheduled' : 'all',
        title: title || undefined,
        text,
        messageType: 'text',
        scheduledAt: isScheduled ? new Date(scheduled).toISOString() : undefined,
      });
      setSuccess(
        isScheduled
          ? `予約しました (${formatDateTime(created.scheduledAt)})`
          : '送信しました',
      );
      setTitle('');
      setText('');
      setScheduledAt('');
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-[1fr_360px] gap-4">
      <div className="space-y-4">
        <Card title="配信設定">
          <Field label="配信名">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="(空白なら自動)"
              className="w-full rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-sm text-ink-900 outline-none"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="配信日時 (空欄なら即時)">
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-sm text-ink-900 outline-none"
              />
            </Field>
            <Field label="配信先 (Phase 2 でセグメント)">
              <input
                disabled
                value="全友だち (v0.1)"
                className="w-full rounded-xl border border-ink-100 bg-surface-50 px-3 py-2 text-sm text-ink-400 outline-none"
              />
            </Field>
          </div>
        </Card>

        <Card title="メッセージ本文">
          <Field label="本文">
            <textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="メッセージ本文を入力…"
              className="w-full resize-none rounded-xl border border-ink-100 bg-surface-0 px-3 py-2.5 text-sm text-ink-900 outline-none"
            />
          </Field>
          <p className="mt-2 text-xs text-ink-500">
            <span className="numeric">{text.length}</span> / 500 文字
          </p>
        </Card>

        <div className="flex justify-end gap-2">
          {success && (
            <span className="rounded-full bg-green-50 px-3 py-2 text-xs text-green-700">
              {success}
            </span>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={!text.trim() || submitting}
            className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--line-green)' }}
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : scheduledAt ? (
              <Calendar size={14} strokeWidth={2} />
            ) : (
              <Send size={14} strokeWidth={2} />
            )}
            {scheduledAt ? '配信を予約' : '今すぐ送信'}
          </button>
        </div>
      </div>

      <Card
        title="LINE プレビュー"
        right={
          <span className="flex items-center gap-1 text-[10px] text-ink-500">
            <Smartphone size={11} strokeWidth={1.75} />
            送信前の見え方
          </span>
        }
      >
        <PhoneMockup text={text || 'メッセージ本文を入力するとここに表示されます'} />
      </Card>
    </div>
  );
}

function BroadcastsListTab({ onError }: { onError: (e: string) => void }) {
  const [items, setItems] = useState<Broadcast[] | null>(null);
  const [selected, setSelected] = useState<Broadcast | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.broadcasts.list();
      setItems(data);
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
      setItems([]);
    }
  }, [onError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (items === null) {
    return <Spinner />;
  }

  if (items.length === 0) {
    return (
      <Card title="過去配信">
        <Empty Icon={Megaphone} label="まだ配信がありません" />
      </Card>
    );
  }

  return (
    <Card title="過去配信" right={<span className="text-[10px] text-ink-500">{items.length} 件</span>}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
            <th className="py-2 font-medium">状態</th>
            <th className="py-2 font-medium">タイトル</th>
            <th className="py-2 font-medium">送信日時</th>
            <th className="py-2 font-medium">予約日時</th>
            <th className="py-2 font-medium">到達</th>
            <th className="py-2 font-medium">開封</th>
            <th className="py-2 font-medium">クリック</th>
          </tr>
        </thead>
        <tbody>
          {items.map((b) => (
            <tr
              key={b.id}
              onClick={() => setSelected(b)}
              className="cursor-pointer border-b border-ink-100/70 transition-colors last:border-0 hover:bg-surface-50"
            >
              <td className="py-2.5">
                <StatusBadge status={b.status} />
              </td>
              <td className="py-2.5 text-ink-900">{b.title ?? '(無題)'}</td>
              <td className="py-2.5 text-ink-500">{formatDateTime(b.sentAt)}</td>
              <td className="py-2.5 text-ink-500">{formatDateTime(b.scheduledAt)}</td>
              <td className="py-2.5 numeric text-ink-700">{b.recipientCount}</td>
              <td className="py-2.5 numeric text-ink-700">{formatStat(b.openCount)}</td>
              <td className="py-2.5 numeric text-ink-700">{formatStat(b.clickCount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <BroadcastDetailDrawer
        broadcast={selected}
        onClose={() => setSelected(null)}
        onCancelled={refresh}
      />
    </Card>
  );
}

function TemplatesTab({ onError }: { onError: (e: string) => void }) {
  const [items, setItems] = useState<MessageTemplate[] | null>(null);
  // selectedId: 既存テンプレの id / 'new' (新規モード) / null (未選択)
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<{ name: string; content: string; category: string }>({
    name: '',
    content: '',
    category: '',
  });

  const refresh = useCallback(async () => {
    try {
      setItems(await api.templates.list());
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
      setItems([]);
    }
  }, [onError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // 既存テンプレを選択したら draft にロード
  const onSelectExisting = (t: MessageTemplate) => {
    setSelectedId(t.id);
    setDraft({ name: t.name, content: t.content, category: t.category ?? '' });
  };

  const onStartNew = () => {
    setSelectedId('new');
    setDraft({ name: '', content: '', category: '' });
  };

  const onCreate = async () => {
    if (!draft.name.trim() || !draft.content.trim()) return;
    try {
      await api.templates.create({
        name: draft.name,
        content: draft.content,
        category: draft.category || undefined,
      });
      setDraft({ name: '', content: '', category: '' });
      setSelectedId(null);
      refresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  };

  const onSaveEdit = async () => {
    if (!selectedId || selectedId === 'new') return;
    if (!draft.name.trim() || !draft.content.trim()) return;
    try {
      await api.templates.update(selectedId, {
        name: draft.name,
        content: draft.content,
      });
      refresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  };

  const onRemove = async () => {
    if (!selectedId || selectedId === 'new') return;
    try {
      await api.templates.remove(selectedId);
      setSelectedId(null);
      setDraft({ name: '', content: '', category: '' });
      refresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  };

  const isEditing = selectedId !== null && selectedId !== 'new';
  const isNew = selectedId === 'new';

  return (
    <div className="grid grid-cols-[280px_1fr_280px] gap-4">
      {/* 左: テンプレ一覧 + 新規ボタン */}
      <Card
        title="テンプレ一覧"
        right={
          <button
            type="button"
            onClick={onStartNew}
            className="flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
            style={{ background: 'var(--line-green)' }}
          >
            <Plus size={11} strokeWidth={2.5} />
            新規
          </button>
        }
      >
        {items === null ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty Icon={FileText} label="まだテンプレがありません" />
        ) : (
          <ul className="space-y-1.5">
            {items.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onSelectExisting(t)}
                  className="w-full rounded-xl border px-3 py-2.5 text-left transition-colors hover:bg-surface-50"
                  style={{
                    borderColor: selectedId === t.id ? 'var(--line-green)' : 'var(--ink-100)',
                    background: selectedId === t.id ? '#e8f6ee' : undefined,
                  }}
                >
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                    <span className="truncate">{t.name}</span>
                    {t.category && (
                      <span className="shrink-0 rounded-full bg-surface-100 px-1.5 py-0.5 text-[9px] text-ink-500">
                        {t.category}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-[11px] text-ink-500">
                    {t.content}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 中: 編集フォーム */}
      <Card
        title={isNew ? '新規テンプレ作成' : isEditing ? 'テンプレ編集' : 'テンプレを選択'}
        right={
          isEditing ? (
            <button
              type="button"
              onClick={onRemove}
              aria-label="削除"
              className="rounded-full p-1.5 text-red-400 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 size={13} strokeWidth={1.75} />
            </button>
          ) : null
        }
      >
        {selectedId === null ? (
          <div className="flex h-[340px] flex-col items-center justify-center text-center text-ink-300">
            <FileText size={28} strokeWidth={1.5} />
            <p className="mt-2 text-xs">
              左の一覧からテンプレを選ぶか、
              <br />
              「新規」ボタンで作成してください
            </p>
          </div>
        ) : (
          <>
            <Field label="名前">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="例: 来店前確認"
                className="w-full rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-sm outline-none"
              />
            </Field>
            <Field label="カテゴリ (任意)">
              <input
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                placeholder="例: 予約確認"
                disabled={isEditing}
                className="w-full rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-sm outline-none disabled:bg-surface-100 disabled:text-ink-500"
              />
            </Field>
            <Field label="本文">
              <textarea
                rows={6}
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                className="w-full resize-none rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-sm outline-none"
              />
            </Field>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setDraft({ name: '', content: '', category: '' });
                }}
                className="flex-1 rounded-full border border-ink-100 px-3 py-2 text-sm text-ink-700 hover:bg-surface-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={isNew ? onCreate : onSaveEdit}
                disabled={!draft.name.trim() || !draft.content.trim()}
                className="flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--line-green)' }}
              >
                {isNew ? (
                  <>
                    <Plus size={14} strokeWidth={2} />
                    追加
                  </>
                ) : (
                  <>
                    <Check size={14} strokeWidth={2.5} />
                    保存
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </Card>

      {/* 右: スマホモック (固定、新規配信タブと統一) */}
      <Card title="プレビュー">
        <PhoneMockup text={draft.content || '本文を入力するとここに表示されます'} />
      </Card>
    </div>
  );
}

function GreetingsTab({ onError }: { onError: (e: string) => void }) {
  const [items, setItems] = useState<Greeting[] | null>(null);
  // selectedId: 既存あいさつの id / 'new' (新規モード) / null (未選択)
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<{ type: string; name: string; text: string; isActive: boolean }>({
    type: 'welcome',
    name: '',
    text: '',
    isActive: true,
  });

  const refresh = useCallback(async () => {
    try {
      setItems(await api.greetings.list());
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
      setItems([]);
    }
  }, [onError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const onSelectExisting = (g: Greeting) => {
    setSelectedId(g.id);
    setDraft({
      type: g.type,
      name: g.name,
      text: firstTextFromMessages(g.messages),
      isActive: g.isActive,
    });
  };

  const onStartNew = () => {
    setSelectedId('new');
    setDraft({ type: 'welcome', name: '', text: '', isActive: true });
  };

  const onCreate = async () => {
    if (!draft.name.trim() || !draft.text.trim()) return;
    try {
      await api.greetings.create({
        type: draft.type,
        name: draft.name,
        messages: [{ type: 'text', text: draft.text }],
        isActive: draft.isActive,
      });
      setSelectedId(null);
      setDraft({ type: 'welcome', name: '', text: '', isActive: true });
      refresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  };

  const onSaveEdit = async () => {
    if (!selectedId || selectedId === 'new') return;
    if (!draft.name.trim() || !draft.text.trim()) return;
    try {
      await api.greetings.update(selectedId, {
        name: draft.name,
        messages: [{ type: 'text', text: draft.text }],
        isActive: draft.isActive,
      });
      refresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  };

  const onRemove = async () => {
    if (!selectedId || selectedId === 'new') return;
    try {
      await api.greetings.remove(selectedId);
      setSelectedId(null);
      setDraft({ type: 'welcome', name: '', text: '', isActive: true });
      refresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  };

  const isEditing = selectedId !== null && selectedId !== 'new';
  const isNew = selectedId === 'new';

  return (
    <div className="grid grid-cols-[280px_1fr_280px] gap-4">
      {/* 左: あいさつ一覧 + 新規ボタン */}
      <Card
        title="あいさつ一覧"
        right={
          <button
            type="button"
            onClick={onStartNew}
            className="flex items-center gap-0.5 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white"
            style={{ background: 'var(--line-green)' }}
          >
            <Plus size={11} strokeWidth={2.5} />
            新規
          </button>
        }
      >
        {items === null ? (
          <Spinner />
        ) : items.length === 0 ? (
          <Empty Icon={Hand} label="まだあいさつがありません" />
        ) : (
          <ul className="space-y-1.5">
            {items.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => onSelectExisting(g)}
                  className="w-full rounded-xl border px-3 py-2.5 text-left transition-colors hover:bg-surface-50"
                  style={{
                    borderColor: selectedId === g.id ? 'var(--line-green)' : 'var(--ink-100)',
                    background: selectedId === g.id ? '#e8f6ee' : undefined,
                  }}
                >
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                    <span className="truncate">{g.name}</span>
                    <span
                      className={
                        g.isActive
                          ? 'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold text-white'
                          : 'shrink-0 rounded-full bg-surface-100 px-1.5 py-0.5 text-[9px] text-ink-500'
                      }
                      style={g.isActive ? { background: 'var(--line-green)' } : undefined}
                    >
                      {g.isActive ? 'ON' : 'OFF'}
                    </span>
                  </p>
                  <p className="mt-0.5 flex items-center gap-1">
                    <span className="rounded-full bg-surface-100 px-1.5 py-0.5 text-[9px] text-ink-500">
                      {g.type}
                    </span>
                  </p>
                  <p className="mt-1 line-clamp-2 whitespace-pre-line text-[11px] text-ink-500">
                    {firstTextFromMessages(g.messages)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* 中: 編集フォーム */}
      <Card
        title={isNew ? '新規あいさつ作成' : isEditing ? 'あいさつ編集' : 'あいさつを選択'}
        right={
          isEditing ? (
            <button
              type="button"
              onClick={onRemove}
              aria-label="削除"
              className="rounded-full p-1.5 text-red-400 hover:bg-red-50 hover:text-red-700"
            >
              <Trash2 size={13} strokeWidth={1.75} />
            </button>
          ) : null
        }
      >
        {selectedId === null ? (
          <div className="flex h-[340px] flex-col items-center justify-center text-center text-ink-300">
            <Hand size={28} strokeWidth={1.5} />
            <p className="mt-2 text-xs">
              左の一覧からあいさつを選ぶか、
              <br />
              「新規」ボタンで作成してください
            </p>
          </div>
        ) : (
          <>
            <Field label="タイプ">
              <select
                value={draft.type}
                onChange={(e) => setDraft({ ...draft, type: e.target.value })}
                disabled={isEditing}
                className="w-full rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-sm outline-none disabled:bg-surface-100 disabled:text-ink-500"
              >
                <option value="welcome">welcome (友だち追加時)</option>
                <option value="auto-reply">auto-reply (営業時間外)</option>
                <option value="thanks">thanks (来店お礼)</option>
              </select>
            </Field>
            <Field label="名前">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="例: 友だち追加直後"
                className="w-full rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-sm outline-none"
              />
            </Field>
            <Field label="本文">
              <textarea
                rows={6}
                value={draft.text}
                onChange={(e) => setDraft({ ...draft, text: e.target.value })}
                className="w-full resize-none rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-sm outline-none"
              />
            </Field>
            <Field label="状態">
              <div className="flex gap-1 rounded-lg bg-surface-100 p-1">
                {[true, false].map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setDraft({ ...draft, isActive: v })}
                    className={
                      draft.isActive === v
                        ? 'flex-1 rounded-md py-1 text-xs font-semibold text-white'
                        : 'flex-1 rounded-md py-1 text-xs text-ink-500 hover:text-ink-900'
                    }
                    style={
                      draft.isActive === v
                        ? { background: v ? 'var(--line-green)' : '#a8a8a8' }
                        : undefined
                    }
                  >
                    {v ? 'ON (有効)' : 'OFF (停止中)'}
                  </button>
                ))}
              </div>
            </Field>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setDraft({ type: 'welcome', name: '', text: '', isActive: true });
                }}
                className="flex-1 rounded-full border border-ink-100 px-3 py-2 text-sm text-ink-700 hover:bg-surface-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={isNew ? onCreate : onSaveEdit}
                disabled={!draft.name.trim() || !draft.text.trim()}
                className="flex flex-1 items-center justify-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--line-green)' }}
              >
                {isNew ? (
                  <>
                    <Plus size={14} strokeWidth={2} />
                    追加
                  </>
                ) : (
                  <>
                    <Check size={14} strokeWidth={2.5} />
                    保存
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </Card>

      {/* 右: スマホモック (テンプレと統一) */}
      <Card title="プレビュー">
        <PhoneMockup text={draft.text || '本文を入力するとここに表示されます'} />
      </Card>
    </div>
  );
}

function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-surface-0 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 mt-2 block text-xs text-ink-500">{label}</span>
      {children}
    </label>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-6 text-ink-300">
      <Loader2 size={20} className="animate-spin" />
    </div>
  );
}

function Empty({ Icon, label }: { Icon: typeof Megaphone; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-ink-300">
      <Icon size={28} strokeWidth={1.5} />
      <p className="mt-2 text-xs">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: Broadcast['status'] }) {
  const map: Record<Broadcast['status'], { bg: string; fg: string; label: string }> = {
    sent: { bg: '#e8f6ee', fg: '#1d7a3a', label: '送信済' },
    scheduled: { bg: '#fff4dd', fg: '#9a6700', label: '予約' },
    cancelled: { bg: '#f1f1f4', fg: '#5d5d68', label: 'キャンセル' },
    failed: { bg: '#fdecec', fg: '#c03434', label: '失敗' },
  };
  const s = map[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

function PhoneMockup({ text }: { text: string }) {
  return (
    <div
      className="mx-auto h-[420px] w-[240px] overflow-hidden rounded-[28px] border border-ink-100 bg-surface-0 shadow-sm"
      style={{ outline: '6px solid var(--surface-100)' }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white"
        style={{ background: 'var(--line-green)' }}
      >
        <Smartphone size={12} strokeWidth={1.75} />
        <span>サロン LINE</span>
      </div>
      <div className="space-y-2 px-3 py-3">
        <div
          className="max-w-[80%] whitespace-pre-line rounded-2xl rounded-bl-sm px-3 py-2 text-[11px] text-ink-900"
          style={{ background: '#dff5e6' }}
        >
          {text}
        </div>
      </div>
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

function firstTextFromMessages(messages: Array<Record<string, unknown>>): string {
  const first = messages[0];
  if (!first) return '(本文なし)';
  if (typeof first.text === 'string') return first.text;
  if (typeof first.type === 'string') return `[${first.type}]`;
  return '(複数メッセージ)';
}

function formatDateTime(s: string | null): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return s;
  }
}

// 開封 / クリックは v0.1 では集計未実装 — null or 0 は "—" (ゼロ表示は配信失敗と誤読されるため)
// Phase 2 で本実装後は本物の 0 が表示できなくなる点は許容 (実運用で純 0 はほぼ無い)
function formatStat(n: number | null | undefined): string {
  if (n == null || n === 0) return '—';
  return String(n);
}
