'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn, ShieldCheck } from 'lucide-react';
import { platformApi, getPlatformToken, setPlatformSession } from '@/lib/platform';
import { Logo } from '../../_components/Logo';

export default function PlatformLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 既ログインなら一覧へ
  useEffect(() => {
    if (getPlatformToken()) router.replace('/platform');
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await platformApi.login(email.trim(), password);
      // ★店側 /login にある「三点一致」チェックは【意図的に無し】。
      // 運営アカウントは特定の店に属さず、運営 JWT は tenantId claim を持たないため
      // (NEXT_PUBLIC_TENANT_ID と突き合わせる相手がそもそも存在しない — 08 設計判断 9)。
      setPlatformSession(res.accessToken, res.admin);
      router.replace('/platform');
    } catch (err) {
      // ★ここでエラー文面が表示されることが検収項目 (preq() の 401 リダイレクト除外の実地確認)
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <Logo size={34} />
          <p className="flex items-center gap-1.5 text-sm text-ink-500">
            <ShieldCheck size={14} strokeWidth={1.75} />
            運営管理にログイン
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm"
        >
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium text-ink-700">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 focus:border-[var(--line-green)] focus:outline-none focus:ring-2 focus:ring-[var(--line-green)]/20"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="text-sm font-medium text-ink-700">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 focus:border-[var(--line-green)] focus:outline-none focus:ring-2 focus:ring-[var(--line-green)]/20"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
            style={{ background: 'var(--line-green)' }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            ログイン
          </button>

          <p className="text-center text-[11px] text-ink-300">
            この画面は LinQ 運営者専用です。お店の管理画面をお使いの方は、お店用のログイン画面からお入りください。
          </p>
        </form>
      </div>
    </div>
  );
}
