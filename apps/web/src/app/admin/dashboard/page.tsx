'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  MessageSquare,
  UserPlus,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  Wand2,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TodayReservationsTable, type Reservation } from './ReservationDrawer';
import { api, type Reservation as ApiReservation, TENANT_ID } from '@/lib/api';

type Tone = 'mint' | 'line' | 'lavender' | 'warn' | 'soft' | 'ai';

type Kpi = {
  Icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaTone?: 'up' | 'warn';
  cta: { label: string; href: string };
};

function buildKpis(args: {
  todayCount: number | null;
  unreadCount: number | null;
}): Kpi[] {
  return [
    {
      Icon: Calendar,
      tone: 'mint',
      label: '今日の予約',
      value: args.todayCount === null ? '—' : String(args.todayCount),
      unit: '件',
      delta: args.todayCount === null ? '読み込み中' : 'リアルタイム',
      deltaTone: 'up',
      cta: { label: '予約一覧', href: '/admin/calendar' },
    },
    {
      Icon: MessageSquare,
      tone: 'line',
      label: '未読 LINE',
      value: args.unreadCount === null ? '—' : String(args.unreadCount),
      unit: '件',
      delta: args.unreadCount === null ? '読み込み中' : 'リアルタイム',
      deltaTone: 'up',
      cta: { label: '対応する', href: '/admin/inbox' },
    },
    {
      Icon: UserPlus,
      tone: 'lavender',
      label: '再来店促進',
      value: '—',
      unit: '名',
      delta: 'Phase 2',
      deltaTone: 'up',
      cta: { label: '配信を作成', href: '/admin/broadcast' },
    },
    {
      Icon: AlertTriangle,
      tone: 'warn',
      label: '失客リスク',
      value: '—',
      unit: '名',
      delta: 'Phase 2',
      deltaTone: 'warn',
      cta: { label: 'お客様を見る', href: '/admin/customers' },
    },
  ];
}

const TONES: Reservation['avatarTone'][] = ['mint', 'lavender', 'peach', 'sky', 'sand'];
function pickTone(seed: string): Reservation['avatarTone'] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}
function apiToDisplay(r: ApiReservation): Reservation {
  const startsAt = new Date(r.startsAt);
  const time = startsAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  const name = r.customers?.name ?? r.guestName ?? '名前未登録';
  const initial = name.charAt(0);
  const status: Reservation['status'] =
    r.status === 'confirmed' || r.status === 'completed' ? '確定' : '未確定';
  const locationName = r.locations?.name ?? '店舗 A';
  const location: Reservation['location'] = locationName;
  return {
    id: r.id,
    time,
    name,
    initial,
    avatarTone: pickTone(name),
    menu: r.services?.name ?? '未選択',
    status,
    phone: r.customers?.phone ?? r.guestPhone ?? '',
    birthday: '',
    visits: 0,
    lastVisit: '',
    staff: 'スタッフ',
    location,
    memo: r.note ?? undefined,
  };
}
function todayRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0).toISOString();
  return { from, to };
}

