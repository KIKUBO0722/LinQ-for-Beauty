// LinQ 運営管理画面 (/platform) 専用の API クライアント。
// 【分離の理由 — 08 設計判断 9】店側 lib/api.ts の req() は admin 全画面が共有する最大の回帰点。
// トークン保存キーも fetch ラッパも別建てにすることで、
//   (a) 同一ブラウザで店 (/admin) と運営 (/platform) に同時ログインできる
//   (b) 片方の 401 がもう片方のセッションを巻き込んで壊さない
// を成立させる。api.ts には一切手を入れない。
//
// SSG ビルド時 (typeof window === 'undefined') に呼ばれても壊れないよう全関数を window ガードする
// (auth.ts と同流儀)。

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333';

// 店側の 'lb.token' / 'lb.user' とは別キー (同時ログインの前提)
const TOKEN_KEY = 'lb.platform.token';
const ADMIN_KEY = 'lb.platform.admin';

export type PlatformAdmin = {
  id: string;
  email: string;
};

export function getPlatformToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getPlatformAdmin(): PlatformAdmin | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlatformAdmin;
  } catch {
    return null;
  }
}

export function setPlatformSession(token: string, admin: PlatformAdmin): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}

export function clearPlatformSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_KEY);
}

async function preq<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getPlatformToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers,
    });
  } catch {
    // fetch 自体の失敗 (サーバー停止・回線断・CORS)。生の英語 (Failed to fetch) を出さない
    throw new Error('サーバーに接続できませんでした。しばらく待ってからもう一度お試しください。');
  }
  if (res.status === 401) {
    // セッション失効: 運営トークンだけを破棄する (店側 lb.token には触れない)。
    //
    // 【★店側 api.ts:17-24 の丸写し禁止 — 08 設計判断 9】
    // 店側で「401 なら /login へ」が成立するのは、/login が /admin 接頭辞の【外】にあるため。
    // 運営側は /platform/login が /platform 配下の【内側】にあるので、prefix 判定だけで飛ばすと
    // 「パスワード誤り → 401 → 即リロード」となり、ログイン画面にエラー文面が一度も表示されない。
    // よって login ページは除外し、そのまま下の throw に落として画面上にエラーを出す。
    // (S11 の trailingSlash 化でも壊れないよう startsWith の prefix 判定にしている)
    //
    // ★破棄は必須: 残したままだと /platform/login の「既ログインなら /platform へ」が働き、
    //   /platform → 401 → /platform/login → /platform … の往復になる。
    clearPlatformSession();
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/platform') && !pathname.startsWith('/platform/login')) {
        window.location.href = '/platform/login';
      }
    }
  }
  if (!res.ok) {
    // ★運営者に英語の例外名を見せない。API が日本語を返す 401/404/409 はそのまま使い、
    //   枠組みが英語を返す 429 (回数制限) と 400 (入力検証) だけ差し替える。
    if (res.status === 429) {
      throw new Error('操作の回数が多すぎます。1 分ほど待ってからもう一度お試しください。');
    }
    const text = await res.text().catch(() => res.statusText);
    // NestJS の例外は {statusCode, message} の JSON。message があれば日本語をそのまま表示に使う
    let msg = `${res.status} ${text}`;
    try {
      const j = JSON.parse(text);
      if (j && j.message) {
        // class-validator の検証エラーは英語の配列で返る
        msg = Array.isArray(j.message)
          ? '入力の内容に誤りがあります。項目をご確認ください。'
          : String(j.message);
      }
    } catch {
      // JSON でなければ status + text のまま (api.ts と同挙動)
    }
    throw new Error(msg);
  }
  const body = await res.text();
  return (body ? JSON.parse(body) : undefined) as T;
}

/** 店ごとの利用状況 (GET /platform/tenants の stats)。集計行の無い開設直後の店は全 0 / null で来る */
export type PlatformTenantStats = {
  locations: number;
  customers: number;
  users: number;
  /** キャンセル含む累計 (店側 KPI の confirmed/completed とは定義が異なる — 08 設計判断 8) */
  reservationsTotal: number;
  reservationsThisMonth: number;
  aiThisMonth: number;
  lastMessageAt: string | null;
};

export type PlatformTenant = {
  id: string;
  name: string;
  email: string;
  ownerName: string | null;
  createdAt: string;
  stats: PlatformTenantStats;
};

/** POST /platform/tenants の応答 (tenants 行そのもの。画面で使う分だけ型付け) */
export type CreatedTenant = {
  id: string;
  name: string;
  email: string;
};

export type CreateTenantInput = {
  name: string;
  email: string;
  ownerName?: string;
  ownerRole?: string;
  phone?: string;
  address?: string;
};

/** 初期アカウント発行の応答。password は平文で、この応答 1 回きり (DB にはハッシュのみ) */
export type IssuedUser = {
  userId: string;
  email: string;
  password: string;
  /** true = 既存アカウントのパスワード再生成 (古いパスワードは無効になっている) */
  reissued: boolean;
};

export const platformApi = {
  login: (email: string, password: string) =>
    preq<{
      accessToken: string;
      tokenType: 'Bearer';
      expiresInSec: number;
      admin: PlatformAdmin;
    }>(`/api/v1/platform/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  tenants: {
    list: () => preq<PlatformTenant[]>(`/api/v1/platform/tenants`),
    create: (input: CreateTenantInput) =>
      preq<CreatedTenant>(`/api/v1/platform/tenants`, {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    issueUser: (tenantId: string, email: string) =>
      // encodeURIComponent: 現状 tenantId は API が返した uuid のみだが、将来ほかの値を渡しても
      // パスの区切りを越えられないようにしておく
      preq<IssuedUser>(`/api/v1/platform/tenants/${encodeURIComponent(tenantId)}/users`, {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
  },
};
