'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken } from '@/lib/auth';

/**
 * UX 用のクライアントガード: トークンが無ければ /login へ飛ばす。
 * セキュリティの正本は API 側の AuthGuard (このガードはブラウザ表示制御のみで、
 * これを外しても API がトークン無しリクエストを 401 で弾く)。
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (getToken()) {
      setOk(true);
    } else {
      router.replace('/login');
    }
  }, [router]);

  // 判定前 (SSR / トークン確認中) は中身を隠す
  if (!ok) return null;
  return <>{children}</>;
}
