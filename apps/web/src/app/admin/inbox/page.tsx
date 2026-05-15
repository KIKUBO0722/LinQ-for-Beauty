import Link from 'next/link';
import {
  Sparkles,
  Send,
  Paperclip,
  Smile,
  ChevronRight,
  Calendar,
  FileText,
  Ticket,
  ClipboardCheck,
  CalendarPlus,
} from 'lucide-react';

type Conversation = {
  id: string;
  name: string;
  initial: string;
  avatarTone: 'mint' | 'lavender' | 'peach' | 'sky' | 'sand';
  preview: string;
  time: string;
  badge?: '新着' | '未対応' | 'フォロー';
  unread?: boolean;
  active?: boolean;
};

const filters = ['すべて', '未対応', '返信待ち', 'フォロー'];

const conversations: Conversation[] = [
  {
    id: '1',
    name: '佐藤 美咲',
    initial: '佐',
    avatarTone: 'peach',
    preview: 'カラーって、白髪染めもできますか？',
    time: '14:32',
    badge: '新着',
    unread: true,
    active: true,
  },
  {
    id: '2',
    name: '田中 真理',
    initial: '田',
    avatarTone: 'lavender',
    preview: '来週の予約変更したいです',
    time: '13:08',
    badge: '未対応',
    unread: true,
  },
  {
    id: '3',
    name: '鈴木 さくら',
    initial: '鈴',
    avatarTone: 'mint',
    preview: 'ありがとうございました！次回も楽しみにしています',
    time: '11:50',
  },
  {
    id: '4',
    name: '伊藤 由美',
    initial: '伊',
    avatarTone: 'sky',
    preview: 'クーポンの使い方教えてください',
    time: '昨日',
    badge: 'フォロー',
  },
  {
    id: '5',
    name: '高橋 まどか',
    initial: '高',
    avatarTone: 'sand',
    preview: 'カウンセリングシートを送りました',
    time: '昨日',
  },
  {
    id: '6',
    name: '小林 結衣',
    initial: '小',
    avatarTone: 'peach',
    preview: '今度のメニューが楽しみです',
    time: '2 日前',
  },
];

type Message =
  | { from: 'customer'; text: string; time: string }
  | { from: 'staff'; text: string; time: string; ai?: boolean };

const messages: Message[] = [
  {
    from: 'customer',
    text: 'こんにちは！カラーって、白髪染めもできますか？',
    time: '14:32',
  },
  {
    from: 'staff',
    text:
      'こんにちは、ご質問ありがとうございます！\n白髪染めも対応しております。仕上がりの色味やトーンによっておすすめの薬剤を変えています。\n\n・自然な黒〜ダークブラウン: 約 60 分 / ¥6,500\n・明るめのブラウン: 約 90 分 / ¥8,500\n・ブリーチありの透明感カラー: 約 150 分 / ¥12,800\n\nご希望の仕上がりイメージがあれば、写真を送っていただけるとより正確にご提案できます。',
    time: '14:34',
    ai: true,
  },
  {
    from: 'customer',
    text: 'ありがとうございます！ダークブラウンでお願いしたいです。',
    time: '14:35',
  },
];

const quickReplies = [
  '予約状況を確認',
  'クーポンを送る',
  'メニュー一覧を送る',
  'カウンセリングシート',
];

export default function InboxPage() {
  const active = conversations.find((c) => c.active) ?? conversations[0];

  return (
    <div className="grid h-full grid-cols-[300px_1fr_320px] overflow-hidden">
      <ListPane active={active} />
      <ChatPane customer={active} />
      <CustomerPane customer={active} />
    </div>
  );
}

