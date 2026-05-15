'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Calendar,
  MessageSquare,
  UserPlus,
  AlertTriangle,
  Send,
  MailOpen,
  MousePointerClick,
  Footprints,
  ChevronRight,
  TrendingUp,
  Sparkles,
  Wand2,
  BotMessageSquare,
  ScanSearch,
  FileText,
  Lightbulb,
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
      cta: { label: 'リストを見る', href: '#' },
    },
  ];
}

type AISuggestion = {
  Icon: LucideIcon;
  tone: Tone;
  title: string;
  reason: string;
  cta: string;
};

const aiSuggestions: AISuggestion[] = [
  {
    Icon: Wand2,
    tone: 'ai',
    title: '失客リスク 21 名のうち 7 名が "カラー戻り" 訴求で動く可能性',
    reason: '過去 6 ヶ月のカラー来店履歴 + 直近開封率から推定',
    cta: '配信ドラフトを作成',
  },
  {
    Icon: BotMessageSquare,
    tone: 'line',
    title: '未読 LINE 5 件のうち 3 件は AI 自動応答候補あり',
    reason: '料金 / 予約変更 / メニュー紹介の定型質問',
    cta: 'AI 返信を確認',
  },
  {
    Icon: Sparkles,
    tone: 'lavender',
    title: '木曜 18-20 時の配信が CTR +18% (今月平均比)',
    reason: '過去 8 週間の配信ログから検出',
    cta: '配信枠を予約',
  },
];

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
  const locationName = r.locations?.name ?? '東京';
  const location: Reservation['location'] = locationName.includes('相生') ? '相生' : '東京';
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

const PLACEHOLDER_RESERVATIONS: Reservation[] = [
  {
    id: '1',
    time: '10:00',
    name: '山田 花子',
    initial: '山',
    avatarTone: 'peach',
    menu: 'カット + カラー',
    status: '確定',
    phone: '090-1234-5678',
    birthday: '3 月 12 日',
    visits: 8,
    lastVisit: '2026/04/05',
    staff: '平山',
    location: '東京',
    memo: '前回トーン 7、艶感を希望。会話は控えめ',
  },
  {
    id: '2',
    time: '11:30',
    name: '佐藤 美咲',
    initial: '佐',
    avatarTone: 'lavender',
    menu: 'パーマ',
    status: '確定',
    aiTag: 'AI 事前ヒアリング済',
    phone: '080-2345-6789',
    birthday: '9 月 14 日',
    visits: 12,
    lastVisit: '2026/04/22',
    staff: '平山',
    location: '東京',
    memo: 'ロッドはミディアム、根元はゆるめ希望',
    aiInsight:
      'カラー履歴 6 回、平均間隔 42 日。次回は 6 月上旬にダークブラウンの提案で再来店率が高くなる傾向。',
  },
  {
    id: '3',
    time: '13:00',
    name: '鈴木 さくら',
    initial: '鈴',
    avatarTone: 'mint',
    menu: 'トリートメント',
    status: '未確定',
    aiTag: 'AI 確認 DM 送信中',
    phone: '070-3456-7890',
    birthday: '7 月 3 日',
    visits: 4,
    lastVisit: '2026/03/18',
    staff: '佐々木',
    location: '相生',
    memo: '',
    aiInsight:
      '前回より 60 日経過。返信なしのまま 24h を超えると失客リスク。今日 17:00 までに自動再リマインダーを送る予定。',
  },
  {
    id: '4',
    time: '14:30',
    name: '田中 真理',
    initial: '田',
    avatarTone: 'sky',
    menu: 'カット',
    status: '確定',
    phone: '090-4567-8901',
    birthday: '11 月 28 日',
    visits: 22,
    lastVisit: '2026/04/30',
    staff: '本田',
    location: '東京',
    memo: 'VIP 顧客、来店時は紅茶 (アールグレイ)',
  },
  {
    id: '5',
    time: '16:00',
    name: '伊藤 由美',
    initial: '伊',
    avatarTone: 'sand',
    menu: 'カラー + ヘッドスパ',
    status: '確定',
    aiTag: 'AI カウンセリング有',
    phone: '080-5678-9012',
    birthday: '5 月 30 日',
    visits: 15,
    lastVisit: '2026/04/12',
    staff: '平山',
    location: '東京',
    memo: '頭皮の乾燥が気になる。スパは指圧強め',
    aiInsight:
      '誕生月。誕生日メッセージ + 10% OFF クーポンの自動配信が予約済 (5/28 朝)。',
  },
];