export default function DashboardPage() {
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  const [unread, setUnread] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!TENANT_ID) {
      setError('NEXT_PUBLIC_TENANT_ID 未設定');
      setReservations([]);
      setUnread(0);
      return;
    }
    const { from, to } = todayRange();
    Promise.all([
      api.reservations.listAll(from, to).catch((e) => {
        console.warn('reservations.listAll failed', e);
        return [] as ApiReservation[];
      }),
      api.messages.threads().catch((e) => {
        console.warn('messages.threads failed', e);
        return [] as { unreadCount: number }[];
      }),
    ]).then(([rs, ths]) => {
      setReservations(rs.map(apiToDisplay));
      setUnread(ths.reduce((s, t) => s + (t.unreadCount ?? 0), 0));
    });
  }, []);

  const kpis = useMemo(
    () => buildKpis({ todayCount: reservations?.length ?? null, unreadCount: unread }),
    [reservations, unread],
  );

  return (
    <div className="px-6 py-5">
      <section className="grid grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </section>

      <section className="mt-5 grid grid-cols-[1.45fr_1fr] gap-4">
        <Card title="今日の予約">
          {reservations === null ? (
            <p className="py-6 text-center text-xs text-ink-300">読み込み中…</p>
          ) : reservations.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink-300">今日の予約はまだありません</p>
          ) : (
            <TodayReservationsTable data={reservations} />
          )}
          {error && <p className="mt-2 text-[10px] text-red-500">{error}</p>}
        </Card>

        <div className="grid grid-cols-1 gap-4">
          <CtaCard
            title="AI で配信下書き"
            sub="目的・トーンを選ぶだけ"
            Icon={Wand2}
            primary
            href="/admin/broadcast"
            aiBadge
          />
          <CtaCard title="予約を作成" sub="手動で予約を追加" Icon={Calendar} href="/admin/calendar" />
        </div>
      </section>
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const isWarn = kpi.tone === 'warn';
  return (
    <div
      className="rounded-2xl border bg-surface-0 p-4 transition-colors hover:border-ink-300"
      style={{ borderColor: isWarn ? '#f4c4c4' : 'var(--ink-100)' }}
    >
      <div className="flex items-start justify-between">
        <IconChip Icon={kpi.Icon} tone={kpi.tone} size="lg" />
        <Link
          href={kpi.cta.href}
          className="flex items-center gap-0.5 text-[11px] hover:opacity-80"
          style={{ color: 'var(--line-green)' }}
        >
          {kpi.cta.label}
          <ChevronRight size={11} strokeWidth={2.5} />
        </Link>
      </div>
      <p className="mt-3 text-xs text-ink-500">{kpi.label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="numeric text-[32px] leading-none text-ink-900">{kpi.value}</span>
        {kpi.unit && <span className="text-sm text-ink-500">{kpi.unit}</span>}
      </p>
      {kpi.delta && (
        <p
          className="mt-1 flex items-center gap-1 text-[11px]"
          style={{ color: kpi.deltaTone === 'warn' ? '#d64545' : 'var(--line-green)' }}
        >
          <TrendingUp size={12} strokeWidth={2} /> {kpi.delta}
        </p>
      )}
    </div>
  );
}

function IconChip({
  Icon,
  tone,
  size,
}: {
  Icon: LucideIcon;
  tone: Tone;
  size: 'md' | 'lg';
}) {
  const dim = size === 'lg' ? 'h-9 w-9' : 'h-8 w-8';
  const iconSize = size === 'lg' ? 17 : 15;
  const bgMap: Record<Tone, string> = {
    mint: '#e8f6ee',
    line: '#dff5e6',
    lavender: '#ece6f7',
    warn: '#fdecec',
    soft: '#fdeef0',
    ai: 'linear-gradient(135deg, rgba(245,143,184,0.20) 0%, rgba(184,154,236,0.20) 100%)',
  };
  const fgMap: Record<Tone, string> = {
    mint: '#1d7a3a',
    line: '#057a3a',
    lavender: '#5b3e9a',
    warn: '#c03434',
    soft: '#a3457e',
    ai: '#7a4fb5',
  };
  return (
    <span
      className={`${dim} inline-flex items-center justify-center rounded-xl`}
      style={{ background: bgMap[tone] }}
    >
      <Icon size={iconSize} color={fgMap[tone]} strokeWidth={1.75} />
    </span>
  );
}

function Card({
  title,
  right,
  children,
}: {
  title: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-surface-0 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
        {right}
      </div>
      {children}
    </div>
  );
}

function CtaCard({
  title,
  sub,
  Icon,
  href,
  primary,
  aiBadge,
}: {
  title: string;
  sub: string;
  Icon: LucideIcon;
  href: string;
  primary?: boolean;
  aiBadge?: boolean;
}) {
  return (
    <Link
      href={href}
      className="relative flex flex-col justify-between rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
      style={
        primary
          ? { background: 'var(--gradient-primary)', color: '#fff' }
          : { border: '1px solid var(--ink-100)', background: 'var(--surface-0)' }
      }
    >
      {aiBadge && (
        <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
          <Sparkles size={9} strokeWidth={2.25} /> AI
        </span>
      )}
      <Icon size={22} strokeWidth={1.75} color={primary ? '#fff' : 'var(--ink-900)'} />
      <div className="mt-4">
        <p
          className="text-[11px]"
          style={{ color: primary ? 'rgba(255,255,255,0.85)' : 'var(--ink-500)' }}
        >
          {sub}
        </p>
        <p
          className="mt-1 flex items-center gap-1 text-sm font-semibold"
          style={{ color: primary ? '#fff' : 'var(--ink-900)' }}
        >
          {title}
          <ChevronRight size={14} strokeWidth={2.5} />
        </p>
      </div>
    </Link>
  );
}
