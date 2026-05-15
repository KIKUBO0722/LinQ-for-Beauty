import {
  Users,
  Send,
  MailOpen,
  MousePointerClick,
  Footprints,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Kpi = {
  Icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  delta: string;
  spark: number[];
};

const kpis: Kpi[] = [
  {
    Icon: Users,
    label: '友だち増減',
    value: '+128',
    delta: '+12.4%',
    spark: [80, 92, 88, 95, 110, 118, 128],
  },
  {
    Icon: Send,
    label: '配信回数',
    value: '46',
    unit: '回',
    delta: '+8 回',
    spark: [22, 28, 30, 36, 38, 42, 46],
  },
  {
    Icon: MailOpen,
    label: '開封率',
    value: '78.2',
    unit: '%',
    delta: '+3.4%',
    spark: [70, 71, 73, 72, 75, 77, 78],
  },
  {
    Icon: MousePointerClick,
    label: 'CTR',
    value: '12.6',
    unit: '%',
    delta: '+1.1%',
    spark: [9.8, 10.4, 10.9, 11.2, 11.6, 12.1, 12.6],
  },
  {
    Icon: Footprints,
    label: '来店率',
    value: '73.5',
    unit: '%',
    delta: '+5.2%',
    spark: [62, 65, 67, 68, 70, 72, 73.5],
  },
];

const monthlyTrend = [
  { month: '11月', reserved: 240, visited: 210 },
  { month: '12月', reserved: 280, visited: 245 },
  { month: '1月', reserved: 220, visited: 198 },
  { month: '2月', reserved: 260, visited: 232 },
  { month: '3月', reserved: 305, visited: 268 },
  { month: '4月', reserved: 322, visited: 298 },
  { month: '5月', reserved: 360, visited: 312 },
];

const funnelSteps = [
  { Icon: Send, label: '配信', value: 1842, ratio: 1 },
  { Icon: MailOpen, label: '開封', value: 1440, ratio: 0.78 },
  { Icon: MousePointerClick, label: 'クリック', value: 612, ratio: 0.33 },
  { Icon: Footprints, label: '来店', value: 232, ratio: 0.126 },
  { Icon: Sparkles, label: '完了', value: 170, ratio: 0.092 },
];

const segments = [
  { label: 'VIP', value: 92, count: 18 },
  { label: 'リピーター', value: 76, count: 124 },
  { label: '新規', value: 58, count: 86 },
  { label: '失客リスク', value: 34, count: 21 },
  { label: '休眠', value: 12, count: 64 },
];

const menus = [
  { label: 'カラー + トリートメント', value: 88 },
  { label: 'カット + カラー', value: 76 },
  { label: 'パーマ', value: 54 },
  { label: 'ヘッドスパ', value: 42 },
  { label: '白髪染め', value: 38 },
];

const insights = [
  '失客リスク 21 名のうち 7 名が過去にカラー来店経験あり。"カラー戻り" 訴求の配信が刺さりやすい',
  '木曜 18-20 時の配信が CTR +18% (今月平均比)。次回は同時間帯に寄せる推奨',
  '誕生日メッセージのコンバージョン率は VIP 層で 38%、休眠層で 4%。VIP に集中投下',
];

export default function AnalyticsPage() {
  return (
    <div className="px-6 py-5">
      <Phase2Banner
        title="詳細分析は Phase 2 で本実装"
        body="v0.1 では予約 / 未読 LINE の基本 KPI のみダッシュボードに表示。ブロック率 / 配信パフォーマンス / URL クリック / コンバージョン / トラフィック源は 5/30 以降の Phase 2 で順次有効化。"
      />
      <div className="mt-4 mb-4 flex items-center gap-2 text-sm">
        <PeriodPill active>今月</PeriodPill>
        <PeriodPill>先月</PeriodPill>
        <PeriodPill>過去 3 ヶ月</PeriodPill>
        <PeriodPill>カスタム</PeriodPill>
        <button
          type="button"
          className="ml-auto rounded-full border border-ink-100 px-3 py-1.5 text-xs text-ink-700"
        >
          レポートをエクスポート
        </button>
      </div>

      <section className="grid grid-cols-5 gap-3">
        {kpis.map((k) => (
          <KpiCard key={k.label} kpi={k} />
        ))}
      </section>

      <section className="mt-4 grid grid-cols-[1.45fr_1fr] gap-4">
        <Card
          title="予約・来店パフォーマンス"
          right={
            <div className="flex gap-1 text-xs">
              <PeriodPill active>月別</PeriodPill>
              <PeriodPill>週別</PeriodPill>
              <PeriodPill>日別</PeriodPill>
            </div>
          }
        >
          <LineChart data={monthlyTrend} />
          <div className="mt-3 flex items-center gap-4 text-xs text-ink-500">
            <LegendDot color="var(--line-green)" label="予約数" />
            <LegendDot color="#5b3e9a" label="来店数" />
          </div>
        </Card>

        <Card title="配信ファネル" right={<MiniNote>今月</MiniNote>}>
          <ul className="space-y-2.5">
            {funnelSteps.map((f) => (
              <li key={f.label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-ink-700">
                    <f.Icon size={13} strokeWidth={1.75} className="text-ink-500" />
                    {f.label}
                  </span>
                  <span className="text-ink-500">
                    <span className="numeric text-ink-900">
                      {f.value.toLocaleString()}
                    </span>
                    <span className="ml-1 text-[10px]">
                      ({(f.ratio * 100).toFixed(1)}%)
                    </span>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-100">
                  <div
                    className="h-full"
                    style={{
                      width: `${f.ratio * 100}%`,
                      background: 'var(--line-green)',
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mt-4 grid grid-cols-3 gap-4">
        <Card title="セグメント別反応" right={<MiniNote>反応率</MiniNote>}>
          <ul className="space-y-2.5">
            {segments.map((s) => (
              <li key={s.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-ink-700">{s.label}</span>
                  <span className="text-ink-500">
                    <span className="numeric text-ink-900">{s.value}</span>%
                    <span className="ml-1 text-[10px]">({s.count} 名)</span>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-100">
                  <div
                    className="h-full"
                    style={{
                      width: `${s.value}%`,
                      background: '#5b3e9a',
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="人気メニュー反応" right={<MiniNote>クリック率</MiniNote>}>
          <ul className="space-y-2.5">
            {menus.map((m) => (
              <li key={m.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="truncate text-ink-700">{m.label}</span>
                  <span className="numeric text-ink-900">{m.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-100">
                  <div
                    className="h-full"
                    style={{
                      width: `${m.value}%`,
                      background: 'var(--line-green)',
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="AI インサイト"
          right={
            <span className="flex items-center gap-1 text-[10px] text-ink-500">
              <Sparkles size={11} strokeWidth={1.75} />
              自動生成 · 3 件
            </span>
          }
        >
          <ul className="space-y-3">
            {insights.map((text, i) => (
              <li
                key={i}
                className="rounded-xl border border-ink-100 p-3 text-xs leading-relaxed text-ink-700"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(245,143,184,0.06) 0%, rgba(184,154,236,0.06) 100%)',
                }}
              >
                <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                  <Sparkles size={10} strokeWidth={2} />
                  Insight {i + 1}
                </span>
                {text}
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-surface-0 p-4">
      <div className="flex items-center justify-between">
        <kpi.Icon size={16} strokeWidth={1.75} className="text-ink-700" />
        <span
          className="flex items-center gap-0.5 text-[10px]"
          style={{ color: 'var(--line-green)' }}
        >
          <TrendingUp size={10} strokeWidth={2.25} />
          {kpi.delta}
        </span>
      </div>
      <p className="mt-2 text-[11px] text-ink-500">{kpi.label}</p>
      <p className="mt-0.5 flex items-baseline gap-1">
        <span className="numeric text-2xl leading-none text-ink-900">{kpi.value}</span>
        {kpi.unit && <span className="text-xs text-ink-500">{kpi.unit}</span>}
      </p>
      <Sparkline points={kpi.spark} />
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const w = 120;
  const h = 32;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const coords = points
    .map((p, i) => `${i * step},${h - ((p - min) / range) * (h - 4) - 2}`)
    .join(' ');
  const areaCoords = `0,${h} ${coords} ${w},${h}`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mt-2 w-full"
      preserveAspectRatio="none"
      height={32}
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--line-green)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--line-green)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaCoords} fill="url(#sparkFill)" />
      <polyline
        points={coords}
        fill="none"
        stroke="var(--line-green)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LineChart({
  data,
}: {
  data: { month: string; reserved: number; visited: number }[];
}) {
  const w = 640;
  const h = 200;
  const padding = { top: 12, right: 12, bottom: 24, left: 32 };
  const all = data.flatMap((d) => [d.reserved, d.visited]);
  const min = Math.floor(Math.min(...all) / 50) * 50;
  const max = Math.ceil(Math.max(...all) / 50) * 50;
  const range = max - min || 1;
  const innerW = w - padding.left - padding.right;
  const innerH = h - padding.top - padding.bottom;
  const step = innerW / (data.length - 1);

  const project = (val: number, i: number) => ({
    x: padding.left + i * step,
    y: padding.top + innerH - ((val - min) / range) * innerH,
  });

  const line = (key: 'reserved' | 'visited') =>
    data
      .map((d, i) => {
        const p = project(d[key], i);
        return `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`;
      })
      .join(' ');

  const yTicks = 4;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = padding.top + (innerH / yTicks) * i;
        const val = max - (range / yTicks) * i;
        return (
          <g key={i}>
            <line
              x1={padding.left}
              x2={w - padding.right}
              y1={y}
              y2={y}
              stroke="var(--ink-100)"
              strokeWidth="1"
            />
            <text
              x={padding.left - 6}
              y={y + 3}
              textAnchor="end"
              fontSize="9"
              fill="var(--ink-500)"
            >
              {Math.round(val)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const x = padding.left + i * step;
        return (
          <text
            key={d.month}
            x={x}
            y={h - 6}
            textAnchor="middle"
            fontSize="10"
            fill="var(--ink-500)"
          >
            {d.month}
          </text>
        );
      })}
      <path d={line('reserved')} stroke="var(--line-green)" strokeWidth="2" fill="none" />
      <path d={line('visited')} stroke="#5b3e9a" strokeWidth="2" fill="none" />
      {data.map((d, i) => {
        const r = project(d.reserved, i);
        const v = project(d.visited, i);
        return (
          <g key={i}>
            <circle cx={r.x} cy={r.y} r="3" fill="var(--line-green)" />
            <circle cx={v.x} cy={v.y} r="3" fill="#5b3e9a" />
          </g>
        );
      })}
    </svg>
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
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function PeriodPill({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={
        active
          ? 'rounded-full px-2.5 py-1 text-xs font-medium text-white'
          : 'rounded-full bg-surface-100 px-2.5 py-1 text-xs text-ink-500'
      }
      style={active ? { background: 'var(--line-green)' } : undefined}
    >
      {children}
    </span>
  );
}

function MiniNote({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] text-ink-500">{children}</span>;
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function Phase2Banner({ title, body }: { title: string; body: string }) {
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
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-white"
          style={{ background: 'var(--gradient-primary)' }}
        >
          <Sparkles size={16} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            Phase 2 Preview
          </p>
          <p className="mt-0.5 text-sm font-semibold text-ink-900">{title}</p>
          <p className="mt-1 text-[11px] text-ink-500">{body}</p>
        </div>
      </div>
    </div>
  );
}
