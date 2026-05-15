'use client';

import { useEffect, useState } from 'react';
import {
  X,
  CalendarClock,
  Send,
  Users,
  CircleSlash,
  Tag,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { api, type Broadcast } from '@/lib/api';

export function BroadcastDetailDrawer({
  broadcast,
  onClose,
  onCancelled,
}: {
  broadcast: Broadcast | null;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const open = !!broadcast;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
        aria-label="配信詳細"
        className={
          'fixed top-0 right-0 z-50 flex h-full w-[460px] flex-col overflow-hidden border-l border-ink-100 bg-surface-0 shadow-2xl transition-transform duration-300 ease-out ' +
          (open ? 'translate-x-0' : 'translate-x-full')
        }
      >
        {broadcast && (
          <Content broadcast={broadcast} onClose={onClose} onCancelled={onCancelled} />
        )}
      </aside>
    </>
  );
}

function Content({
  broadcast,
  onClose,
  onCancelled,
}: {
  broadcast: Broadcast;
  onClose: () => void;
  onCancelled: () => void;
}) {
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCancel = async () => {
    if (broadcast.status !== 'scheduled' || cancelling) return;
    setCancelling(true);
    try {
      await api.broadcasts.cancel(broadcast.id);
      onCancelled();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <header className="flex shrink-0 items-center justify-between border-b border-ink-100 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <StatusChip status={broadcast.status} />
          <div>
            <p className="text-sm font-semibold text-ink-900">
              {broadcast.title ?? '配信'}
            </p>
            <p className="text-[11px] text-ink-500">
              {broadcast.type === 'all'
                ? '全体配信'
                : broadcast.type === 'segment'
                  ? 'セグメント配信'
                  : '予約配信'}
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
        <Section icon={CalendarClock} title="日時">
          <Row label="作成">
            <span className="text-ink-900">{formatDateTime(broadcast.createdAt)}</span>
          </Row>
          <Row label="送信">
            <span className="text-ink-900">{formatDateTime(broadcast.sentAt)}</span>
          </Row>
          <Row label="予約">
            <span className="text-ink-900">{formatDateTime(broadcast.scheduledAt)}</span>
          </Row>
        </Section>

        <Section icon={Users} title="配信先">
          <Row label="到達">
            <span className="numeric text-ink-900">{broadcast.recipientCount}</span>
          </Row>
          <Row label="種別">
            <span className="text-ink-700">{broadcast.messageType ?? 'text'}</span>
          </Row>
          {broadcast.segmentId && (
            <Row label="セグメント">
              <span className="numeric text-[11px] text-ink-700">
                {truncate(broadcast.segmentId, 22)}
              </span>
            </Row>
          )}
        </Section>

        <Section icon={Send} title="メッセージ">
          <p className="whitespace-pre-line rounded-xl border border-ink-100 bg-surface-50 px-3 py-2.5 text-xs text-ink-700">
            {broadcast.contentPreview ?? '(本文なし)'}
          </p>
        </Section>

        {broadcast.autoTagOnResponse && (
          <Section icon={Tag} title="自動タグ">
            <p className="text-xs text-ink-700">
              返信時に <span className="numeric">{truncate(broadcast.autoTagOnResponse, 18)}</span>{' '}
              タグ付与
            </p>
          </Section>
        )}
      </div>

      <footer className="flex shrink-0 items-center gap-2 border-t border-ink-100 bg-surface-0 px-5 py-3">
        {broadcast.status === 'scheduled' && (
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="flex items-center gap-1 rounded-full border border-red-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {cancelling ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <CircleSlash size={12} strokeWidth={1.75} />
            )}
            予約をキャンセル
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="ml-auto rounded-full border border-ink-100 px-3 py-2 text-xs text-ink-700 hover:bg-surface-50"
        >
          閉じる
        </button>
        {error && <p className="text-[11px] text-red-600">{error}</p>}
      </footer>
    </>
  );
}

function StatusChip({ status }: { status: Broadcast['status'] }) {
  const map: Record<Broadcast['status'], { bg: string; fg: string; label: string }> = {
    sent: { bg: '#e8f6ee', fg: '#1d7a3a', label: '送信済' },
    scheduled: { bg: '#fff4dd', fg: '#9a6700', label: '予約' },
    cancelled: { bg: '#f1f1f4', fg: '#5d5d68', label: 'キャンセル' },
    failed: { bg: '#fdecec', fg: '#c03434', label: '失敗' },
  };
  const s = map[status];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
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

function formatDateTime(s: string | null): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return s;
  }
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s;
}
