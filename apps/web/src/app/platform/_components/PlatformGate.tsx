'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getPlatformToken } from '@/lib/platform';

/**
 * UX 用のクライアントガード (admin/_components/AuthGate.tsx と同型)。
 * トークンが無ければ /platform/login へ飛ばす。
 * セキュリティの正本は API 側の PlatformGuard (このガードを外しても API が 401/403 で弾く)。
 *
 * ★運営トークンは 12h で失効する。失効したトークンを保持したまま開いた場合はここを素通りし、
 *   一覧取得が 401 → preq() が /platform/login へ戻す (仕様。ここでは失効判定をしない)。
 * ★/platform 配下に新しいページを足す場合は、そのページに本 Gate を手で差し込むこと。
 *   layout.tsx には置けない (login まで包んでしまうため — 08 設計判断 9)。
 */
export function PlatformGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (getPlatformToken()) {
      setOk(true);
    } else {
      router.replace('/platform/login');
    }
  }, [router]);

  // 判定前 (SSR / トークン確認中) は中身を隠す
  if (!ok) return null;
  return <>{children}</>;
}
