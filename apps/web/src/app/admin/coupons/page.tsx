'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Ticket,
  Plus,
  Trash2,
  Check,
  Shuffle,
  Calendar as CalendarIcon,
  X,
} from 'lucide-react';
import { api, type Coupon, type Location, TENANT_ID } from '@/lib/api';

type DiscountType = 'percent' | 'fixed';

type CouponDraft = {
  name: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  description: string;
  expiresAt: string;
  maxUses: number | null;
  locationId: string | null;
};

const emptyDraft = (): CouponDraft => ({
  name: '',
  code: '',
  discountType: 'percent',
  discountValue: 10,
  description: '',
  expiresAt: '',
  maxUses: null,
  locationId: null,
});

const toDraft = (c: Coupon): CouponDraft => ({
  name: c.name,
  code: c.code,
  discountType: (c.discountType as DiscountType) ?? 'percent',
  discountValue: c.discountValue,
  description: c.description ?? '',
  expiresAt: c.expiresAt ? toLocalDatetimeInput(c.expiresAt) : '',
  maxUses: c.maxUses,
  locationId: c.locationId,
});

function toLocalDatetimeInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86400_000);
}

export default function CouponsPage() {
  const [items, setItems] = useState<Coupon[] | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null);
  const [draft, setDraft] = useState<CouponDraft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [cs, locs] = await Promise.all([api.coupons.list(), api.locations.list()]);
      setItems(cs);
      setLocations(locs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setItems([]);
    }
  }, []);

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

  const onSelectExisting = (c: Coupon) => {
    setSelectedId(c.id);
    setDraft(toDraft(c));
  };

  const onStartNew = () => {
    setSelectedId('new');
    setDraft(emptyDraft());
  };

  const onGenerateCode = async () => {
    try {
      const { code } = await api.coupons.generateCode();
      setDraft((d) => ({ ...d, code }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const buildPayload = () => ({
    name: draft.name,
    code: draft.code,
    discountType: draft.discountType,
    discountValue: draft.discountValue,
    description: draft.description || undefined,
    expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : undefined,
    maxUses: draft.maxUses ?? undefined,
  });

  const onCreate = async () => {
    if (!draft.name.trim() || !draft.code.trim()) return;
    try {
      await api.coupons.create(buildPayload(), draft.locationId ?? undefined);
      setDraft(emptyDraft());
      setSelectedId(null);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const onSaveEdit = async () => {
    if (!selectedId || selectedId === 'new') return;
    if (!draft.name.trim() || !draft.code.trim()) return;
    try {
      await api.coupons.update(selectedId, {
        name: draft.name,
        code: draft.code,
        discountType: draft.discountType,
        discountValue: draft.discountValue,
        description: draft.description || undefined,
        expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null,
        maxUses: draft.maxUses,
      });
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const onToggle = async (c: Coupon) => {
    try {
      await api.coupons.toggle(c.id, !c.isActive);
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const onRemove = async () => {
    if (!selectedId || selectedId === 'new') return;
    try {
      await api.coupons.remove(selectedId);
      setSelectedId(null);
      setDraft(emptyDraft());
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const isEditing = selectedId !== null && selectedId !== 'new';
  const isNew = selectedId === 'new';

  return (
    <div className="px-6 py-5">
      <div className="grid grid-cols-[280px_1fr_280px] gap-4">
        {/* 左: 一覧 */}
        <Card
          title="クーポン一覧"
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
            <Empty Icon={Ticket} label="まだクーポンがありません" />
          ) : (
            <ul className="space-y-1.5">
              {items.map((c) => {
                const left = daysLeft(c.expiresAt);
                const expired = left !== null && left < 0;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onSelectExisting(c)}
                      className="w-full rounded-xl border px-3 py-2.5 text-left transition-colors hover:bg-surface-50"
                      style={{
                        borderColor: selectedId === c.id ? 'var(--line-green)' : 'var(--ink-100)',
                        background: selectedId === c.id ? '#e8f6ee' : undefined,
                        opacity: c.isActive && !expired ? 1 : 0.55,
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-ink-900">{c.name}</span>
                        <DiscountBadge type={c.discountType} value={c.discountValue} />
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-500">
                        <span className="font-mono">{c.code}</span>
                        {c.expiresAt && (
                          <span>
                            {expired ? '期限切れ' : `残り${left}日`}
                          </span>
                        )}
                        {c.maxUses !== null && (
                          <span>
                            {c.usedCount}/{c.maxUses}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[9px] text-ink-400">
                          {c.locationId
                            ? locations.find((l) => l.id === c.locationId)?.name ?? ''
                            : '全拠点'}
                        </span>
                        <span
                          role="switch"
                          aria-checked={c.isActive}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggle(c);
                          }}
                          className="cursor-pointer text-[10px] font-semibold"
                          style={{ color: c.isActive ? '#0a8d48' : 'var(--ink-400)' }}
                        >
                          {c.isActive ? 'ON' : 'OFF'}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* 中: 編集フォーム */}
        <Card
          title={isNew ? '新規クーポン作成' : isEditing ? 'クーポン編集' : 'クーポンを選択'}
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
            <div className="flex h-[400px] flex-col items-center justify-center text-center text-ink-300">
              <Ticket size={28} strokeWidth={1.5} />
              <p className="mt-2 text-xs">
                左の一覧からクーポンを選ぶか、
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
                  placeholder="例: 春の新規 20% OFF"
                  className="w-full rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-sm outline-none"
                />
              </Field>

              <Field label="コード">
                <div className="flex gap-1.5">
                  <input
                    value={draft.code}
                    onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
                    placeholder="WELCOME20"
                    maxLength={50}
                    className="flex-1 rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 font-mono text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={onGenerateCode}
                    className="flex items-center gap-0.5 rounded-xl border border-ink-100 px-3 py-2 text-[11px] font-medium text-ink-700 hover:bg-surface-50"
                  >
                    <Shuffle size={11} strokeWidth={2} />
                    生成
                  </button>
                </div>
              </Field>

              <Field label="割引タイプ">
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'percent', label: '% OFF' },
                      { id: 'fixed', label: '¥ OFF' },
                    ] as { id: DiscountType; label: string }[]
                  ).map(({ id, label }) => {
                    const active = draft.discountType === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setDraft({ ...draft, discountType: id })}
                        className="rounded-xl border px-3 py-2 text-[12px] font-medium transition-colors"
                        style={{
                          borderColor: active ? 'var(--line-green)' : 'var(--ink-100)',
                          background: active ? '#e8f6ee' : 'var(--surface-0)',
                          color: active ? '#0a8d48' : 'var(--ink-700)',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label={draft.discountType === 'percent' ? '割引率 (%)' : '割引額 (円)'}>
                <input
                  type="number"
                  value={draft.discountValue}
                  onChange={(e) =>
                    setDraft({ ...draft, discountValue: Number(e.target.value) || 0 })
                  }
                  min={0}
                  max={draft.discountType === 'percent' ? 100 : 1000000}
                  className="w-full rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-sm outline-none"
                />
              </Field>

              <Field label="有効期限">
                <input
                  type="datetime-local"
                  value={draft.expiresAt}
                  onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })}
                  className="w-full rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-sm outline-none"
                />
              </Field>

              <Field label="使用上限 (空欄 = 無制限)">
                <input
                  type="number"
                  value={draft.maxUses ?? ''}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      maxUses: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  min={1}
                  placeholder="無制限"
                  className="w-full rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-sm outline-none"
                />
              </Field>

              <Field label="拠点">
                <select
                  value={draft.locationId ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, locationId: e.target.value || null })
                  }
                  className="w-full rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-sm outline-none"
                >
                  <option value="">全拠点共通</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="説明 (任意)">
                <textarea
                  rows={3}
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="顧客に表示される説明文"
                  className="w-full resize-none rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-sm outline-none"
                />
              </Field>

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
                  disabled={!draft.name.trim() || !draft.code.trim()}
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

        {/* 右: クーポンカードプレビュー */}
        <Card title="プレビュー">
          {selectedId === null ? (
            <div className="flex h-[200px] items-center justify-center text-center text-[11px] text-ink-300">
              編集中のクーポンが
              <br />
              ここに表示されます
            </div>
          ) : (
            <CouponPreview draft={draft} />
          )}
        </Card>
      </div>

      {error && <ErrorToast text={error} onClose={() => setError(null)} />}
    </div>
  );
}

function CouponPreview({ draft }: { draft: CouponDraft }) {
  const left = daysLeft(draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null);
  return (
    <div
      className="rounded-2xl border-2 border-dashed p-4 text-center"
      style={{ borderColor: '#f58fb8', background: 'linear-gradient(135deg, #fff5f9 0%, #f4f0ff 100%)' }}
    >
      <p className="text-[10px] font-medium tracking-widest text-ink-500">
        {draft.name || 'クーポン名'}
      </p>
      <p
        className="mt-2 font-bold leading-none text-ink-900"
        style={{ fontSize: '26px' }}
      >
        {draft.discountType === 'percent'
          ? `${draft.discountValue}% OFF`
          : `¥${draft.discountValue.toLocaleString()} OFF`}
      </p>
      <div className="mt-3 rounded-md bg-white/80 px-3 py-1.5 font-mono text-[13px] font-bold tracking-widest text-ink-900">
        {draft.code || 'CODE'}
      </div>
      {draft.description && (
        <p className="mt-2 text-[10px] leading-relaxed text-ink-700">{draft.description}</p>
      )}
      {draft.expiresAt && (
        <div className="mt-3 flex items-center justify-center gap-1 text-[10px] text-ink-500">
          <CalendarIcon size={10} strokeWidth={1.75} />
          {left !== null && left >= 0 ? `あと${left}日有効` : '期限切れ'}
        </div>
      )}
      {draft.maxUses !== null && (
        <p className="mt-1 text-[9px] text-ink-400">先着 {draft.maxUses} 名様</p>
      )}
    </div>
  );
}

function DiscountBadge({ type, value }: { type: string; value: number }) {
  return (
    <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700">
      {type === 'percent' ? `${value}%` : `¥${value.toLocaleString()}`}
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-ink-500">{label}</span>
      {children}
    </label>
  );
}

function Spinner() {
  return (
    <div className="flex h-32 items-center justify-center text-[11px] text-ink-300">
      読み込み中…
    </div>
  );
}

function Empty({
  Icon,
  label,
}: {
  Icon: typeof Ticket;
  label: string;
}) {
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
