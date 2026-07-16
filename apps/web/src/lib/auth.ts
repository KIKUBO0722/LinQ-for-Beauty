// LinQ 管理画面の認証トークン管理 (localStorage)。
// セキュリティの正本は API 側の AuthGuard。ここはブラウザ UI 用のトークン保持のみを担う。
// SSG ビルド時 (typeof window === 'undefined') に呼ばれても壊れないよう全関数を window ガードする。

const TOKEN_KEY = 'lb.token';
const USER_KEY = 'lb.user';

export type AuthUser = {
  id: string;
  email: string;
  tenantId: string;
  tenantName: string;
};

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: AuthUser): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}
