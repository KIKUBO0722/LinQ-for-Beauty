'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Send,
  Repeat,
  TrendingDown,
  Footprints,
  Sparkles,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  api,
  TENANT_ID,
  type AnalyticsKpis,
  type DailyPoint,
  type Location,
} from '@/lib/api';

type PeriodKey = '7d' | '30d' | '90d';

const PERIOD_LABELS: Record<PeriodKey, string> = {
  '7d': '直近 7 日',
  '30d': '直近 30 日',
  '90d': '直近 90 日',
};

function periodToRange(p: PeriodKey): { from: string; to: string } {
  const days = p === '7d' ? 7 : p === '30d' ? 30 : 90;
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<PeriodKey>('30d');
  const [locationId, setLocationId] = useState<string>('');
  const [locations, setLocations] = useState<Location[]>([]);
  const [kpis, setKpis] = useState<AnalyticsKpis | null>(null);
  const [daily, setDaily] = useState<DailyPoint[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = periodToRange(period);
      const [k, d, locs] = await Promise.all([
        api.analytics.getKpis(from, to, locationId || undefined),
        api.analytics.getDaily(from, to, locationId || undefined),
        api.locations.list(),
      ]);
      setKpis(k);
      setDaily(d);
      setLocations(locs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [period, locationId]);

  useEffect(() => {
    if (TENANT_ID) refresh();
  }, [refresh]);

  return (
    <div className="px-6 py-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">分析 (数字で見る成果指標)</h1>
          <p className="mt-1 text-sm text-ink-500">
            新規 / リピート / 失客 / 平均単価 / 拠点別 を期間別で確認。コホート (= 週次定着率) / 流入元 / URL クリック追跡 / コンバージョン目標 は Day 15 で追加予定。
          </p>
        </div>
        {loading && <Loader2 className="h-5 w-5 animate-spin text-ink-400" />}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center gap-2 text-sm">
        {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={
              period === p
                ? 'rounded-full px-3 py-1 text-xs font-medium text-white'
                : 'rounded-full bg-surface-100 px-3 py-1 text-xs text-ink-500 hover:bg-surface-200'
            }
            style={period === p ? { background: 'var(--line-green)' } : undefined}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
          className="ml-2 rounded-full border border-ink-100 bg-white px-3 py-1 text-xs text-ink-700"
        >
          <option value="">全拠点</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      {kpis && (
        <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <KpiCard
            Icon={Users}
            label="新規顧客"
            value={String(kpis.newCustomers.value)}
            unit="名"
            delta={formatDelta(kpis.newCustomers.deltaPct)}
            spark={(daily ?? []).map((d) => d.newCustomers)}
          />
          <KpiCard
            Icon={Send}
            label="期間内予約数"
            value={String(kpis.totalReservations.value)}
            unit="件"
            delta={formatDelta(kpis.totalReservations.deltaPct)}
            spark={(daily ?? []).map((d) => d.reservations)}
          />
          <KpiCard
            Icon={Repeat}
            label="リピート率"
            value={String(kpis.repeatRate.value)}
            unit="%"
            spark={[]}
          />
          <KpiCard
            Icon={TrendingDown}
            label="失客率 (60 日基準)"
            value={String(kpis.churnRate.value)}
            unit="%"
            spark={[]}
          />
          <KpiCard
            Icon={Footprints}
            label="平均単価"
            value={kpis.avgPrice.value > 0 ? `¥${kpis.avgPrice.value.toLocaleString()}` : '—'}
            spark={[]}
          />
        </section>
      )}

      <section className="mt-4 grid grid-cols-[1.45fr_1fr] gap-4">
        <Card title="日次 予約 / 来店">
          {daily && daily.length > 0 ? (
            <DailyLineChart data={daily} />
          ) : (
            <p className="text-xs text-ink-400">データがありません</p>
          )}
          <div className="mt-3 flex items-center gap-4 text-xs text-ink-500">
            <LegendDot color="var(--line-green)" label="予約数" />
            <LegendDot color="#5b3e9a" label="来店数 (status=completed)" />
            <LegendDot color="#f58fb8" label="新規顧客" />
          </div>
        </Card>

        <Card title="拠点別 予約数">
          {kpis && kpis.byLocation.length > 0 ? (
            <ul className="space-y-2.5">
              {kpis.byLocation.map((loc) => {
                const max = Math.max(...kpis.byLocation.map((l) => l.reservationCount), 1);
                return (
                  <li key={loc.locationId}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-ink-700">{loc.locationName}</span>
                      <span className="text-ink-500">
                        <span className="numeric text-ink-900">{loc.reservationCount}</span>
                        <span className="ml-1 text-[10px]">件 / {loc.uniqueCustomers} 名</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-100">
                      <div
                        className="h-full"
                        style={{
                          width: `${(loc.reservationCount / max) * 100}%`,
                          background: 'var(--line-green)',
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-ink-400">
              データがありません (Day 14 で reservations 集計の SQL に課題、Day 15 で改善予定)
            </p>
          )}
        </Card>
      </section>

      <Phase2Note />
    </div>
  );
}

function formatDelta(deltaPct: number | null): string {
  if (deltaPct === null) return '前期間なし';
  const sign = deltaPct >= 0 ? '+' : '';
  return `${sign}${deltaPct}%`;
}

function KpiCard({
  Icon,
  label,
  value,
  unit,
  delta,
  spark,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  spark: number[];
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-surface-0 p-4">
      <div className="flex items-center justify-between">
        <Icon size={16} strokeWidth={1.75} className="text-ink-700" />
        {delta && (
          <span
            className="flex items-center gap-0.5 text-[10px]"
            style={{ color: 'var(--line-green)' }}
          >
            <TrendingUp size={10} strokeWidth={2.25} />
            {delta}
          </span>
        )}
      </div>
      <p className="mt-2 text-[11px] text-ink-500">{label}</p>
      <p className="mt-0.5 flex items-baseline gap-1">
        <span className="numeric text-2xl leading-none text-ink-900">{value}</span>
        {unit && <span className="text-xs text-ink-500">{unit}</span>}
      </p>
      {spark.length > 0 && <Sparkline points={spark} />}
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const w = 120;
  const h = 32;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / Math.max(1, points.length - 1);
  const coords = points
    .map((p, i) => `${i * step},${h - ((p - min) / range) * (h - 4) - 2}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 w-full" preserveAspectRatio="none" height={32}>
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

function DailyLineChart({ data }: { data: DailyPoint[] }) {
  const w = 640;
  const h = 220;
  const padding = { top: 12, right: 12, bottom: 28, left: 36 };
  const all = data.flatMap((d) => [d.reservations, d.visits, d.newCustomers]);
  const min = 0;
  const max = Math.max(1, ...all);
  const innerW = w - padding.left - padding.right;
  const innerH = h - padding.top - padding.bottom;
  const step = innerW / Math.max(1, data.length - 1);

  const project = (val: number, i: number) => ({
    x: padding.left + i * step,
    y: padding.top + innerH - (val / max) * innerH,
  });

  const linePath = (key: keyof Pick<DailyPoint, 'reservations' | 'visits' | 'newCustomers'>) =>
    data
      .map((d, i) => {
        const p = project(d[key], i);
        return `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`;
      })
      .join(' ');

  const yTicks = 4;
  // X 軸ラベル: 最初 / 中央 / 最後 のみ
  const xLabelIndices = [0, Math.floor(data.length / 2), data.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const y = padding.top + (innerH / yTicks) * i;
        const val = max - (max / yTicks) * i;
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
            <text x={padding.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill="var(--ink-500)">
              {Math.round(val)}
            </text>
          </g>
        );
      })}
      {xLabelIndices.map((i) => {
        if (i < 0 || i >= data.length) return null;
        const x = padding.left + i * step;
        const label = data[i].date.slice(5); // MM-DD
        return (
          <text key={i} x={x} y={h - 8} textAnchor="middle" fontSize="10" fill="var(--ink-500)">
            {label}
          </text>
        );
      })}
      <path d={linePath('reservations')} stroke="var(--line-green)" strokeWidth="2" fill="none" />
      <path d={linePath('visits')} stroke="#5b3e9a" strokeWidth="2" fill="none" />
      <path d={linePath('newCustomers')} stroke="#f58fb8" strokeWidth="2" fill="none" />
    </svg>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-surface-0 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function Phase2Note() {
  return (
    <div className="mt-6 rounded-2xl border border-purple-100 bg-purple-50/40 p-4 text-xs text-purple-800">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-purple-600">
        <Sparkles size={11} strokeWidth={2} />
        Day 15 で追加予定
      </div>
      コホート (= 週次定着率) / 流入元 (UTM + QR コード) / URL クリック追跡 / コンバージョン目標 5 種 / ブロック分析 / 配信ファネル詳細
      <br />
      平均単価は services 表に price 列追加後に実値表示。reservations 集計 SQL の課題も Day 15 で解消予定。
    </div>
  );
}
