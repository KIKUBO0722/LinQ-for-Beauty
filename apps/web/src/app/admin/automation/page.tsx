import {
  HandHeart,
  Bell,
  HeartHandshake,
  Cake,
  Wand2,
  UserPlus,
  MessageCircle,
  Clock,
  Ticket,
  Star,
  Plus,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Scenario = {
  id: string;
  name: string;
  Icon: LucideIcon;
  status: 'on' | 'off' | 'draft';
  runs: number;
  active?: boolean;
};

const scenarios: Scenario[] = [
  { id: '1', name: '初回あいさつ', Icon: HandHeart, status: 'on', runs: 1842, active: true },
  { id: '2', name: '予約前リマインド', Icon: Bell, status: 'on', runs: 612 },
  { id: '3', name: '来店後フォロー', Icon: HeartHandshake, status: 'on', runs: 488 },
  { id: '4', name: '誕生日メッセージ', Icon: Cake, status: 'on', runs: 56 },
  { id: '5', name: '失客フォロー', Icon: Wand2, status: 'draft', runs: 0 },
];

const scenarioFlow: { Icon: LucideIcon; title: string; sub: string }[] = [
  { Icon: UserPlus, title: '友だち追加', sub: 'LINE 友だち登録時' },
  { Icon: MessageCircle, title: 'あいさつメッセージ', sub: '即時 / テキスト' },
  { Icon: Clock, title: '1 時間後フォロー', sub: 'メニュー案内カード' },
  { Icon: Ticket, title: 'クーポン送付', sub: '初回 ¥500 OFF' },
  { Icon: Star, title: 'ロイヤル誘導', sub: '3 日後 / 予約導線' },
];

const conditions = [
  { label: '対象', value: '新規友だち追加 (全拠点)' },
  { label: '除外', value: '既存お客様 / フォロー解除済み' },
  { label: '実行頻度', value: '1 友だちにつき 1 回まで' },
  { label: '配信時間帯', value: '9:00 - 21:00 (Asia/Tokyo)' },
];

const summary = [
  { label: '配信数', value: '1,842', delta: '+128' },
  { label: '開封率', value: '78.2', unit: '%', delta: '+3.4%' },
  { label: 'クリック率', value: '12.6', unit: '%', delta: '+1.1%' },
  { label: 'コンバージョン', value: '0.6', unit: '%', delta: '+0.2%' },
];

export default function AutomationPage() {
  return (
    <div className="px-6 py-5">
      <section className="grid grid-cols-[1.1fr_1.4fr] gap-4">
        <Card title="自動化シナリオ" right={<NewBtn />}>
          <ul className="space-y-2">
            {scenarios.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-50"
                  style={s.active ? { background: '#e8f6ee' } : undefined}
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{ background: '#e8f6ee' }}
                  >
                    <s.Icon size={16} strokeWidth={1.75} color="#1d7a3a" />
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {s.name}
                    </p>
                    <p className="text-[11px] text-ink-500">
                      配信実績 <span className="numeric">{s.runs.toLocaleString()}</span>
                    </p>
                  </div>
                  <StatusToggle status={s.status} />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card
          title="選択中のシナリオ"
          right={
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-semibold text-white"
              style={{ background: 'var(--line-green)' }}
            >
              稼働中
            </span>
          }
        >
          <div className="flex items-center gap-3">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: '#e8f6ee' }}
            >
              <HandHeart size={22} strokeWidth={1.75} color="#1d7a3a" />
            </span>
            <div>
              <p className="text-base font-semibold text-ink-900">初回あいさつ</p>
              <p className="text-xs text-ink-500">
                LINE 友だち追加から 1 時間以内に挨拶 + メニュー + クーポンを連投
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            <StatBox label="実行数" value="35" unit="件" />
            <StatBox label="完了数" value="24" unit="件" />
            <StatBox label="完了率" value="68" unit="%" />
            <StatBox label="平均時間" value="51" unit="分" />
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-full border border-ink-100 px-3 py-2 text-xs text-ink-700"
            >
              評価を見る
            </button>
            <button
              type="button"
              className="flex-1 rounded-full px-3 py-2 text-xs font-semibold text-white"
              style={{ background: 'var(--line-green)' }}
            >
              フローを編集
            </button>
          </div>
        </Card>
      </section>

      <section className="mt-4">
        <Card title="シナリオフロー" right={<MiniNote>5 ステップ · 平均 1.5 日で完走</MiniNote>}>
          <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
            {scenarioFlow.map((step, i) => (
              <div key={step.title} className="flex items-stretch gap-2">
                <FlowNode index={i + 1} step={step} />
                {i < scenarioFlow.length - 1 && <FlowArrow />}
              </div>
            ))}
            <div className="ml-2 flex shrink-0 items-center">
              <button
                type="button"
                className="flex items-center gap-1 rounded-full border border-ink-100 px-3 py-2 text-xs text-ink-700"
              >
                <Plus size={13} strokeWidth={2} />
                ステップ追加
              </button>
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-4 grid grid-cols-[1fr_1fr] gap-4">
        <Card title="条件 / 分岐">
          <ul className="space-y-2 text-sm">
            {conditions.map((c) => (
              <li
                key={c.label}
                className="flex items-start justify-between gap-3 rounded-xl bg-surface-50 px-3 py-2.5"
              >
                <span className="text-xs text-ink-500">{c.label}</span>
                <span className="text-right text-ink-900">{c.value}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="効果サマリー" right={<MiniNote>過去 30 日</MiniNote>}>
          <div className="grid grid-cols-4 gap-2">
            {summary.map((s) => (
              <div key={s.label} className="rounded-xl bg-surface-50 px-3 py-3 text-center">
                <p className="text-[10px] text-ink-500">{s.label}</p>
                <p className="mt-1 flex items-baseline justify-center gap-1">
                  <span className="numeric text-xl text-ink-900">{s.value}</span>
                  {s.unit && <span className="text-[10px] text-ink-500">{s.unit}</span>}
                </p>
                <p
                  className="mt-1 flex items-center justify-center gap-0.5 text-[10px]"
                  style={{ color: 'var(--line-green)' }}
                >
                  <TrendingUp size={10} strokeWidth={2.25} /> {s.delta}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </section>
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
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function NewBtn() {
  return (
    <button
      type="button"
      className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-white"
      style={{ background: 'var(--line-green)' }}
    >
      <Plus size={12} strokeWidth={2.5} />
      新規シナリオ
    </button>
  );
}

function MiniNote({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] text-ink-500">{children}</span>;
}

function StatusToggle({ status }: { status: Scenario['status'] }) {
  if (status === 'on') {
    return (
      <span
        className="relative inline-flex h-5 w-9 items-center rounded-full"
        style={{ background: 'var(--line-green)' }}
      >
        <span className="absolute right-0.5 h-4 w-4 rounded-full bg-white" />
      </span>
    );
  }
  if (status === 'draft') {
    return (
      <span
        className="rounded-full px-2 py-0.5 text-[10px]"
        style={{ background: '#ece6f7', color: '#5b3e9a' }}
      >
        下書き
      </span>
    );
  }
  return (
    <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-ink-100">
      <span className="absolute left-0.5 h-4 w-4 rounded-full bg-white" />
    </span>
  );
}

function StatBox({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="rounded-xl bg-surface-50 px-3 py-2.5 text-center">
      <p className="text-[10px] text-ink-500">{label}</p>
      <p className="mt-1 flex items-baseline justify-center gap-1">
        <span className="numeric text-lg text-ink-900">{value}</span>
        {unit && <span className="text-[10px] text-ink-500">{unit}</span>}
      </p>
    </div>
  );
}

function FlowNode({
  index,
  step,
}: {
  index: number;
  step: { Icon: LucideIcon; title: string; sub: string };
}) {
  return (
    <div className="flex w-[150px] shrink-0 flex-col items-center">
      <div
        className="relative flex h-[80px] w-[80px] items-center justify-center rounded-full"
        style={{
          backgroundImage:
            'linear-gradient(var(--surface-0), var(--surface-0)), var(--gradient-soft)',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          border: '2px solid transparent',
        }}
      >
        <step.Icon size={28} strokeWidth={1.6} color="#5b3e9a" />
        <span
          className="numeric absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white"
          style={{ background: 'var(--line-green)' }}
        >
          {index}
        </span>
      </div>
      <p className="mt-2 text-center text-xs font-semibold text-ink-900">
        {step.title}
      </p>
      <p className="mt-0.5 text-center text-[10px] text-ink-500">{step.sub}</p>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex items-center pt-[28px]">
      <span
        className="block h-0.5 w-8 rounded-full"
        style={{ background: 'var(--gradient-soft)' }}
      />
      <ChevronRight size={14} className="text-ink-300" strokeWidth={1.75} />
    </div>
  );
}
