'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut } from 'lucide-react';
import { getUser, clearSession, type AuthUser } from '@/lib/auth';

/**
 * ヘッダー右のユーザー表示 + ログアウト。lb.user (localStorage) から表示名を読む。
 * 旧「山田 花子」ハードコードの置換。
 */
export function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // localStorage はマウント後 (client) にのみ読める
  useEffect(() => setUser(getUser()), []);

  // メニュー外クリックで閉じる
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const logout = () => {
    clearSession();
    router.replace('/login');
  };

  const displayName = user?.tenantName ?? user?.email ?? '';
  const initial = displayName ? displayName.charAt(0) : '?';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full px-1 py-0.5 transition-colors hover:bg-surface-100"
      >
        <span
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
          style={{ background: 'var(--gradient-soft)', color: 'var(--ink-900)' }}
        >
          {initial}
        </span>
        <span className="text-ink-900">{displayName}</span>
        <ChevronDown size={14} className="text-ink-300" strokeWidth={1.75} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-xl border border-ink-100 bg-white py-1 shadow-lg">
          {user && (
            <div className="border-b border-ink-100 px-4 py-2">
              <div className="text-sm font-medium text-ink-900">{user.tenantName}</div>
              <div className="truncate text-xs text-ink-500">{user.email}</div>
            </div>
          )}
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-ink-700 transition-colors hover:bg-surface-100"
          >
            <LogOut size={14} strokeWidth={1.75} />
            ログアウト
          </button>
        </div>
      )}
    </div>
  );
}
