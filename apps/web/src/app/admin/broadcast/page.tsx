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
  MessageSquare,
  Layers,
  HelpCircle,
  GalleryHorizontal,
  X,
} from 'lucide-react';
import {
  api,
  type Broadcast,
  type Greeting,
  type MessageTemplate,
  TENANT_ID,
} from '@/lib/api';
import { BroadcastDetailDrawer } from './BroadcastDetailDrawer';
import { LinePreview, templateToLineMessages, type MessageDataInput } from '@/components/line-preview';

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

type MessageTypeKind = 'text' | 'buttons' | 'confirm' | 'carousel';

type ActionInput = {
  type: 'message' | 'uri' | 'postback';
  label: string;
  text?: string;
  uri?: string;
  data?: string;
};

type CarouselColumnInput = {
  thumbnailImageUrl?: string;
  title?: string;
  text: string;
  actions: ActionInput[];
};

type TemplateMessageData = {
  title?: string;
  text?: string;
  thumbnailImageUrl?: string;
  actions?: ActionInput[];
  columns?: CarouselColumnInput[];
};

type TemplateDraft = {
  name: string;
  content: string;
  category: string;
  messageType: MessageTypeKind;
  messageData: TemplateMessageData;
};

const emptyDraft = (): TemplateDraft => ({
  name: '',
  content: '',
  category: '',
  messageType: 'text',
  messageData: {},
});

const defaultActionForType: Record<'message' | 'uri' | 'postback', ActionInput> = {
  message: { type: 'message', label: '', text: '' },
  uri: { type: 'uri', label: '', uri: 'https://' },
  postback: { type: 'postback', label: '', data: '' },
};

const initialMessageDataFor = (type: MessageTypeKind): TemplateMessageData => {
  if (type === 'buttons') return { actions: [{ type: 'message', label: '', text: '' }] };
  if (type === 'confirm') {
    return {
      actions: [
        { type: 'message', label: 'はい', text: 'はい' },
        { type: 'message', label: 'いいえ', text: 'いいえ' },
      ],
    };
  }
  if (type === 'carousel') {
    return {
      columns: [
        {
          text: '',
          actions: [{ type: 'message', label: '', text: '' }],
        },
      ],
    };
  }
  return {};
};

