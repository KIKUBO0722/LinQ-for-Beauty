'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  Store,
  Scissors,
  Smartphone,
  Plus,
  Trash2,
  Loader2,
  Check,
  Bot,
  ExternalLink,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  api,
  lineAccountsApi,
  TENANT_ID,
  type Location,
  type Service,
  type LineAccount,
  type BusinessHours,
  type DayKey,
} from '@/lib/api';

type Tab = '基本情報' | '店舗' | 'メニュー' | 'LINE公式アカウント';
const TABS: { key: Tab; Icon: LucideIcon }[] = [
  { key: '基本情報', Icon: Building2 },
  { key: '店舗', Icon: Store },
  { key: 'メニュー', Icon: Scissors },
  { key: 'LINE公式アカウント', Icon: Smartphone },
];

const INPUT =
  'w-full rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-sm text-ink-900 outline-none';

const DAY_DEFS: { key: DayKey; num: number; label: string }[] = [
  { key: 'mon', num: 1, label: '月' },
  { key: 'tue', num: 2, label: '火' },
  { key: 'wed', num: 3, label: '水' },
  { key: 'thu', num: 4, label: '木' },
  { key: 'fri', num: 5, label: '金' },
  { key: 'sat', num: 6, label: '土' },
  { key: 'sun', num: 0, label: '日' },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('基本情報');
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
      <div className="mb-4 flex items-center gap-2">
        <Store size={18} strokeWidth={1.75} className="text-ink-700" />
        <h1 className="text-lg font-semibold text-ink-900">設定</h1>
      </div>

      <div className="mb-5 flex items-center gap-1 text-sm">
        {TABS.map(({ key, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={
              tab === key
                ? 'flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-white'
                : 'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-ink-500 hover:text-ink-900'
            }
            style={tab === key ? { background: 'var(--line-green)' } : undefined}
          >
            <Icon size={14} strokeWidth={1.75} />
            {key}
          </button>
        ))}
      </div>

      {tab === '基本情報' && <BasicInfoTab onError={setError} />}
      {tab === '店舗' && <StoresTab onError={setError} />}
      {tab === 'メニュー' && <MenuTab onError={setError} />}
      {tab === 'LINE公式アカウント' && <LineTab onError={setError} />}

      {error && <ErrorToast text={error} onClose={() => setError(null)} />}
    </div>
  );
}

/* ============================== 基本情報 ============================== */