function ListPane({ active }: { active: Conversation }) {
  return (
    <aside className="flex h-full flex-col border-r border-ink-100 bg-surface-0">
      <div className="px-4 pt-4">
        <h2 className="text-sm font-semibold text-ink-900">対応リスト</h2>
        <div className="mt-3 flex gap-1 text-xs">
          {filters.map((f, i) => (
            <span
              key={f}
              className={
                i === 0
                  ? 'rounded-full px-2.5 py-1 font-medium text-white'
                  : 'rounded-full bg-surface-100 px-2.5 py-1 text-ink-500'
              }
              style={i === 0 ? { background: 'var(--line-green)' } : undefined}
            >
              {f}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex-1 overflow-y-auto px-2 pb-3">
        <ul>
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href="#"
                className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface-50"
                style={c.id === active.id ? { background: '#e8f6ee' } : undefined}
              >
                <Avatar initial={c.initial} tone={c.avatarTone} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {c.name}
                    </p>
                    {c.unread && (
                      <span
                        className="inline-block h-2 w-2 shrink-0 rounded-full"
                        style={{ background: 'var(--line-green)' }}
                      />
                    )}
                    <span className="ml-auto text-[10px] text-ink-300">{c.time}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-ink-500">{c.preview}</p>
                  {c.badge && <BadgeTag label={c.badge} />}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-ink-100 px-4 py-3 text-xs text-ink-500">
        対応中: <span className="numeric text-ink-900">2</span> /{' '}
        <span className="numeric">6</span>
      </div>
    </aside>
  );
}

function ChatPane({ customer }: { customer: Conversation }) {
  return (
    <section className="flex h-full flex-col bg-surface-50">
      <header className="flex h-12 items-center justify-between border-b border-ink-100 bg-surface-0 px-5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink-900">{customer.name}</h3>
          <span
            className="rounded-full px-2 py-0.5 text-[10px]"
            style={{ background: '#dff5e6', color: '#1d7a3a' }}
          >
            新着
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs text-ink-500">
          <button
            type="button"
            className="rounded-full border border-ink-100 px-3 py-1 hover:text-ink-900"
          >
            予約を作成
          </button>
          <button
            type="button"
            className="rounded-full border border-ink-100 px-3 py-1 hover:text-ink-900"
          >
            カルテを開く
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.map((m, i) =>
          m.from === 'customer' ? (
            <CustomerBubble key={i} customer={customer} text={m.text} time={m.time} />
          ) : (
            <StaffBubble key={i} text={m.text} time={m.time} ai={m.ai} />
          )
        )}
      </div>

      <div className="border-t border-ink-100 bg-surface-0 px-5 py-3">
        <div className="mb-2 flex flex-wrap gap-1 text-xs">
          {quickReplies.map((q) => (
            <span
              key={q}
              className="rounded-full bg-surface-100 px-2.5 py-1 text-ink-500"
            >
              {q}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-ink-100 px-3 py-2">
            <Paperclip size={15} className="text-ink-300" strokeWidth={1.75} />
            <span className="flex-1 text-sm text-ink-500">メッセージを入力…</span>
            <Smile size={15} className="text-ink-300" strokeWidth={1.75} />
          </div>
          <button
            type="button"
            className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--line-green)' }}
          >
            <Send size={14} strokeWidth={2} />
            送信
          </button>
        </div>
      </div>
    </section>
  );
}

function CustomerBubble({
  customer,
  text,
  time,
}: {
  customer: Conversation;
  text: string;
  time: string;
}) {
  return (
    <div className="flex items-end gap-2">
      <Avatar initial={customer.initial} tone={customer.avatarTone} size={28} />
      <div className="max-w-[70%]">
        <div
          className="rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm text-ink-900"
          style={{ background: '#dff5e6' }}
        >
          {text}
        </div>
        <p className="mt-1 text-[10px] text-ink-300">{time}</p>
      </div>
    </div>
  );
}

function StaffBubble({ text, time, ai }: { text: string; time: string; ai?: boolean }) {
  return (
    <div className="flex items-end justify-end gap-2">
      <div className="max-w-[70%]">
        {ai && (
          <p
            className="mb-1 flex items-center justify-end gap-1 text-[10px]"
            style={{ color: 'var(--line-green)' }}
          >
            <Sparkles size={11} strokeWidth={2} /> AI 候補 (送信前確認)
          </p>
        )}
        <div className="whitespace-pre-line rounded-2xl rounded-br-sm border border-ink-100 bg-surface-0 px-3.5 py-2.5 text-sm text-ink-900">
          {text}
        </div>
        <p className="mt-1 text-right text-[10px] text-ink-300">{time}</p>
      </div>
    </div>
  );
}

function CustomerPane({ customer }: { customer: Conversation }) {
  return (
    <aside className="flex h-full flex-col border-l border-ink-100 bg-surface-0">
      <div className="px-5 pt-5">
        <div className="flex items-center gap-3">
          <Avatar initial={customer.initial} tone={customer.avatarTone} size={48} />
          <div>
            <p className="text-sm font-semibold text-ink-900">{customer.name}</p>
            <p className="text-[11px] text-ink-500">VIP / 来店 12 回</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <StatBlock label="来店" value="12" />
          <StatBlock label="累計" value="¥48k" />
          <StatBlock label="LTV" value="¥120k" />
        </div>
      </div>

      <div className="mt-5 flex-1 overflow-y-auto px-5">
        <Section title="基本情報">
          <Row label="登録日" value="2024/03/12" />
          <Row label="電話" value="090-xxxx-xxxx" />
          <Row label="誕生日" value="9 月 14 日" />
          <Row label="担当" value="平山 (相生)" />
        </Section>

        <Section title="最終来店">
          <Row label="日付" value="2026/04/22 (木)" />
          <Row label="メニュー" value="カット + カラー" />
          <Row label="次回提案" value="6 月上旬カラー" />
        </Section>

        <Section title="クイックアクション">
          <ul className="space-y-2 text-xs">
            <ActionRow Icon={FileText}>テンプレを送る</ActionRow>
            <ActionRow Icon={Ticket}>クーポンを送る</ActionRow>
            <ActionRow Icon={ClipboardCheck}>カウンセリングシート</ActionRow>
            <ActionRow Icon={CalendarPlus}>予約を作成</ActionRow>
          </ul>
        </Section>
      </div>

      <div className="border-t border-ink-100 px-5 py-3 text-[10px] text-ink-300">
        最終更新 2026/05/22 14:32
      </div>
    </aside>
  );
}

function Avatar({
  initial,
  tone,
  size,
}: {
  initial: string;
  tone: 'mint' | 'lavender' | 'peach' | 'sky' | 'sand';
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

function BadgeTag({ label }: { label: string }) {
  const styles: Record<string, { bg: string; fg: string }> = {
    新着: { bg: '#dff5e6', fg: '#1d7a3a' },
    未対応: { bg: '#fff4dd', fg: '#9a6700' },
    フォロー: { bg: '#ece6f7', fg: '#5b3e9a' },
  };
  const s = styles[label] ?? styles['新着'];
  return (
    <span
      className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px]"
      style={{ background: s.bg, color: s.fg }}
    >
      {label}
    </span>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-50 py-2">
      <p className="numeric text-base font-semibold text-ink-900">{value}</p>
      <p className="text-[10px] text-ink-500">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
        {title}
      </h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-xs">
      <span className="text-ink-500">{label}</span>
      <span className="text-ink-900">{value}</span>
    </div>
  );
}

function ActionRow({
  Icon,
  children,
}: {
  Icon: typeof Calendar;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-xl border border-ink-100 px-3 py-2 text-left text-ink-900 hover:bg-surface-50"
      >
        <span className="flex items-center gap-2">
          <Icon size={14} strokeWidth={1.75} className="text-ink-500" />
          {children}
        </span>
        <ChevronRight size={13} className="text-ink-300" />
      </button>
    </li>
  );
}