function TemplatesTab({ onError }: { onError: (e: string) => void }) {
  const [items, setItems] = useState<MessageTemplate[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<TemplateDraft>(emptyDraft);

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

  const onSelectExisting = (t: MessageTemplate) => {
    setSelectedId(t.id);
    const type = (t.messageType as MessageTypeKind) || 'text';
    setDraft({
      name: t.name,
      content: t.content,
      category: t.category ?? '',
      messageType: type,
      messageData: (t.messageData as TemplateMessageData) ?? initialMessageDataFor(type),
    });
  };

  const onStartNew = () => {
    setSelectedId('new');
    setDraft(emptyDraft());
  };

  const buildPayload = () => {
    const messageData = draft.messageType === 'text' ? null : (draft.messageData as Record<string, unknown>);
    return {
      name: draft.name,
      content: draft.content,
      category: draft.category || undefined,
      messageType: draft.messageType,
      messageData,
    };
  };

  const onCreate = async () => {
    if (!draft.name.trim() || !draft.content.trim()) return;
    try {
      await api.templates.create(buildPayload());
      setDraft(emptyDraft());
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
      const payload = buildPayload();
      await api.templates.update(selectedId, {
        name: payload.name,
        content: payload.content,
        messageType: payload.messageType,
        messageData: payload.messageData,
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
      setDraft(emptyDraft());
      refresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    }
  };

  const onChangeType = (type: MessageTypeKind) => {
    if (type === draft.messageType) return;
    setDraft({ ...draft, messageType: type, messageData: initialMessageDataFor(type) });
  };

  const updateMessageData = (patch: Partial<TemplateMessageData>) => {
    setDraft({ ...draft, messageData: { ...draft.messageData, ...patch } });
  };

  const isEditing = selectedId !== null && selectedId !== 'new';
  const isNew = selectedId === 'new';

  const previewMessages =
    selectedId === null
      ? []
      : templateToLineMessages(
          draft.messageType,
          draft.content || draft.name || '本文を入力するとここに表示されます',
          draft.messageData as MessageDataInput,
        );

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
                    <MessageTypeBadge type={(t.messageType as MessageTypeKind) || 'text'} />
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
          <div className="space-y-3">
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

            <Field label="メッセージタイプ">
              <MessageTypeSelector value={draft.messageType} onChange={onChangeType} />
            </Field>

            <Field label="本文 (プレビュー・通知用)">
              <textarea
                rows={draft.messageType === 'text' ? 6 : 3}
                value={draft.content}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                placeholder={
                  draft.messageType === 'text'
                    ? '送信されるメッセージ本文を入力'
                    : 'バブル本文 / 通知に表示されるテキスト'
                }
                className="w-full resize-none rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-sm outline-none"
              />
            </Field>

            {draft.messageType === 'buttons' && (
              <ButtonsEditor data={draft.messageData} onChange={updateMessageData} />
            )}
            {draft.messageType === 'confirm' && (
              <ConfirmEditor data={draft.messageData} onChange={updateMessageData} />
            )}
            {draft.messageType === 'carousel' && (
              <CarouselEditor data={draft.messageData} onChange={updateMessageData} />
            )}

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setDraft(emptyDraft());
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
          </div>
        )}
      </Card>

      {/* 右: LinePreview (4 タイプ全対応) */}
      <Card title="プレビュー">
        <LinePreview messages={previewMessages} botName="LinQ for Beauty" />
      </Card>
    </div>
  );
}

function MessageTypeBadge({ type }: { type: MessageTypeKind }) {
  if (type === 'text') return null;
  const label = type === 'buttons' ? 'BTN' : type === 'confirm' ? 'CFM' : 'CRSL';
  return (
    <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
      {label}
    </span>
  );
}

