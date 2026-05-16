'use client';

import { useEffect } from 'react';
import {
  X,
  UserRound,
  MessageSquare,
  Phone,
  Cake,
  CalendarPlus,
  FileText,
  Ticket,
  ClipboardCheck,
  ChevronRight,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { MessageThread } from '@/lib/api';

export type CustomerSummary = {
  customerId: string;
  customerName: string | null;
  lineUserId: string | null;
  lastReadAt: string | null;
  unreadCount: number;
};

export function CustomerDetailDrawer({
  customer,
  onClose,
}: {
  customer: CustomerSummary | null;
  onClose: () => void;
}) {
  const open = !!customer;

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
        aria-label="顧客詳細"
        className={
          'fixed top-0 right-0 z-50 flex h-full w-[640px] flex-col overflow-hidden border-l border-ink-100 bg-surface-0 shadow-2xl transition-transform duration-300 ease-out ' +
          (open ? 'translate-x-0' : 'translate-x-full')
        }
      >
        {customer && <Content customer={customer} onClose={onClose} />}
      </aside>
    </>
  );
}

function Content({
  customer,
  onClose,
}: {
  customer: CustomerSummary;
  onClose: () => void;
}) {
  const initial = customer.customerName?.charAt(0) ?? '?';
  return (
    <>
      <header className="flex shrink-0 items-center justify-between border-b border-ink-100 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Avatar initial={initial} />
          <div>
            <p className="text-sm font-semibold text-ink-900">
              {customer.customerName ?? '名前未登録'}
            </p>
            <p className="text-[11px] text-ink-500">
              {customer.lineUserId ? `LINE: ${truncate(customer.lineUserId, 16)}` : 'LINE 未連携'}
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
        <Section icon={UserRound} title="基本情報">
          <Row label="顧客 ID">
            <span className="numeric text-[11px] text-ink-700">
              {truncate(customer.customerId, 22)}
            </span>
          </Row>
          <Row label="未読">
            <span className="numeric text-ink-900">{customer.unreadCount}</span>
          </Row>
          <Row label="最終既読">
            <span className="text-ink-700">{formatDate(customer.lastReadAt)}</span>
          </Row>
        </Section>

        <Section icon={Phone} title="連絡先 (Phase 2)">
          <Placeholder label="電話番号" Icon={Phone} />
          <Placeholder label="誕生日" Icon={Cake} />
        </Section>

        <Section icon={Sparkles} title="クイックアクション">
          <ul className="space-y-2 text-xs">
            <ActionRow Icon={FileText}>テンプレを送る</ActionRow>
            <ActionRow Icon={Ticket}>クーポンを送る</ActionRow>
            <ActionRow Icon={ClipboardCheck}>カウンセリングシート</ActionRow>
            <ActionRow Icon={CalendarPlus}>予約を作成</ActionRow>
          </ul>
        </Section>
      </div>

      <footer className="flex shrink-0 items-center gap-2 border-t border-ink-100 bg-surface-0 px-5 py-3">
        <button
          type="button"
          className="flex items-center gap-1 rounded-full border border-ink-100 px-3 py-2 text-xs text-ink-700 hover:bg-surface-50"
          onClick={onClose}
        >
          <MessageSquare size={12} strokeWidth={1.75} />
          会話に戻る
        </button>
      </footer>
    </>
  );
}

function Avatar({ initial }: { initial: string }) {
  return (
    <span
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-semibold"
      style={{ background: '#dff5e6', color: '#1d7a3a' }}
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
  icon: LucideIcon;
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-ink-500">{label}</span>
      {children}
    </div>
  );
}

function Placeholder({ label, Icon }: { label: string; Icon: LucideIcon }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5 text-ink-500">
        <Icon size={11} strokeWidth={1.75} />
        {label}
      </span>
      <span className="text-[10px] text-ink-300">Phase 2</span>
    </div>
  );
}

function ActionRow({
  Icon,
  children,
}: {
  Icon: LucideIcon;
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

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function formatDate(s: string | null): string {
  if (!s) return '未読';
  try {
    const d = new Date(s);
    return d.toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return s;
  }
}

export function threadToSummary(t: MessageThread): CustomerSummary {
  return {
    customerId: t.customerId,
    customerName: t.customerName,
    lineUserId: t.lineUserId,
    lastReadAt: t.lastReadAt,
    unreadCount: t.unreadCount,
  };
}
