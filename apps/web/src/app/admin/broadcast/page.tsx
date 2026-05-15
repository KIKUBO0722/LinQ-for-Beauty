import {
  Type,
  Image as ImageIcon,
  LayoutPanelTop,
  Ticket,
  Film,
  Check,
  Send,
  Smartphone,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const broadcastSubTabs = ['一斉配信', 'セグメント配信', 'シナリオ配信', '共有'];

const messageTypes: { Icon: LucideIcon; label: string; active?: boolean }[] = [
  { Icon: Type, label: 'テキスト', active: true },
  { Icon: ImageIcon, label: '画像' },
  { Icon: LayoutPanelTop, label: 'カード' },
  { Icon: Ticket, label: 'クーポン' },
  { Icon: Film, label: '動画' },
];

const checkItems = [
  { label: 'NG ワード', value: '検出なし' },
  { label: 'URL', value: '1 件・正常' },
  { label: 'ターゲット', value: '東京拠点 / 再来店候補 24 名' },
  { label: '配信日時', value: '2026/05/22 (木) 18:00' },
];

export default function BroadcastPage() {
  return (
    <div className="px-6 py-5">
      <div className="mb-4 flex items-center gap-1 text-sm">
        {broadcastSubTabs.map((t, i) => (
          <span
            key={t}
            className={
              i === 0
                ? 'rounded-full px-3 py-1.5 font-medium text-white'
                : 'rounded-full px-3 py-1.5 text-ink-500'
            }
            style={i === 0 ? { background: 'var(--line-green)' } : undefined}
          >
            {t}
          </span>
        ))}
        <button
          type="button"
          className="ml-auto rounded-full border border-ink-100 px-3 py-1.5 text-xs text-ink-500"
        >
          下書きを保存
        </button>
        <button
          type="button"
          className="rounded-full px-4 py-1.5 text-xs font-semibold text-white"
          style={{ background: 'var(--line-green)' }}
        >
          配信を予約
        </button>
      </div>

      <div className="grid grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <Card title="配信設定">
            <div className="space-y-3">
              <Field label="配信名">
                <input
                  className="w-full rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-sm text-ink-900 outline-none"
                  defaultValue="5 月の再来店促進キャンペーン"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="配信日時">
                  <input
                    className="w-full rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-sm text-ink-900 outline-none"
                    defaultValue="2026/05/22 18:00"
                  />
                </Field>
                <Field label="配信先セグメント">
                  <input
                    className="w-full rounded-xl border border-ink-100 bg-surface-0 px-3 py-2 text-sm text-ink-900 outline-none"
                    defaultValue="再来店候補 (60 日以上来店なし) / 24 名"
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-ink-500">
                <CheckboxRow defaultChecked>URL アクションを有効化</CheckboxRow>
                <CheckboxRow>配信前に管理者承認を必須にする</CheckboxRow>
                <CheckboxRow>テスト配信を 1 件だけ送る</CheckboxRow>
              </div>
            </div>
          </Card>

          <Card title="メッセージ内容">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {messageTypes.map((m) => (
                <span
                  key={m.label}
                  className={
                    m.active
                      ? 'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-white'
                      : 'inline-flex items-center gap-1.5 rounded-full border border-ink-100 px-3 py-1 text-xs text-ink-500'
                  }
                  style={m.active ? { background: 'var(--line-green)' } : undefined}
                >
                  <m.Icon size={13} strokeWidth={1.75} />
                  {m.label}
                </span>
              ))}
            </div>
            <Field label="メッセージ本文">
              <textarea
                rows={6}
                className="w-full resize-none rounded-xl border border-ink-100 bg-surface-0 px-3 py-2.5 text-sm text-ink-900 outline-none"
                defaultValue={
                  '佐藤さま、こんにちは！\nお久しぶりの来店をお待ちしております。\n\n6 月末までにご予約いただくと、トリートメント 1 回分が無料になるクーポンをお送りします。\n\nご予約はこちらから → '
                }
              />
            </Field>
            <p className="mt-2 text-xs text-ink-500">
              <span className="numeric">86</span> / 500 文字 ·{' '}
              <span style={{ color: 'var(--line-green)' }}>差し込みタグ 1 件</span>
            </p>
          </Card>

          <Card title="誤送信チェック">
            <ul className="space-y-2 text-sm">
              {checkItems.map((c) => (
                <li
                  key={c.label}
                  className="flex items-center justify-between rounded-xl bg-surface-50 px-3 py-2.5"
                >
                  <span className="flex items-center gap-2 text-ink-700">
                    <span
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-white"
                      style={{ background: 'var(--line-green)' }}
                    >
                      <Check size={12} strokeWidth={2.5} />
                    </span>
                    {c.label}
                  </span>
                  <span className="text-xs text-ink-500">{c.value}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-3">
          <Card
            title="LINE プレビュー"
            right={
              <span className="flex items-center gap-1 text-[10px] text-ink-500">
                <Smartphone size={11} strokeWidth={1.75} />
                送信前の見え方
              </span>
            }
          >
            <PhoneMockup />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="rounded-full border border-ink-100 px-3 py-2 text-xs text-ink-700 hover:bg-surface-50"
              >
                保存する
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-1 rounded-full px-3 py-2 text-xs font-semibold text-white"
                style={{ background: 'var(--line-green)' }}
              >
                <Send size={12} strokeWidth={2} />
                テスト送信
              </button>
            </div>
            <div className="mt-3 rounded-xl bg-surface-50 px-3 py-2.5 text-[11px] text-ink-500">
              <div className="flex items-center justify-between">
                <span>準備の進捗</span>
                <span className="numeric text-ink-900">80%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                <div
                  className="h-full"
                  style={{ width: '80%', background: 'var(--line-green)' }}
                />
              </div>
            </div>
          </Card>
        </div>
      </div>
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-ink-500">{label}</span>
      {children}
    </label>
  );
}

function CheckboxRow({
  children,
  defaultChecked,
}: {
  children: React.ReactNode;
  defaultChecked?: boolean;
}) {
  return (
    <label className="inline-flex items-center gap-2 rounded-full border border-ink-100 px-3 py-1.5">
      <span
        className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-sm text-white"
        style={{
          background: defaultChecked ? 'var(--line-green)' : 'var(--surface-100)',
        }}
      >
        {defaultChecked && <Check size={10} strokeWidth={3} />}
      </span>
      <span>{children}</span>
    </label>
  );
}

function PhoneMockup() {
  return (
    <div
      className="mx-auto h-[480px] w-[240px] overflow-hidden rounded-[28px] border border-ink-100 bg-surface-0 shadow-sm"
      style={{ outline: '6px solid var(--surface-100)' }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white"
        style={{ background: 'var(--line-green)' }}
      >
        <Smartphone size={12} strokeWidth={1.75} />
        <span>Beauty Salon Lumiere</span>
      </div>
      <div className="space-y-2 px-3 py-3">
        <div
          className="max-w-[80%] whitespace-pre-line rounded-2xl rounded-bl-sm px-3 py-2 text-[11px] text-ink-900"
          style={{ background: '#dff5e6' }}
        >
          佐藤さま、こんにちは！{'\n'}お久しぶりの来店をお待ちしております。
        </div>
        <div
          className="max-w-[80%] whitespace-pre-line rounded-2xl rounded-bl-sm px-3 py-2 text-[11px] text-ink-900"
          style={{ background: '#dff5e6' }}
        >
          <span className="flex items-center gap-1">
            <Ticket size={11} strokeWidth={1.75} />
            <span>6 月末までのご予約で、トリートメント 1 回無料</span>
          </span>
        </div>
        <div
          className="my-2 mx-auto flex h-28 w-full items-end justify-center rounded-xl pb-2 text-[10px] text-ink-500"
          style={{ background: 'var(--gradient-soft)' }}
        >
          画像プレースホルダ
        </div>
        <button
          type="button"
          className="w-full rounded-full px-3 py-2 text-[11px] font-semibold text-white"
          style={{ background: 'var(--line-green)' }}
        >
          予約する
        </button>
      </div>
    </div>
  );
}
