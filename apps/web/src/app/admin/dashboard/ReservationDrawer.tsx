'use client';

import { useEffect, useState } from 'react';
import {
  X,
  Clock,
  Scissors,
  UserRound,
  Phone,
  Cake,
  MapPin,
  CalendarClock,
  Sparkles,
  MessageSquare,
  Save,
  Wand2,
  TrendingUp,
} from 'lucide-react';

export type Reservation = {
  id: string;
  time: string;
  name: string;
  initial: string;
  avatarTone: 'mint' | 'lavender' | 'peach' | 'sky' | 'sand';
  menu: string;
  status: '確定' | '未確定';
  aiTag?: string;
  phone: string;
  birthday: string;
  visits: number;
  lastVisit: string;
  staff: string;
  location: string;
  memo?: string;
  aiInsight?: string;
};

const staffOptions = ['スタッフ A', 'スタッフ B', 'スタッフ C', 'AI 振り分け'];
const menuOptions = [
  'カット',
  'カット + カラー',
  'カラー + トリートメント',
  'パーマ',
  'トリートメント',
  'ヘッドスパ',
  'カラー + ヘッドスパ',
];

export function ReservationDrawer({
  reservation,
  onClose,
}: {
  reservation: Reservation | null;
  onClose: () => void;
}) {
  const open = !!reservation;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.dataset.drawer = 'open';
    else delete document.body.dataset.drawer;
    return () => {
      delete document.body.dataset.drawer;
    };
  }, [open]);

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={
          'fixed inset-0 z-40 bg-ink-900/30 backdrop-blur-sm transition-opacity duration-300 ' +
          (open ? 'opacity-100' : 'pointer-events-none opacity-0')
        }
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="予約詳細"
        className={
          'fixed top-0 right-0 z-50 flex h-full w-[640px] flex-col overflow-hidden border-l border-ink-100 bg-surface-0 shadow-2xl transition-transform duration-300 ease-out ' +
          (open ? 'translate-x-0' : 'translate-x-full')
        }
      >
        {reservation && <DrawerContent reservation={reservation} onClose={onClose} />}
      </aside>
    </>
  );
}

function DrawerContent({
  reservation,
  onClose,
}: {
  reservation: Reservation;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<Reservation['status']>(reservation.status);
  const [time, setTime] = useState(reservation.time);
  const [menu, setMenu] = useState(reservation.menu);
  const [staff, setStaff] = useState(reservation.staff);
  const [memo, setMemo] = useState(reservation.memo ?? '');

  return (
    <>
      <header className="flex shrink-0 items-center justify-between border-b border-ink-100 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar initial={reservation.initial} tone={reservation.avatarTone} size={40} />
          <div>
            <p className="text-sm font-semibold text-ink-900">{reservation.name}</p>
            <p className="text-[11px] text-ink-500">
              <span className="numeric">{reservation.visits}</span> 回目の来店 ·{' '}
              {reservation.location} 拠点
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="rounded-full p-1.5 text-ink-500 hover:bg-surface-100 hover:text-ink-900"
        >
          <X size={16} strokeWidth={1.75} />
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {reservation.aiInsight && (
          <div
            className="relative overflow-hidden rounded-2xl border p-3.5 backdrop-blur-md"
            style={{
              borderColor: 'rgba(255,255,255,0.65)',
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.78) 0%, rgba(245,143,184,0.08) 50%, rgba(184,154,236,0.10) 100%)',
              boxShadow: '0 8px 20px -14px rgba(184,154,236,0.30)',
            }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-30 blur-2xl"
              style={{ background: 'var(--gradient-primary)' }}
            />
            <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
              <Sparkles size={11} strokeWidth={2} style={{ color: '#b89aec' }} />
              AI からの来店提案
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-700">
              {reservation.aiInsight}
            </p>
            <button
              type="button"
              className="mt-2.5 flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <Wand2 size={11} strokeWidth={2} />
              提案メッセージを送る
            </button>
          </div>
        )}

        <Section icon={CalendarClock} title="予約情報">
          <FieldRow label="日時">
            <input
              value={`2026/05/22 ${time}`}
              onChange={(e) => setTime(e.target.value.slice(-5))}
              className="numeric w-full rounded-lg border border-ink-100 px-2.5 py-1.5 text-sm outline-none"
            />
          </FieldRow>
          <FieldRow label="メニュー">
            <select
              value={menu}
              onChange={(e) => setMenu(e.target.value)}
              className="w-full rounded-lg border border-ink-100 px-2.5 py-1.5 text-sm outline-none"
            >
              {menuOptions.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="担当">
            <select
              value={staff}
              onChange={(e) => setStaff(e.target.value)}
              className="w-full rounded-lg border border-ink-100 px-2.5 py-1.5 text-sm outline-none"
            >
              {staffOptions.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </FieldRow>
          <FieldRow label="ステータス">
            <div className="flex gap-1 rounded-lg bg-surface-100 p-1">
              {(['確定', '未確定'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={
                    status === s
                      ? 'flex-1 rounded-md py-1 text-xs font-semibold text-white'
                      : 'flex-1 rounded-md py-1 text-xs text-ink-500 hover:text-ink-900'
                  }
                  style={
                    status === s
                      ? {
                          background:
                            s === '確定' ? 'var(--line-green)' : '#d49633',
                        }
                      : undefined
                  }
                >
                  {s}
                </button>
              ))}
            </div>
          </FieldRow>
        </Section>

        <Section icon={UserRound} title="お客様情報">
          <Row label="電話" value={reservation.phone} Icon={Phone} />
          <Row label="誕生日" value={reservation.birthday} Icon={Cake} />
          <Row label="拠点" value={`${reservation.location} 店`} Icon={MapPin} />
          <Row label="前回来店" value={reservation.lastVisit} Icon={Clock} />
        </Section>

        <Section icon={MessageSquare} title="カウンセリングメモ">
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            placeholder="アレルギー / 希望トーン / 好きな会話のトピック など"
            className="w-full resize-none rounded-lg border border-ink-100 px-2.5 py-2 text-xs text-ink-700 outline-none"
          />
        </Section>

        <Section icon={TrendingUp} title="来店傾向">
          <div className="grid grid-cols-3 gap-2 text-center">
            <Stat label="累計" value={`¥${(reservation.visits * 4500).toLocaleString()}`} />
            <Stat label="頻度" value="6 週ごと" />
            <Stat label="LTV 予測" value={`¥${(reservation.visits * 8500).toLocaleString()}`} />
          </div>
        </Section>
      </div>

      <footer className="flex shrink-0 items-center gap-2 border-t border-ink-100 px-5 py-3 bg-surface-0">
        <button
          type="button"
          className="flex items-center gap-1 rounded-full border border-ink-100 px-3 py-2 text-xs text-ink-700 hover:bg-surface-50"
        >
          <MessageSquare size={12} strokeWidth={1.75} />
          LINE で連絡
        </button>
        <button
          type="button"
          className="ml-auto rounded-full border border-ink-100 px-3 py-2 text-xs text-ink-700 hover:bg-surface-50"
          onClick={onClose}
        >
          キャンセル
        </button>
        <button
          type="button"
          className="flex items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold text-white"
          style={{ background: 'var(--line-green)' }}
        >
          <Save size={12} strokeWidth={2} />
          変更を保存
        </button>
      </footer>
    </>
  );
}

function Avatar({
  initial,
  tone,
  size,
}: {
  initial: string;
  tone: Reservation['avatarTone'];
  size: number;
}) {
  const bg: Record<string, string> = {
    mint: '#dff5e6',
    lavender: '#ece6f7',
    peach: '#fde2d4',
    sky: '#d8ecf6',
    sand: '#f4ead0',
  };
  const fg: Record<string, string> = {
    mint: '#1d7a3a',
    lavender: '#5b3e9a',
    peach: '#b8612d',
    sky: '#2d6e8f',
    sand: '#7a5f0e',
  };
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        background: bg[tone],
        color: fg[tone],
        fontSize: size * 0.42,
      }}
    >
      {initial}
    </span>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Clock;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        <Icon size={11} strokeWidth={1.75} />
        {title}
      </h3>
      <div className="space-y-2 rounded-2xl border border-ink-100 bg-surface-50 p-3">
        {children}
      </div>
    </div>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[80px_1fr] items-center gap-2">
      <span className="text-[11px] text-ink-500">{label}</span>
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: typeof Phone;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5 text-ink-500">
        <Icon size={11} strokeWidth={1.75} />
        {label}
      </span>
      <span className="text-ink-900">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-0 py-2">
      <p className="numeric text-sm font-semibold text-ink-900">{value}</p>
      <p className="text-[9px] text-ink-500">{label}</p>
    </div>
  );
}