function BasicInfoTab({ onError }: { onError: (m: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerRole, setOwnerRole] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [lineId, setLineId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const t = await api.tenants.get(TENANT_ID);
      setName(t.name ?? '');
      setEmail(t.email ?? '');
      setOwnerName(t.ownerName ?? '');
      setOwnerRole(t.ownerRole ?? '');
      setPhone(t.phone ?? '');
      setAddress(t.address ?? '');
      setLineId(t.lineId ?? '');
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setSaved(false);
    try {
      await api.tenants.update(TENANT_ID, {
        name: name.trim(),
        email: email.trim(),
        ownerName: ownerName.trim() || null,
        ownerRole: ownerRole.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        lineId: lineId.trim() || null,
      });
      setSaved(true);
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="max-w-2xl">
      <Card title="お店の基本情報" desc="お客様への案内文やレシートに使う、お店の基本的な情報です。">
        <div className="grid grid-cols-2 gap-x-4">
          <Field label="屋号 (サロン名)">
            <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="例: LinQ Beauty" />
          </Field>
          <Field label="メールアドレス">
            <input className={INPUT} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="例: salon@example.com" />
          </Field>
          <Field label="オーナー名">
            <input className={INPUT} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="例: 平山 太郎" />
          </Field>
          <Field label="役職">
            <input className={INPUT} value={ownerRole} onChange={(e) => setOwnerRole(e.target.value)} placeholder="例: 代表 / 店長" />
          </Field>
          <Field label="連絡先電話">
            <input className={INPUT} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="例: 03-1234-5678" />
          </Field>
          <Field label="オーナーの LINE ID" hint="緊急連絡用 (任意)">
            <input className={INPUT} value={lineId} onChange={(e) => setLineId(e.target.value)} placeholder="例: @owner_line" />
          </Field>
        </div>
        <Field label="代表住所" hint="店舗ごとの住所は「店舗」タブで設定します">
          <input className={INPUT} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="例: 東京都豊島区..." />
        </Field>
        <div className="mt-4">
          <SaveButton onClick={save} saving={saving} saved={saved} disabled={!name.trim()} />
        </div>
      </Card>
    </div>
  );
}

/* ============================== 店舗 ============================== */

function StoresTab({ onError }: { onError: (m: string) => void }) {
  const [items, setItems] = useState<Location[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.locations.list();
      setItems(data);
      setSelectedId((cur) => cur ?? (data.length > 0 ? data[0].id : null));
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
      setItems([]);
    }
  }, [onError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (items === null) return <Spinner />;

  const selected =
    selectedId && selectedId !== 'new' ? items.find((i) => i.id === selectedId) ?? null : null;

  return (
    <div className="grid grid-cols-[260px_1fr] gap-4">
      <div className="space-y-1.5">
        {items.map((loc) => (
          <button
            key={loc.id}
            type="button"
            onClick={() => setSelectedId(loc.id)}
            className="flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm"
            style={
              selectedId === loc.id
                ? { borderColor: 'var(--line-green)', background: '#e8f6ee' }
                : { borderColor: 'var(--ink-100)' }
            }
          >
            <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: loc.themeColor ?? '#cbd5e1' }} />
            <span className="truncate text-ink-900">{loc.name}</span>
            {loc.isActive === false && (
              <span className="ml-auto shrink-0 rounded-full bg-surface-100 px-2 py-0.5 text-[10px] text-ink-500">非公開</span>
            )}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelectedId('new')}
          className="flex w-full items-center gap-1.5 rounded-xl border border-dashed border-ink-100 px-3 py-2.5 text-sm text-ink-500 hover:text-ink-900"
          style={selectedId === 'new' ? { borderColor: 'var(--line-green)', color: 'var(--ink-900)' } : undefined}
        >
          <Plus size={14} strokeWidth={2} />
          店舗を追加
        </button>
      </div>

      <div>
        {selectedId === 'new' ? (
          <StoreEditor
            key="new"
            location={null}
            onError={onError}
            onSaved={(id) => {
              setSelectedId(id);
              refresh();
            }}
            onDeleted={() => setSelectedId(null)}
          />
        ) : selected ? (
          <StoreEditor
            key={selected.id}
            location={selected}
            onError={onError}
            onSaved={() => refresh()}
            onDeleted={() => {
              setSelectedId(null);
              refresh();
            }}
          />
        ) : (
          <Empty label="左から店舗を選ぶか、店舗を追加してください" />
        )}
      </div>
    </div>
  );
}

type DayState = { open: string; close: string; closed: boolean };

function initHours(loc: Location | null): Record<DayKey, DayState> {
  const closed = new Set(loc?.closedDays ?? []);
  const bh = loc?.businessHours ?? {};
  const out = {} as Record<DayKey, DayState>;
  for (const d of DAY_DEFS) {
    const h = bh?.[d.key];
    out[d.key] = {
      open: h?.open ?? '10:00',
      close: h?.close ?? '19:00',
      closed: loc ? closed.has(d.num) : false,
    };
  }
  return out;
}

function StoreEditor({
  location,
  onSaved,
  onDeleted,
  onError,
}: {
  location: Location | null;
  onSaved: (id: string) => void;
  onDeleted: () => void;
  onError: (m: string) => void;
}) {
  const isNew = !location;
  const [name, setName] = useState(location?.name ?? '');
  const [address, setAddress] = useState(location?.address ?? '');
  const [phone, setPhone] = useState(location?.phone ?? '');
  const [themeColor, setThemeColor] = useState(location?.themeColor ?? '#06c755');
  const [isActive, setIsActive] = useState(location?.isActive ?? true);
  const [hours, setHours] = useState<Record<DayKey, DayState>>(() => initHours(location));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const setDay = (key: DayKey, patch: Partial<DayState>) =>
    setHours((h) => ({ ...h, [key]: { ...h[key], ...patch } }));

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setSaved(false);
    const businessHours: BusinessHours = {};
    const closedDays: number[] = [];
    for (const d of DAY_DEFS) {
      const h = hours[d.key];
      if (h.closed) closedDays.push(d.num);
      else businessHours[d.key] = { open: h.open, close: h.close };
    }
    const payload = {
      name: name.trim(),
      address: address.trim() || null,
      phone: phone.trim() || null,
      themeColor: themeColor || null,
      businessHours,
      closedDays,
      isActive,
    };
    try {
      if (isNew) {
        const slug = `store-${Math.random().toString(36).slice(2, 8)}`;
        const created = await api.locations.create({ slug, ...payload });
        onSaved(created.id);
      } else {
        await api.locations.update(location.id, payload);
        setSaved(true);
        onSaved(location.id);
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (isNew || !location) return;
    if (
      !window.confirm(
        `「${location.name}」を削除しますか?\nこの店舗専用のメニューも一緒に削除されます。この操作は元に戻せません。\n（予約がある店舗は削除できません。その場合は「非公開」にしてください）`,
      )
    )
      return;
    setSaving(true);
    try {
      await api.locations.remove(location.id);
      onDeleted();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title={isNew ? '店舗を追加' : '店舗を編集'}
      right={
        !isNew ? (
          <button
            type="button"
            onClick={remove}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 size={13} strokeWidth={1.75} />
            削除
          </button>
        ) : undefined
      }
    >
      <div className="grid grid-cols-2 gap-x-4">
        <Field label="店舗名">
          <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 池袋店" />
        </Field>
        <Field label="電話番号">
          <input className={INPUT} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="例: 03-1234-5678" />
        </Field>
      </div>
      <Field label="住所">
        <input className={INPUT} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="例: 東京都豊島区西池袋..." />
      </Field>

      <Field label="店舗カラー" hint="予約画面やラベルの色分けに使います">
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={themeColor}
            onChange={(e) => setThemeColor(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded-lg border border-ink-100 bg-surface-0"
          />
          <input
            className={`${INPUT} numeric max-w-[120px]`}
            value={themeColor}
            onChange={(e) => setThemeColor(e.target.value)}
            placeholder="#06c755"
          />
        </div>
      </Field>

      <Field label="公開状態" hint="非公開にすると新規予約・お客様向けに表示されません">
        <div className="flex gap-1 rounded-lg bg-surface-100 p-1">
          {[
            { v: true, label: '公開中' },
            { v: false, label: '非公開' },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => setIsActive(o.v)}
              className="flex-1 rounded-md px-3 py-1.5 text-sm font-medium"
              style={isActive === o.v ? { background: 'var(--line-green)', color: '#fff' } : { color: 'var(--ink-500)' }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </Field>

      <div className="mt-3">
        <span className="mb-1.5 block text-xs text-ink-500">営業時間・定休日</span>
        <div className="space-y-1.5 rounded-xl border border-ink-100 p-3">
          {DAY_DEFS.map((d) => {
            const h = hours[d.key];
            return (
              <div key={d.key} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-center text-ink-700">{d.label}</span>
                <button
                  type="button"
                  onClick={() => setDay(d.key, { closed: !h.closed })}
                  className="w-14 rounded-full px-2 py-1 text-xs font-medium"
                  style={
                    h.closed
                      ? { background: 'var(--surface-100)', color: 'var(--ink-500)' }
                      : { background: '#e8f6ee', color: '#0a7a3d' }
                  }
                >
                  {h.closed ? '休み' : '営業'}
                </button>
                <input
                  type="time"
                  value={h.open}
                  disabled={h.closed}
                  onChange={(e) => setDay(d.key, { open: e.target.value })}
                  className="numeric rounded-lg border border-ink-100 bg-surface-0 px-2 py-1 text-sm text-ink-900 outline-none disabled:bg-surface-100 disabled:text-ink-300"
                />
                <span className="text-ink-300">〜</span>
                <input
                  type="time"
                  value={h.close}
                  disabled={h.closed}
                  onChange={(e) => setDay(d.key, { close: e.target.value })}
                  className="numeric rounded-lg border border-ink-100 bg-surface-0 px-2 py-1 text-sm text-ink-900 outline-none disabled:bg-surface-100 disabled:text-ink-300"
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <SaveButton onClick={save} saving={saving} saved={saved} disabled={!name.trim()} label={isNew ? '店舗を追加' : '保存'} />
      </div>
    </Card>
  );
}

/* ============================== メニュー ============================== */

function MenuTab({ onError }: { onError: (m: string) => void }) {
  const [items, setItems] = useState<Service[] | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedId, setSelectedId] = useState<string | 'new' | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [svcs, locs] = await Promise.all([api.services.list(), api.locations.list()]);
      setItems(svcs);
      setLocations(locs);
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
      setItems([]);
    }
  }, [onError]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (items === null) return <Spinner />;

  const selected =
    selectedId && selectedId !== 'new' ? items.find((i) => i.id === selectedId) ?? null : null;

  const locName = (id: string | null) =>
    id ? locations.find((l) => l.id === id)?.name ?? '不明な店舗' : '全店舗共通';

  return (
    <div className="grid grid-cols-[300px_1fr] gap-4">
      <div className="space-y-1.5">
        {items.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSelectedId(s.id)}
            className="flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-sm"
            style={
              selectedId === s.id
                ? { borderColor: 'var(--line-green)', background: '#e8f6ee' }
                : { borderColor: 'var(--ink-100)' }
            }
          >
            <span className="min-w-0">
              <span className="block truncate text-ink-900">{s.name}</span>
              <span className="block truncate text-xs text-ink-500">
                {locName(s.locationId)} ・ <span className="numeric">{s.durationMin}</span>分
                {s.price != null && (
                  <>
                    {' '}
                    ・ <span className="numeric">¥{s.price.toLocaleString()}</span>
                  </>
                )}
              </span>
            </span>
            {!s.isActive && <span className="shrink-0 rounded-full bg-surface-100 px-2 py-0.5 text-[10px] text-ink-500">非公開</span>}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setSelectedId('new')}
          className="flex w-full items-center gap-1.5 rounded-xl border border-dashed border-ink-100 px-3 py-2.5 text-sm text-ink-500 hover:text-ink-900"
          style={selectedId === 'new' ? { borderColor: 'var(--line-green)', color: 'var(--ink-900)' } : undefined}
        >
          <Plus size={14} strokeWidth={2} />
          メニューを追加
        </button>
      </div>

      <div>
        {selectedId === 'new' ? (
          <ServiceEditor
            key="new"
            service={null}
            locations={locations}
            onError={onError}
            onSaved={(id) => {
              setSelectedId(id);
              refresh();
            }}
            onDeleted={() => setSelectedId(null)}
          />
        ) : selected ? (
          <ServiceEditor
            key={selected.id}
            service={selected}
            locations={locations}
            onError={onError}
            onSaved={() => refresh()}
            onDeleted={() => {
              setSelectedId(null);
              refresh();
            }}
          />
        ) : (
          <Empty label="左からメニューを選ぶか、メニューを追加してください" />
        )}
      </div>
    </div>
  );
}

function ServiceEditor({
  service,
  locations,
  onSaved,
  onDeleted,
  onError,
}: {
  service: Service | null;
  locations: Location[];
  onSaved: (id: string) => void;
  onDeleted: () => void;
  onError: (m: string) => void;
}) {
  const isNew = !service;
  const [name, setName] = useState(service?.name ?? '');
  const [durationMin, setDurationMin] = useState(String(service?.durationMin ?? 60));
  const [price, setPrice] = useState(service?.price != null ? String(service.price) : '');
  const [displayOrder, setDisplayOrder] = useState(String(service?.displayOrder ?? 0));
  const [locationId, setLocationId] = useState<string>(service?.locationId ?? '');
  const [isActive, setIsActive] = useState(service?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    const dur = parseInt(durationMin, 10);
    if (!name.trim() || Number.isNaN(dur) || dur <= 0) return;
    setSaving(true);
    setSaved(false);
    const payload = {
      name: name.trim(),
      durationMin: dur,
      price: price.trim() === '' ? null : Number(price),
      displayOrder: parseInt(displayOrder, 10) || 0,
      isActive,
    };
    try {
      if (isNew) {
        const created = await api.services.create({ locationId: locationId || null, ...payload });
        onSaved(created.id);
      } else {
        await api.services.update(service.id, payload);
        setSaved(true);
        onSaved(service.id);
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (isNew || !service) return;
    if (!window.confirm(`「${service.name}」を削除しますか? この操作は元に戻せません。`)) return;
    setSaving(true);
    try {
      await api.services.remove(service.id);
      onDeleted();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const dur = parseInt(durationMin, 10);
  const canSave = name.trim() !== '' && !Number.isNaN(dur) && dur > 0;

  return (
    <Card
      title={isNew ? 'メニューを追加' : 'メニューを編集'}
      right={
        !isNew ? (
          <button
            type="button"
            onClick={remove}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-red-400 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 size={13} strokeWidth={1.75} />
            削除
          </button>
        ) : undefined
      }
    >
      <Field label="メニュー名">
        <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="例: カット + カラー" />
      </Field>
      <div className="grid grid-cols-2 gap-x-4">
        <Field label="所要時間 (分)">
          <input
            className={`${INPUT} numeric`}
            type="number"
            min={1}
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            placeholder="例: 90"
          />
        </Field>
        <Field label="料金 (円)" hint="空欄なら未設定">
          <input
            className={`${INPUT} numeric`}
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="例: 8000"
          />
        </Field>
        <Field label="対象店舗">
          <select className={INPUT} value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">全店舗共通</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="表示順" hint="小さいほど上に表示">
          <input
            className={`${INPUT} numeric`}
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value)}
            placeholder="0"
          />
        </Field>
      </div>

      <Field label="公開">
        <div className="flex gap-1 rounded-lg bg-surface-100 p-1">
          {[
            { v: true, label: '公開する' },
            { v: false, label: '非公開' },
          ].map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => setIsActive(o.v)}
              className="flex-1 rounded-md px-3 py-1.5 text-sm font-medium"
              style={
                isActive === o.v
                  ? { background: 'var(--line-green)', color: '#fff' }
                  : { color: 'var(--ink-500)' }
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      </Field>

      <div className="mt-4">
        <SaveButton onClick={save} saving={saving} saved={saved} disabled={!canSave} label={isNew ? 'メニューを追加' : '保存'} />
      </div>
    </Card>
  );
}

/* ============================== LINE公式アカウント ============================== */

function LineTab({ onError }: { onError: (m: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<LineAccount | null>(null);
  const [name, setName] = useState('');
  const [channelId, setChannelId] = useState('');
  const [channelSecret, setChannelSecret] = useState('');
  const [channelAccessToken, setChannelAccessToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await lineAccountsApi.list();
      const acc = list[0] ?? null;
      setAccount(acc);
      setName(acc?.name ?? '');
      setChannelId(acc?.channelId ?? '');
      setChannelSecret(acc?.channelSecret ?? '');
      setChannelAccessToken(acc?.channelAccessToken ?? '');
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      if (account) {
        await lineAccountsApi.update(account.id, {
          name: name.trim() || null,
          channelId: channelId.trim(),
          channelSecret,
          channelAccessToken,
        });
      } else {
        if (!channelId.trim() || !channelSecret.trim() || !channelAccessToken.trim()) {
          onError('Channel ID・シークレット・アクセストークンをすべて入力してください');
          setSaving(false);
          return;
        }
        await lineAccountsApi.create({
          name: name.trim() || null,
          channelId: channelId.trim(),
          channelSecret: channelSecret.trim(),
          channelAccessToken: channelAccessToken.trim(),
        });
      }
      setSaved(true);
      await load();
    } catch (e) {
      onError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await lineAccountsApi.testConnection(channelAccessToken);
      if (r.ok) {
        const display = r.botInfo?.displayName ? `「${r.botInfo.displayName}」` : '';
        setTestResult({ ok: true, msg: `接続できました${display ? ` (${display})` : ''}` });
      } else {
        setTestResult({ ok: false, msg: r.error ?? '接続に失敗しました' });
      }
    } catch (e) {
      setTestResult({ ok: false, msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="grid max-w-4xl grid-cols-[1fr_300px] gap-4">
      <Card title="LINE公式アカウント接続" desc="LINE Developers で発行した接続情報を貼り付けます。">
        <Field label="アカウント名" hint="管理用の表示名 (任意)">
          <input className={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="例: サンプル サロン 本店" />
        </Field>
        <Field label="Channel ID">
          <input className={`${INPUT} numeric`} value={channelId} onChange={(e) => setChannelId(e.target.value)} placeholder="例: 1234567890" />
        </Field>
        <Field label="Channel Secret">
          <input
            className={INPUT}
            value={channelSecret}
            onChange={(e) => setChannelSecret(e.target.value)}
            placeholder={account ? '変更する場合のみ貼り直してください' : 'シークレットを貼り付け'}
          />
        </Field>
        <Field label="Channel Access Token (長期)">
          <textarea
            rows={3}
            className="w-full resize-none rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-sm text-ink-900 outline-none"
            value={channelAccessToken}
            onChange={(e) => setChannelAccessToken(e.target.value)}
            placeholder={account ? '変更する場合のみ貼り直してください' : 'アクセストークンを貼り付け'}
          />
        </Field>

        <div className="mt-2 flex items-center gap-3">
          <SaveButton onClick={save} saving={saving} saved={saved} label={account ? '保存' : '接続する'} />
          <button
            type="button"
            onClick={test}
            disabled={testing || !channelAccessToken.trim()}
            className="flex items-center gap-1.5 rounded-full border border-ink-100 px-4 py-2 text-sm text-ink-700 hover:bg-surface-50 disabled:opacity-50"
          >
            {testing ? <Loader2 size={14} className="animate-spin" /> : <Smartphone size={14} strokeWidth={1.75} />}
            接続テスト
          </button>
        </div>

        {testResult && (
          <div
            className="mt-3 flex items-start gap-2 rounded-xl px-3 py-2 text-xs"
            style={
              testResult.ok
                ? { background: '#e8f6ee', color: '#0a7a3d' }
                : { background: 'rgb(254 242 242)', color: 'rgb(185 28 28)' }
            }
          >
            {testResult.ok ? (
              <CheckCircle2 size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
            ) : (
              <XCircle size={14} strokeWidth={2} className="mt-0.5 shrink-0" />
            )}
            <span>{testResult.msg}</span>
          </div>
        )}
      </Card>

      <div className="space-y-3">
        <Card title="つなぎ方ガイド">
          <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-ink-700">
            <li>LINE Developers で「Messaging API」のチャネルを作成</li>
            <li>「チャネル基本設定」の Channel ID と Channel Secret をコピー</li>
            <li>「Messaging API設定」で長期のアクセストークンを発行してコピー</li>
            <li>上の3つを貼り付け →「接続テスト」で確認 →「接続する」で保存</li>
          </ol>
          <a
            href="https://developers.line.biz/console/"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs text-ink-500 hover:text-ink-900"
          >
            LINE Developers を開く
            <ExternalLink size={12} strokeWidth={1.75} />
          </a>
        </Card>

        <Card title="AI の自動応答について">
          <p className="text-xs leading-relaxed text-ink-700">
            お客様への自動返信やよくある質問（ナレッジ）の設定は「AI」画面で行います。
          </p>
          <Link
            href="/admin/ai"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-ink-100 px-3 py-1.5 text-xs text-ink-700 hover:bg-surface-50"
          >
            <Bot size={13} strokeWidth={1.75} />
            AI 画面へ
          </Link>
        </Card>
      </div>
    </div>
  );
}

/* ============================== 共通プリミティブ ============================== */

function Card({
  title,
  desc,
  right,
  children,
}: {
  title: string;
  desc?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-surface-0 p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
          {desc && <p className="mt-0.5 text-xs text-ink-500">{desc}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="mt-2 block">
      <span className="mb-1 mt-2 block text-xs text-ink-500">
        {label}
        {hint && <span className="ml-1.5 text-ink-300">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function SaveButton({
  onClick,
  saving,
  saved,
  disabled,
  label = '保存',
}: {
  onClick: () => void;
  saving: boolean;
  saved: boolean;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={saving || disabled}
        className="flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        style={{ background: 'var(--line-green)' }}
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={2} />}
        {label}
      </button>
      {saved && <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs text-green-700">保存しました</span>}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex h-40 items-center justify-center text-ink-300">
      <Loader2 size={20} className="animate-spin" />
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-ink-100 text-sm text-ink-500">
      {label}
    </div>
  );
}

function ErrorToast({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-lg">
      <p className="pr-5 text-xs text-red-700">{text}</p>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 text-red-400 hover:text-red-700"
        aria-label="閉じる"
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