function MessageTypeSelector({
  value,
  onChange,
}: {
  value: MessageTypeKind;
  onChange: (type: MessageTypeKind) => void;
}) {
  const types: { id: MessageTypeKind; label: string; Icon: typeof MessageSquare }[] = [
    { id: 'text', label: 'テキスト', Icon: MessageSquare },
    { id: 'buttons', label: 'ボタン', Icon: Layers },
    { id: 'confirm', label: '確認', Icon: HelpCircle },
    { id: 'carousel', label: 'カルーセル', Icon: GalleryHorizontal },
  ];
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {types.map(({ id, label, Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className="flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-medium transition-colors"
            style={{
              borderColor: active ? 'var(--line-green)' : 'var(--ink-100)',
              background: active ? '#e8f6ee' : 'var(--surface-0)',
              color: active ? '#0a8d48' : 'var(--ink-700)',
            }}
          >
            <Icon size={14} strokeWidth={1.75} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ButtonsEditor({
  data,
  onChange,
}: {
  data: TemplateMessageData;
  onChange: (patch: Partial<TemplateMessageData>) => void;
}) {
  const actions = data.actions ?? [];
  const updateActions = (next: ActionInput[]) => onChange({ actions: next });
  return (
    <div className="space-y-2 rounded-xl border border-ink-100 bg-surface-50 p-3">
      <Field label="タイトル (任意、最大 40 文字)">
        <input
          value={data.title ?? ''}
          onChange={(e) => onChange({ title: e.target.value })}
          maxLength={40}
          className="w-full rounded-lg border border-ink-100 bg-surface-0 px-3 py-1.5 text-sm outline-none"
        />
      </Field>
      <Field label="画像 URL (任意)">
        <input
          type="url"
          value={data.thumbnailImageUrl ?? ''}
          onChange={(e) => onChange({ thumbnailImageUrl: e.target.value })}
          placeholder="https://example.com/image.jpg"
          className="w-full rounded-lg border border-ink-100 bg-surface-0 px-3 py-1.5 text-sm outline-none"
        />
      </Field>
      <ActionsEditor
        actions={actions}
        onChange={updateActions}
        max={4}
        labelText="アクション (1〜4 個)"
      />
    </div>
  );
}

function ConfirmEditor({
  data,
  onChange,
}: {
  data: TemplateMessageData;
  onChange: (patch: Partial<TemplateMessageData>) => void;
}) {
  const actions = data.actions ?? [
    { type: 'message', label: 'はい', text: 'はい' },
    { type: 'message', label: 'いいえ', text: 'いいえ' },
  ];
  return (
    <div className="space-y-2 rounded-xl border border-ink-100 bg-surface-50 p-3">
      <p className="text-[11px] text-ink-500">
        確認ダイアログには必ず 2 つのアクションを設定します。
      </p>
      <ActionsEditor
        actions={actions}
        onChange={(next) => onChange({ actions: next.slice(0, 2) })}
        max={2}
        min={2}
        labelText="アクション (2 個固定)"
      />
    </div>
  );
}

function CarouselEditor({
  data,
  onChange,
}: {
  data: TemplateMessageData;
  onChange: (patch: Partial<TemplateMessageData>) => void;
}) {
  const columns = data.columns ?? [];
  const updateColumns = (next: CarouselColumnInput[]) => onChange({ columns: next });
  const addColumn = () => {
    if (columns.length >= 10) return;
    updateColumns([
      ...columns,
      { text: '', actions: [{ type: 'message', label: '', text: '' }] },
    ]);
  };
  return (
    <div className="space-y-2 rounded-xl border border-ink-100 bg-surface-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium text-ink-700">列 ({columns.length} / 10)</p>
        <button
          type="button"
          onClick={addColumn}
          disabled={columns.length >= 10}
          className="flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--line-green)' }}
        >
          <Plus size={10} strokeWidth={2.5} />
          列を追加
        </button>
      </div>
      <div className="space-y-2">
        {columns.map((col, i) => (
          <div key={i} className="rounded-lg border border-ink-100 bg-surface-0 p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-ink-700">列 {i + 1}</span>
              <button
                type="button"
                onClick={() => updateColumns(columns.filter((_, j) => j !== i))}
                disabled={columns.length <= 1}
                className="rounded-full p-1 text-red-400 hover:bg-red-50 hover:text-red-700 disabled:opacity-30"
                aria-label="列削除"
              >
                <Trash2 size={11} strokeWidth={1.75} />
              </button>
            </div>
            <div className="space-y-1.5">
              <input
                type="url"
                value={col.thumbnailImageUrl ?? ''}
                onChange={(e) =>
                  updateColumns(
                    columns.map((c, j) =>
                      j === i ? { ...c, thumbnailImageUrl: e.target.value } : c,
                    ),
                  )
                }
                placeholder="画像 URL (任意)"
                className="w-full rounded-lg border border-ink-100 bg-surface-0 px-2.5 py-1.5 text-[12px] outline-none"
              />
              <input
                value={col.title ?? ''}
                onChange={(e) =>
                  updateColumns(
                    columns.map((c, j) => (j === i ? { ...c, title: e.target.value } : c)),
                  )
                }
                placeholder="タイトル (任意)"
                maxLength={40}
                className="w-full rounded-lg border border-ink-100 bg-surface-0 px-2.5 py-1.5 text-[12px] outline-none"
              />
              <textarea
                rows={2}
                value={col.text}
                onChange={(e) =>
                  updateColumns(
                    columns.map((c, j) => (j === i ? { ...c, text: e.target.value } : c)),
                  )
                }
                placeholder="本文 (必須、60 文字程度)"
                maxLength={60}
                className="w-full resize-none rounded-lg border border-ink-100 bg-surface-0 px-2.5 py-1.5 text-[12px] outline-none"
              />
              <ActionsEditor
                actions={col.actions}
                onChange={(next) =>
                  updateColumns(
                    columns.map((c, j) => (j === i ? { ...c, actions: next } : c)),
                  )
                }
                max={3}
                labelText="アクション (1〜3 個)"
                compact
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionsEditor({
  actions,
  onChange,
  max,
  min = 1,
  labelText,
  compact = false,
}: {
  actions: ActionInput[];
  onChange: (next: ActionInput[]) => void;
  max: number;
  min?: number;
  labelText: string;
  compact?: boolean;
}) {
  const addAction = () => {
    if (actions.length >= max) return;
    onChange([...actions, { ...defaultActionForType.message }]);
  };
  const removeAction = (i: number) => {
    if (actions.length <= min) return;
    onChange(actions.filter((_, j) => j !== i));
  };
  const updateAction = (i: number, patch: Partial<ActionInput>) => {
    onChange(
      actions.map((a, j) => {
        if (j !== i) return a;
        if (patch.type && patch.type !== a.type) {
          return { ...defaultActionForType[patch.type], label: a.label };
        }
        return { ...a, ...patch };
      }),
    );
  };
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className={compact ? 'text-[10px] font-medium text-ink-500' : 'text-[11px] font-medium text-ink-700'}>
          {labelText}
        </span>
        {max > min && (
          <button
            type="button"
            onClick={addAction}
            disabled={actions.length >= max}
            className="flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium text-ink-700 hover:bg-surface-100 disabled:opacity-30"
          >
            <Plus size={10} strokeWidth={2} />
            追加
          </button>
        )}
      </div>
      <div className="space-y-1.5">
        {actions.map((a, i) => (
          <div key={i} className="rounded-lg border border-ink-100 bg-surface-0 p-2">
            <div className="flex items-center gap-1.5">
              <select
                value={a.type}
                onChange={(e) => updateAction(i, { type: e.target.value as ActionInput['type'] })}
                className="rounded-md border border-ink-100 bg-surface-0 px-1.5 py-1 text-[11px] outline-none"
              >
                <option value="message">メッセージ</option>
                <option value="uri">URL</option>
                <option value="postback">postback</option>
              </select>
              <input
                value={a.label}
                onChange={(e) => updateAction(i, { label: e.target.value })}
                placeholder="ボタンラベル (20 文字以内)"
                maxLength={20}
                className="flex-1 rounded-md border border-ink-100 bg-surface-0 px-2 py-1 text-[11px] outline-none"
              />
              {actions.length > min && (
                <button
                  type="button"
                  onClick={() => removeAction(i)}
                  aria-label="アクション削除"
                  className="rounded-full p-1 text-red-400 hover:bg-red-50 hover:text-red-700"
                >
                  <X size={10} strokeWidth={2} />
                </button>
              )}
            </div>
            <div className="mt-1.5">
              {a.type === 'message' && (
                <input
                  value={a.text ?? ''}
                  onChange={(e) => updateAction(i, { text: e.target.value })}
                  placeholder="送信されるテキスト"
                  className="w-full rounded-md border border-ink-100 bg-surface-0 px-2 py-1 text-[11px] outline-none"
                />
              )}
              {a.type === 'uri' && (
                <input
                  type="url"
                  value={a.uri ?? ''}
                  onChange={(e) => updateAction(i, { uri: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full rounded-md border border-ink-100 bg-surface-0 px-2 py-1 text-[11px] outline-none"
                />
              )}
              {a.type === 'postback' && (
                <input
                  value={a.data ?? ''}
                  onChange={(e) => updateAction(i, { data: e.target.value })}
                  placeholder="postback data (例: action=reserve)"
                  className="w-full rounded-md border border-ink-100 bg-surface-0 px-2 py-1 text-[11px] outline-none"
                />
              )}
            </div>
          </div>
        ))}
      </div>
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
