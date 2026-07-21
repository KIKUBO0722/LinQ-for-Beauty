import type { Metadata } from 'next';

// 運営管理画面は検索エンジンに載せない (noindex)。
//
// 【★このファイルは metadata 専用 — 認証・ゲートのロジックを一切置かない (08 設計判断 9 / #24)】
// layout は配下の /platform/login も包むため、ここでガードすると未ログインの人が
// ログイン画面にすら入れなくなる (無限リダイレクト)。ゲートは /platform/page.tsx 側で
// PlatformGate を差し込んで行う。
export const metadata: Metadata = {
  title: 'LinQ 運営管理',
  robots: { index: false, follow: false },
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