export function TodayReservationsTable({
  data,
}: {
  data: Reservation[];
}) {
  const [selected, setSelected] = useState<Reservation | null>(null);

  return (
    <>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
            <th className="py-2 font-medium">時間</th>
            <th className="py-2 font-medium">お客様</th>
            <th className="py-2 font-medium">メニュー</th>
            <th className="py-2 font-medium">AI 介在</th>
            <th className="py-2 font-medium">ステータス</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr
              key={r.id}
              onClick={() => setSelected(r)}
              className="cursor-pointer border-b border-ink-100/70 transition-colors last:border-0 hover:bg-surface-50"
            >
              <td className="py-2.5 numeric font-semibold text-ink-900">{r.time}</td>
              <td className="py-2.5">
                <span className="flex items-center gap-2 text-ink-900">
                  <Avatar initial={r.initial} tone={r.avatarTone} size={24} />
                  {r.name}
                </span>
              </td>
              <td className="py-2.5 text-ink-500">{r.menu}</td>
              <td className="py-2.5">
                {r.aiTag ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(245,143,184,0.16) 0%, rgba(184,154,236,0.16) 100%)',
                      color: '#5b3e9a',
                    }}
                  >
                    <Sparkles size={9} strokeWidth={2} />
                    {r.aiTag}
                  </span>
                ) : (
                  <span className="text-[10px] text-ink-300">—</span>
                )}
              </td>
              <td className="py-2.5">
                <StatusBadge status={r.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ReservationDrawer
        reservation={selected}
        onClose={() => setSelected(null)}
      />
      <p className="mt-3 flex items-center gap-1 text-[10px] text-ink-300">
        <Scissors size={10} strokeWidth={1.75} />
        行をクリックすると右からドロワーが開きます · Esc で閉じる
      </p>
    </>
  );
}

function StatusBadge({ status }: { status: Reservation['status'] }) {
  if (status === '確定') {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs"
        style={{ background: '#e8f6ee', color: '#1d7a3a' }}
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#1d7a3a' }} />
        確定
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs"
      style={{ background: '#fff4dd', color: '#9a6700' }}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#9a6700' }} />
      未確定
    </span>
  );
}
