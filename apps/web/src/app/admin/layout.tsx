import Link from 'next/link';
import {
  Home,
  CalendarDays,
  Users,
  Layers,
  Megaphone,
  Ticket,
  LayoutGrid,
  Workflow,
  BarChart3,
  Settings,
  LayoutDashboard,
  MessagesSquare,
  ChevronDown,
  CalendarCheck2,
  FileText,
  Bot,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Logo } from '../_components/Logo';
import { AiCopilotFab } from './_components/AiCopilotFab';

const sideNav: { label: string; href: string; Icon: LucideIcon }[] = [
  { label: 'ホーム', href: '/admin/dashboard', Icon: Home },
  { label: '予約', href: '/admin/calendar', Icon: CalendarDays },
  { label: 'お客様', href: '/admin/customers', Icon: Users },
  { label: '配信先', href: '/admin/segments', Icon: Layers },
  { label: '配信', href: '/admin/broadcast', Icon: Megaphone },
  { label: 'クーポン', href: '/admin/coupons', Icon: Ticket },
  { label: 'リッチメニュー', href: '/admin/rich-menus', Icon: LayoutGrid },
  { label: 'カウンセリング', href: '/admin/forms', Icon: FileText },
  { label: 'AI', href: '/admin/ai', Icon: Bot },
  { label: 'ステップ配信', href: '/admin/steps', Icon: Workflow },
  { label: '自動化', href: '/admin/automation', Icon: Workflow },
  { label: '分析', href: '/admin/analytics', Icon: BarChart3 },
  { label: '設定', href: '/admin/settings', Icon: Settings },
];

const topTabs: { label: string; href: string; Icon: LucideIcon }[] = [
  { label: '概要', href: '/admin/dashboard', Icon: LayoutDashboard },
  { label: '顧客対応', href: '/admin/inbox', Icon: MessagesSquare },
  { label: '配信', href: '/admin/broadcast', Icon: Megaphone },
  { label: '自動化', href: '/admin/automation', Icon: Workflow },
  { label: '分析', href: '/admin/analytics', Icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen overflow-hidden bg-surface-50">
      {/* Aurora blob background — AI トーンをページ全体に微発光させる */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full opacity-[0.18]"
          style={{
            background:
              'radial-gradient(circle at center, #f58fb8 0%, rgba(245,143,184,0) 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute top-1/3 right-[-120px] h-[480px] w-[480px] rounded-full opacity-[0.18]"
          style={{
            background:
              'radial-gradient(circle at center, #b89aec 0%, rgba(184,154,236,0) 70%)',
            filter: 'blur(70px)',
          }}
        />
        <div
          className="absolute bottom-[-120px] left-1/3 h-[360px] w-[360px] rounded-full opacity-[0.10]"
          style={{
            background:
              'radial-gradient(circle at center, #06c755 0%, rgba(6,199,85,0) 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      <aside className="relative z-10 flex w-[88px] shrink-0 flex-col items-center border-r border-ink-100/80 py-4 backdrop-blur-xl"
        style={{ background: 'rgba(255,255,255,0.72)' }}>
        <div className="mb-6 flex h-9 items-center justify-center">
          <Logo size={22} />
        </div>
        <nav className="flex flex-col gap-1">
          {sideNav.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex w-[72px] flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] text-ink-500 transition-colors hover:bg-surface-100 hover:text-ink-900"
            >
              <item.Icon size={18} strokeWidth={1.75} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col items-center gap-2 pt-4">
          <span className="text-[10px] text-ink-300">マニュアル</span>
        </div>
      </aside>

      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <header
          className="flex h-14 shrink-0 items-center gap-6 border-b border-ink-100/80 px-6 backdrop-blur-xl"
          style={{ background: 'rgba(255,255,255,0.72)' }}
        >
          <button
            type="button"
            className="flex items-center gap-2 rounded-full bg-surface-100 px-4 py-1.5 text-sm font-medium text-ink-900"
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: 'var(--line-green)' }}
            />
            サンプル サロン
            <ChevronDown size={14} className="text-ink-300" strokeWidth={1.75} />
          </button>

          <nav className="flex items-center gap-1 text-sm">
            {topTabs.map((tab, i) => (
              <Link
                key={tab.label}
                href={tab.href}
                className={
                  i === 0
                    ? 'flex items-center gap-1.5 border-b-2 px-4 py-3 font-semibold text-ink-900'
                    : 'flex items-center gap-1.5 px-4 py-3 text-ink-500 transition-colors hover:text-ink-900'
                }
                style={i === 0 ? { borderColor: 'var(--line-green)' } : undefined}
              >
                <tab.Icon size={14} strokeWidth={1.75} />
                {tab.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4 text-sm text-ink-500">
            <span className="flex items-center gap-1.5 text-ink-700">
              <CalendarCheck2 size={14} strokeWidth={1.75} className="text-ink-500" />
              <span className="numeric tracking-tight">2026年5月22日 (木)</span>
            </span>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
                style={{ background: 'var(--gradient-soft)', color: 'var(--ink-900)' }}
              >
                山
              </span>
              <span className="text-ink-900">山田 花子</span>
            </div>
            <button
              type="button"
              className="rounded-full border border-ink-100 px-3 py-1 text-xs text-ink-500"
            >
              プレビュー
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      <AiCopilotFab />
    </div>
  );
}
