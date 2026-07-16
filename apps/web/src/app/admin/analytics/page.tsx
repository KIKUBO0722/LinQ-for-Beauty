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
  UserMinus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  api,
  TENANT_ID,
  type AnalyticsKpis,
  type BroadcastFunnel,
  type CohortAnalysis,
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
  const [funnel, setFunnel] = useState<BroadcastFunnel | null>(null);
  const [cohort, setCohort] = useState<CohortAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = periodToRange(period);
      const [k, d, f, c, locs] = await Promise.all([
        api.analytics.getKpis(from, to, locationId || undefined),
        api.analytics.getDaily(from, to, locationId || undefined),
        api.analytics.getBroadcastFunnel(from, to, locationId || undefined),
        api.analytics.getCohort(locationId || undefined),
        api.locations.list(),
      ]);
      setKpis(k);
      setDaily(d);
      setFunnel(f);
      setCohort(c);
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
            新規 / リピート / 失客 / 平均単価 / LINE 友だち削除 / 拠点別 / 流入元 を期間別で確認。コホート (= 月別グループの定着率) / 配信ファネル詳細 は本セッションで追加予定、URL クリック追跡 / コンバージョン目標 は Day 16 以降。
          </p>
        </div>
        {loading && <Loader2 className="h-5 w-5 animate-spin text-ink-300" />}
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
        <section className="grid grid-cols-2 gap-3 md:grid-cols-6">
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
            delta={kpis.avgPrice.value > 0 ? formatDelta(kpis.avgPrice.deltaPct) : undefined}
            spark={[]}
          />
          <KpiCard
            Icon={UserMinus}
            label="LINE 友だち削除"
            value={String(kpis.blockCount.value)}
            unit="件"
            delta={formatDelta(kpis.blockCount.deltaPct)}
            deltaInverse
            spark={[]}
          />
        </section>
      )}

      <section className="mt-4 grid grid-cols-[1.45fr_1fr] gap-4">
        <Card title="日次 予約 / 来店">
          {daily && daily.length > 0 ? (
            <DailyLineChart data={daily} />
          ) : (
            <p className="text-xs text-ink-300">データがありません</p>
          )}
          <div className="mt-3 flex items-center gap-4 text-xs text-ink-500">
            <LegendDot color="var(--line-green)" label="予約数" />
            <LegendDot color="#5b3e9a" label="来店数 (= 完了済予約)" />
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
            <p className="text-xs text-ink-300">期間内の予約がありません</p>
          )}
        </Card>
      </section>

      {funnel && (
        <section className="mt-4">
          <Card title="一斉配信ファネル (= 届いた → 開封した → クリックした の流れ)">
            <BroadcastFunnelView funnel={funnel} />
          </Card>
        </section>
      )}

      <section className="mt-4">
        <Card title="流入元 (= 期間内に新規登録した顧客の流入元別 内訳)">
          {kpis && kpis.bySource.length > 0 ? (
            <ul className="space-y-2.5">
              {kpis.bySource.map((src) => {
                const max = Math.max(...kpis.bySource.map((s) => s.count), 1);
                const total = kpis.bySource.reduce((acc, s) => acc + s.count, 0);
                const pct = total > 0 ? Math.round((src.count / total) * 1000) / 10 : 0;
                return (
                  <li key={src.source}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-ink-700">{src.label}</span>
                      <span className="text-ink-500">
                        <span className="numeric text-ink-900">{src.count}</span>
                        <span className="ml-1 text-[10px]">名 ({pct}%)</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-100">
                      <div
                        className="h-full"
                        style={{
                          width: `${(src.count / max) * 100}%`,
                          background: '#f58fb8',
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-xs text-ink-300">期間内に新規登録した顧客がいません</p>
          )}
        </Card>
      </section>

      {cohort && (
        <section className="mt-4">
          <Card title="コホート分析 (= デビュー月別 × その後 0-5 ヶ月の再来店率)">
            <CohortTable cohort={cohort} />
          </Card>
        </section>
      )}

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
  deltaInverse,
  spark,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  deltaInverse?: boolean;
  spark: number[];
}) {
  // deltaInverse=true (= ブロック等、増えると赤くしたい指標)。値が + で赤、- で緑。
  const deltaIsPositive = delta?.startsWith('+');
  const deltaIsNegative = delta?.startsWith('-');
  let deltaColor = 'var(--ink-500)';
  if (delta && delta !== '前期間なし') {
    if (deltaInverse) {
      deltaColor = deltaIsPositive ? '#e11d48' : deltaIsNegative ? 'var(--line-green)' : 'var(--ink-500)';
    } else {
      deltaColor = deltaIsPositive ? 'var(--line-green)' : deltaIsNegative ? '#e11d48' : 'var(--ink-500)';
    }
  }
  return (
    <div className="rounded-2xl border border-ink-100 bg-surface-0 p-4">
      <div className="flex items-center justify-between">
        <Icon size={16} strokeWidth={1.75} className="text-ink-700" />
        {delta && (
          <span
            className="flex items-center gap-0.5 text-[10px]"
            style={{ color: deltaColor }}
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

function CohortTable({ cohort }: { cohort: CohortAnalysis }) {
  const hasAnyData = cohort.cohorts.some((c) => c.cohortSize > 0);
  if (!hasAnyData) {
    return (
      <p className="text-xs text-ink-300">
        直近 6 ヶ月にデビューしたお客さんがいません (= 集計対象ゼロ)
      </p>
    );
  }
  // セル背景色: rate% に応じて濃淡 (緑系)
  const cellBg = (rate: number | null): string => {
    if (rate === null) return 'transparent';
    if (rate === 0) return 'var(--surface-100)';
    const alpha = Math.min(0.85, 0.1 + rate / 100 * 0.75);
    return `rgba(86, 176, 124, ${alpha})`;
  };
  const cellColor = (rate: number | null): string => {
    if (rate === null) return 'var(--ink-300)';
    if (rate >= 50) return '#ffffff';
    return 'var(--ink-900)';
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-surface-50 text-[10px] text-ink-500">
          <tr>
            <th className="px-3 py-2 text-left font-normal">デビュー月</th>
            <th className="px-3 py-2 text-right font-normal">人数</th>
            {cohort.monthOffsets.map((o) => (
              <th key={o} className="px-3 py-2 text-center font-normal">
                {o === 0 ? 'デビュー月' : `${o} ヶ月後`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohort.cohorts.map((c) => (
            <tr key={c.cohortMonth} className="border-t border-ink-100">
              <td className="px-3 py-2 text-ink-700">{c.cohortMonth}</td>
              <td className="numeric px-3 py-2 text-right text-ink-700">
                {c.cohortSize > 0 ? `${c.cohortSize} 名` : '—'}
              </td>
              {c.retention.map((rate, i) => (
                <td
                  key={i}
                  className="px-3 py-2 text-center"
                  style={{ background: cellBg(rate), color: cellColor(rate) }}
                >
                  {rate === null ? '—' : `${rate}%`}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[10px] text-ink-300">
        セルは「そのデビュー月にデビューしたお客さんのうち、N ヶ月後にも 1 回以上来店した割合」。色が濃いほど定着率が高い。「—」は未来月 (まだ来ていない)
      </p>
    </div>
  );
}

function BroadcastFunnelView({ funnel }: { funnel: BroadcastFunnel }) {
  if (funnel.broadcastCount === 0) {
    return <p className="text-xs text-ink-300">期間内に送信された一斉配信がありません</p>;
  }
  const steps = [
    { label: '送信先', value: funnel.totalRecipients, color: 'var(--line-green)', rate: null },
    { label: '到達', value: funnel.totalDelivered, color: '#56b07c', rate: funnel.deliveryRate },
    { label: '開封', value: funnel.totalOpened, color: '#5b3e9a', rate: funnel.openRate },
    { label: 'クリック', value: funnel.totalClicked, color: '#f58fb8', rate: funnel.clickRate },
  ];
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {steps.map((s) => (
          <div key={s.label} className="rounded-xl border border-ink-100 bg-surface-50 p-3">
            <p className="text-[10px] text-ink-500">{s.label}</p>
            <p className="mt-1 flex items-baseline gap-1">
              <span className="numeric text-xl text-ink-900">{s.value.toLocaleString()}</span>
              <span className="text-[10px] text-ink-500">人</span>
            </p>
            {s.rate !== null && (
              <p className="mt-0.5 text-[10px]" style={{ color: s.color }}>
                送信先比 {s.rate}%
              </p>
            )}
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-[10px] text-ink-500">ファネル可視化 (= 横棒の長さが各段階の人数)</p>
        <ul className="space-y-1.5">
          {steps.map((s) => (
            <li key={s.label}>
              <div className="mb-0.5 flex items-center justify-between text-[10px]">
                <span className="text-ink-700">{s.label}</span>
                <span className="numeric text-ink-500">{s.value.toLocaleString()}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-100">
                <div
                  className="h-full"
                  style={{ width: `${(s.value / max) * 100}%`, background: s.color }}
                />
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-4 gap-3 rounded-xl bg-surface-50 p-3 text-center">
        <RateBox label="配信数" value={`${funnel.broadcastCount}`} unit="本" />
        <RateBox label="開封率" value={`${funnel.openRate}`} unit="%" />
        <RateBox label="クリック率" value={`${funnel.clickRate}`} unit="%" />
        <RateBox label="開封者クリック率" value={`${funnel.ctOr}`} unit="%" hint="開いた人のうちクリックした率" />
      </div>

      {funnel.recent.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] text-ink-500">最近の配信 5 件</p>
          <div className="overflow-hidden rounded-xl border border-ink-100">
            <table className="w-full text-xs">
              <thead className="bg-surface-50 text-[10px] text-ink-500">
                <tr>
                  <th className="px-3 py-2 text-left font-normal">配信</th>
                  <th className="px-3 py-2 text-right font-normal">送信先</th>
                  <th className="px-3 py-2 text-right font-normal">開封</th>
                  <th className="px-3 py-2 text-right font-normal">クリック</th>
                  <th className="px-3 py-2 text-right font-normal">削除</th>
                </tr>
              </thead>
              <tbody>
                {funnel.recent.map((r) => (
                  <tr key={r.broadcastId} className="border-t border-ink-100">
                    <td className="px-3 py-2 text-ink-700">
                      <p className="truncate">{r.title}</p>
                      <p className="text-[10px] text-ink-300">{new Date(r.sentAt).toLocaleString('ja-JP')}</p>
                    </td>
                    <td className="numeric px-3 py-2 text-right text-ink-700">{r.recipientCount}</td>
                    <td className="numeric px-3 py-2 text-right text-ink-700">{r.responseCount || '—'}</td>
                    <td className="numeric px-3 py-2 text-right text-ink-700">{r.clickCount || '—'}</td>
                    <td className="numeric px-3 py-2 text-right text-ink-700">{r.blockCount || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function RateBox({ label, value, unit, hint }: { label: string; value: string; unit: string; hint?: string }) {
  return (
    <div>
      <p className="text-[10px] text-ink-500">{label}</p>
      <p className="mt-0.5 flex items-baseline justify-center gap-0.5">
        <span className="numeric text-base text-ink-900">{value}</span>
        <span className="text-[10px] text-ink-500">{unit}</span>
      </p>
      {hint && <p className="mt-0.5 text-[9px] text-ink-300">{hint}</p>}
    </div>
  );
}

function Phase2Note() {
  return (
    <div className="mt-6 rounded-2xl border border-purple-100 bg-purple-50/40 p-4 text-xs text-purple-800">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-purple-600">
        <Sparkles size={11} strokeWidth={2} />
        Day 16 以降で追加予定
      </div>
      URL クリック追跡 (= 配信メッセージのリンクが何回押されたか) / コンバージョン目標 5 種 (= 友だち追加 → 予約 等の達成率) / UTM パラメータ + QR コード生成
    </div>
  );
}
