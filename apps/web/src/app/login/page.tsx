'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn } from 'lucide-react';
import { authApi, TENANT_ID } from '@/lib/api';
import { getToken, setSession } from '@/lib/auth';
import { Logo } from '../_components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 既ログインなら dashboard へ
  useEffect(() => {
    if (getToken()) router.replace('/admin/dashboard');
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await authApi.login(email.trim(), password);
      // 三点一致の入口防御: このビルドの NEXT_PUBLIC_TENANT_ID とアカウントのテナントが
      // 食い違うと admin 全ページが 403 になる。セッションを成立させず入口で止める。
      if (TENANT_ID && res.user.tenantId !== TENANT_ID) {
        setError(
          'このビルドの NEXT_PUBLIC_TENANT_ID とアカウントのテナントが一致していません。管理者にお問い合わせください。',
        );
        return;
      }
      setSession(res.accessToken, res.user);
      router.replace('/admin/dashboard');
    } catch (err) {
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
          <p className="text-sm text-ink-500">管理画面にログイン</p>
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
        </form>
      </div>
    </div>
  );
}