const reservationFilters = ['すべて', '確定', '未確定', 'AI 介在'];

const aiKpis = [
  { Icon: BotMessageSquare, label: 'AI 自動応答率', value: '68', unit: '%', delta: '+8.2%', sub: '今月の AI 返信 218 / 322 件' },
  { Icon: ScanSearch, label: 'AI が見つけた候補', value: '46', unit: '名', delta: '今週 +12', sub: '再来店 / 失客 / 誕生日セグメント合計' },
  { Icon: FileText, label: 'AI 生成下書き', value: '7', unit: '件', delta: '配信 4 / シナリオ 3', sub: '承認待ちの AI ドラフト' },
];

const distributionKpis = [
  { Icon: Send, label: '配信数', value: '1,842', delta: '+128', deltaLabel: '前日比' },
  { Icon: MailOpen, label: '開封数', value: '812', delta: '78.2%', deltaLabel: '開封率' },
  { Icon: MousePointerClick, label: 'クリック数', value: '286', delta: '34.0%', deltaLabel: 'CTR' },
  { Icon: Footprints, label: '来店率', value: '78.2', unit: '%', delta: '+3.4', deltaLabel: '前月比' },
];

const aiDigest = [
  {
    title: '今週ハイライト',
    body: '東京拠点の予約数が前週比 +18%。新規友だち 32 名のうち 9 名が当日中に予約完了 (AI ウィザード経由)',
  },
  {
    title: '注意したい兆候',
    body: '失客リスク層 (60 日以上来店なし) が +4 名。VIP 12 名のうち 3 名が直近 4 ヶ月未来店',
  },
  {
    title: '推奨アクション',
    body: 'カラー戻りキャンペーンを木曜 18:00 配信に設定すると、推定来店転換 +6〜9 名',
  },
];

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
  const todayReservations = reservations ?? PLACEHOLDER_RESERVATIONS;

  return (
    <div className="px-6 py-5">
      <AiCopilotBanner />

      <section className="mt-4 grid grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </section>

      <section className="mt-5 grid grid-cols-[1.45fr_1fr] gap-4">
        <Card title="今日の予約" right={<ReservationFilters />}>
          {reservations === null ? (
            <p className="py-6 text-center text-xs text-ink-300">読み込み中…</p>
          ) : reservations.length === 0 ? (
            <p className="py-6 text-center text-xs text-ink-300">
              今日の予約はまだありません
            </p>
          ) : (
            <TodayReservationsTable data={todayReservations} />
          )}
          {error && <p className="mt-2 text-[10px] text-red-500">{error}</p>}
        </Card>

        <Card
          title={
            <span className="flex items-center gap-1.5">
              <Sparkles size={13} strokeWidth={2} style={{ color: '#b89aec' }} />
              AI 提案アクション
            </span>
          }
          right={<MiniLink label="すべて表示" href="#" />}
        >
          <ul className="space-y-2">
            {aiSuggestions.map((s, i) => (
              <li key={i}>
                <Link
                  href="#"
                  className="group flex items-start gap-3 rounded-xl border px-3 py-2.5 backdrop-blur-md transition-all hover:-translate-y-0.5"
                  style={{
                    borderColor: 'rgba(255,255,255,0.65)',
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(245,143,184,0.05) 100%)',
                  }}
                >
                  <IconChip Icon={s.Icon} tone={s.tone} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-snug text-ink-900">{s.title}</p>
                    <p className="mt-0.5 text-[10px] text-ink-500">{s.reason}</p>
                    <p
                      className="mt-1.5 flex items-center gap-0.5 text-[11px] font-semibold"
                      style={{ color: 'var(--line-green)' }}
                    >
                      {s.cta}
                      <ChevronRight size={11} strokeWidth={2.5} />
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-ink-300">
            <Sparkles size={10} strokeWidth={2} /> 30 分前に AI が再計算
          </p>
        </Card>
      </section>

      <section className="mt-5 grid grid-cols-3 gap-4">
        {aiKpis.map((k) => (
          <AiKpiCard key={k.label} kpi={k} />
        ))}
      </section>

      <section className="mt-5 grid grid-cols-[1.45fr_1fr] gap-4">
        <Card
          title="配信 - 予約 / 来店パフォーマンス"
          right={
            <div className="flex gap-1 text-xs text-ink-500">
              <Pill active>今月</Pill>
              <Pill>先月</Pill>
              <Pill>過去 3 ヶ月</Pill>
            </div>
          }
        >
          <div className="grid grid-cols-4 gap-3">
            {distributionKpis.map((d) => (
              <div key={d.label} className="rounded-xl bg-surface-50 px-3 py-3">
                <div className="flex items-center justify-between">
                  <d.Icon size={16} className="text-ink-700" strokeWidth={1.75} />
                  <span className="text-[10px] text-ink-500">{d.deltaLabel}</span>
                </div>
                <p className="mt-2 flex items-baseline gap-1">
                  <span className="numeric text-2xl leading-none text-ink-900">{d.value}</span>
                  {d.unit && <span className="text-xs text-ink-500">{d.unit}</span>}
                </p>
                <p className="mt-1 text-xs text-ink-500">{d.label}</p>
                <p
                  className="mt-2 flex items-center gap-1 text-[11px]"
                  style={{ color: 'var(--line-green)' }}
                >
                  <TrendingUp size={12} strokeWidth={2} /> {d.delta}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <CtaCard
            title="AI で配信下書き"
            sub="目的・トーンを選ぶだけ"
            Icon={Wand2}
            primary
            href="/admin/broadcast"
            aiBadge
          />
          <CtaCard
            title="予約を作成"
            sub="手動で予約を追加"
            Icon={Calendar}
            href="/admin/calendar"
          />
        </div>
      </section>

      <section className="mt-5">
        <Card
          title={
            <span className="flex items-center gap-1.5">
              <Lightbulb size={13} strokeWidth={2} style={{ color: '#b89aec' }} />
              今週の AI ダイジェスト
            </span>
          }
          right={
            <div className="flex items-center gap-2 text-[10px] text-ink-500">
              <span>5/12 - 5/18</span>
              <button
                type="button"
                className="rounded-full border border-ink-100 px-2.5 py-1 hover:text-ink-900"
              >
                レポート全文を見る
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-3 gap-3">
            {aiDigest.map((d) => (
              <div
                key={d.title}
                className="relative overflow-hidden rounded-xl border p-3 backdrop-blur-md"
                style={{
                  borderColor: 'rgba(255,255,255,0.6)',
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.78) 0%, rgba(245,143,184,0.06) 50%, rgba(184,154,236,0.08) 100%)',
                  boxShadow: '0 8px 24px -16px rgba(184,154,236,0.30)',
                }}
              >
                <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                  <Sparkles size={10} strokeWidth={2} />
                  {d.title}
                </p>
                <p className="text-xs leading-relaxed text-ink-700">{d.body}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

function AiCopilotBanner() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-4 backdrop-blur-xl"
      style={{
        borderColor: 'rgba(255,255,255,0.6)',
        background:
          'linear-gradient(120deg, rgba(245,143,184,0.14) 0%, rgba(184,154,236,0.14) 60%, rgba(255,255,255,0.55) 100%)',
        boxShadow:
          '0 16px 40px -20px rgba(184,154,236,0.35), inset 0 1px 0 rgba(255,255,255,0.7)',
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-40 blur-3xl"
        style={{ background: 'var(--gradient-primary)' }}
      />
      <div className="flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white"
          style={{ background: 'var(--gradient-primary)' }}
        >
          <Sparkles size={20} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-ink-500">
            AI Copilot
            <span
              className="rounded-full px-1.5 py-0.5 text-[9px]"
              style={{ background: 'var(--gradient-soft)', color: '#5b3e9a' }}
            >
              今日の優先 3 件
            </span>
          </p>
          <p className="mt-1 text-sm font-semibold text-ink-900">
            失客リスク 21 名のうち 7 名は <span style={{ color: '#a3457e' }}>"カラー戻り"</span> 訴求で動く可能性が高いです。木曜 18:00 の配信枠に組み込みますか？
          </p>
          <p className="mt-1 text-[11px] text-ink-500">
            根拠: 過去 6 ヶ月のカラー来店履歴 + 直近開封率 / 同セグメントの過去 CV 率 21%
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            className="rounded-full border border-ink-100 bg-surface-0 px-3 py-1.5 text-xs text-ink-700 hover:bg-surface-50"
          >
            あとで
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold text-white"
            style={{ background: 'var(--gradient-primary)' }}
          >
            <Wand2 size={12} strokeWidth={2} />
            配信ドラフトを作る
          </button>
        </div>
      </div>
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

function AiKpiCard({
  kpi,
}: {
  kpi: { Icon: LucideIcon; label: string; value: string; unit?: string; delta: string; sub: string };
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-4 backdrop-blur-xl"
      style={{
        borderColor: 'rgba(255,255,255,0.7)',
        background:
          'linear-gradient(135deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.62) 100%)',
        boxShadow:
          '0 12px 32px -16px rgba(184,154,236,0.30), inset 0 1px 0 rgba(255,255,255,0.8)',
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-30 blur-2xl"
        style={{ background: 'var(--gradient-primary)' }}
      />
      <div className="flex items-center justify-between">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
          style={{ background: 'var(--gradient-primary)' }}
        >
          <kpi.Icon size={16} strokeWidth={1.75} />
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[10px]"
          style={{ background: 'var(--gradient-soft)', color: '#5b3e9a' }}
        >
          AI
        </span>
      </div>
      <p className="mt-3 text-xs text-ink-500">{kpi.label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="numeric text-[28px] leading-none text-ink-900">{kpi.value}</span>
        {kpi.unit && <span className="text-sm text-ink-500">{kpi.unit}</span>}
      </p>
      <p
        className="mt-1 flex items-center gap-1 text-[11px]"
        style={{ color: 'var(--line-green)' }}
      >
        <TrendingUp size={12} strokeWidth={2} /> {kpi.delta}
      </p>
      <p className="mt-2 text-[10px] text-ink-500">{kpi.sub}</p>
    </div>
  );
}

export function IconChip({
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

function ReservationFilters() {
  return (
    <div className="flex gap-1 text-xs">
      {reservationFilters.map((f, i) => (
        <Pill key={f} active={i === 0}>
          {f}
        </Pill>
      ))}
    </div>
  );
}

function Pill({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className={
        active
          ? 'rounded-full px-2.5 py-1 font-medium text-white'
          : 'rounded-full bg-surface-100 px-2.5 py-1 text-ink-500'
      }
      style={active ? { background: 'var(--line-green)' } : undefined}
    >
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
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

function MiniLink({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-0.5 text-xs hover:opacity-80"
      style={{ color: 'var(--line-green)' }}
    >
      {label}
      <ChevronRight size={11} strokeWidth={2.5} />
    </Link>
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
        <span
          className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm"
        >
          <Sparkles size={9} strokeWidth={2.25} /> AI
        </span>
      )}
      <Icon
        size={22}
        strokeWidth={1.75}
        color={primary ? '#fff' : 'var(--ink-900)'}
      />
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
