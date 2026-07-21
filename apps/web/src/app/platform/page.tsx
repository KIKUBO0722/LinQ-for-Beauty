'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Check,
  Copy,
  KeyRound,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  ShieldCheck,
  Store,
  X,
} from 'lucide-react';
import {
  platformApi,
  clearPlatformSession,
  getPlatformAdmin,
  type IssuedUser,
  type PlatformTenant,
} from '@/lib/platform';
import { Logo } from '../_components/Logo';
import { PlatformGate } from './_components/PlatformGate';

export default function PlatformPage() {
  // ★ゲートは layout ではなくこの page に差し込む (layout だと /platform/login まで包む — 08 設計判断 9)
  return (
    <PlatformGate>
      <PlatformConsole />
    </PlatformGate>
  );
}

/** 発行パネルの対象。一覧行からも「開設直後の店」からも開けるよう PlatformTenant とは別型にする */
type IssueTarget = { id: string; name: string; email: string };

function PlatformConsole() {
  const router = useRouter();
  const [tenants, setTenants] = useState<PlatformTenant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [issueTarget, setIssueTarget] = useState<IssueTarget | null>(null);
  // 発行パネルが平文パスワードを表示している間は、背後の一覧をキーボード操作からも遮断する
  const [passwordShown, setPasswordShown] = useState(false);
  // 再読込の世代番号: 連打で並走したとき、古い応答が新しい応答を上書きしないようにする
  const generation = useRef(0);

  // localStorage はマウント後 (client) にのみ読める
  useEffect(() => setAdminEmail(getPlatformAdmin()?.email ?? ''), []);

  const refresh = useCallback(async () => {
    const gen = ++generation.current;
    setRefreshing(true);
    try {
      const rows = await platformApi.tenants.list();
      if (gen !== generation.current) return; // 追い越された古い応答は捨てる
      setTenants(rows);
      setError(null);
    } catch (e) {
      if (gen !== generation.current) return;
      // 401 のときは preq() が /platform/login へ飛ばすため、ここに来るのは 403/500/通信断
      // ★tenants は空配列にしない — 空にすると「まだお店がありません」が同時に出て
      //   一時的な障害を「店が全部消えた」と読み違える
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (gen === generation.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = () => {
    clearPlatformSession();
    router.replace('/platform/login');
  };

  return (
    <div className="min-h-screen bg-surface-50">
      {/* 平文パスワード表示中は背後をキーボードからも触れなくする (Tab でログアウト等に届かせない) */}
      <div inert={passwordShown}>
        <header className="flex h-14 items-center gap-3 border-b border-ink-100 bg-surface-0 px-6">
          <Logo size={22} />
          <span className="flex items-center gap-1.5 rounded-full bg-surface-100 px-3 py-1 text-xs font-semibold text-ink-700">
            <ShieldCheck size={13} strokeWidth={1.75} />
            運営管理
          </span>
          <div className="ml-auto flex items-center gap-3 text-sm text-ink-500">
            {adminEmail && <span className="text-xs text-ink-500">{adminEmail}</span>}
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 rounded-full border border-ink-100 px-3 py-1 text-xs text-ink-500 transition-colors hover:bg-surface-100 hover:text-ink-900"
            >
              <LogOut size={13} strokeWidth={1.75} />
              ログアウト
            </button>
          </div>
        </header>

        <div className="space-y-4 px-[5%] pt-6 pb-12">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-ink-900">お店の一覧</h1>
              <p className="text-sm text-ink-500">
                LinQ を使っているお店と、その利用状況。ここから新しいお店を開設し、ログイン用のアカウントを発行できます。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 rounded-full border border-ink-100 bg-surface-0 px-3 py-2 text-sm text-ink-500 transition-colors hover:text-ink-900 disabled:opacity-50"
              >
                {refreshing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <RefreshCw size={14} strokeWidth={1.75} />
                )}
                更新
              </button>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                disabled={createOpen}
                className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: 'var(--line-green)' }}
              >
                <Plus size={14} />
                新しいお店を開設
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <AlertTriangle size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-2xl border border-ink-100 bg-surface-0 p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-900">お店</h2>
              <span className="text-[10px] text-ink-500">
                {tenants === null ? '—' : `${tenants.length} 件`}
              </span>
            </div>

            {tenants === null ? (
              <div className="flex h-32 items-center justify-center text-[11px] text-ink-300">
                {error ? '読み込めませんでした' : '読み込み中…'}
              </div>
            ) : tenants.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center text-ink-300">
                <Store size={24} strokeWidth={1.5} />
                <p className="mt-1.5 text-[11px]">まだお店がありません</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1080px] text-sm">
                  <thead>
                    <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                      <th className="py-2 font-medium">お店</th>
                      <th className="py-2 font-medium">オーナー</th>
                      <th className="py-2 font-medium whitespace-nowrap">開設日</th>
                      <th className="py-2 font-medium">拠点</th>
                      <th className="py-2 font-medium">お客様</th>
                      {/* ★店側の集計 (キャンセルを除いた数) とは数え方が違う。列名で明示する (08 設計判断 8) */}
                      <th className="py-2 font-medium whitespace-nowrap">
                        予約 (キャンセル含む)
                        <span className="block font-normal text-ink-300">累計 / 今月</span>
                      </th>
                      <th className="py-2 font-medium whitespace-nowrap">AI の応答 (今月)</th>
                      <th className="py-2 font-medium whitespace-nowrap">最後のやりとり</th>
                      <th className="py-2 font-medium">アカウント</th>
                      <th className="py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {tenants.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-ink-100/70 transition-colors last:border-0 hover:bg-surface-50"
                      >
                        <td className="py-2.5 text-ink-900">
                          <div className="font-medium">{t.name}</div>
                          <div className="text-[11px] text-ink-500">{t.email}</div>
                        </td>
                        <td className="py-2.5 text-ink-500">{t.ownerName ?? '—'}</td>
                        <td className="py-2.5 whitespace-nowrap text-ink-500">
                          {formatDate(t.createdAt)}
                        </td>
                        <td className="py-2.5 numeric text-ink-700">{t.stats.locations}</td>
                        <td className="py-2.5 numeric text-ink-700">{t.stats.customers}</td>
                        <td className="py-2.5 numeric whitespace-nowrap text-ink-700">
                          {t.stats.reservationsTotal}
                          <span className="text-ink-300"> / </span>
                          {t.stats.reservationsThisMonth}
                        </td>
                        <td className="py-2.5 numeric text-ink-700">{t.stats.aiThisMonth}</td>
                        <td className="py-2.5 whitespace-nowrap text-ink-500">
                          {formatDateTime(t.stats.lastMessageAt)}
                        </td>
                        <td className="py-2.5">
                          <AccountBadge users={t.stats.users} />
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => setIssueTarget({ id: t.id, name: t.name, email: t.email })}
                            className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-ink-100 px-3 py-1 text-xs text-ink-700 transition-colors hover:bg-surface-100"
                          >
                            <KeyRound size={12} strokeWidth={1.75} />
                            アカウント発行
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateTenantPanel
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(tenant) => {
          setCreateOpen(false);
          // 一覧の再取得は待たずに発行パネルへ進む (待つと、その間に開設パネルを開き直せてしまう)
          refresh();
          setIssueTarget({ id: tenant.id, name: tenant.name, email: tenant.email });
        }}
      />

      {/* ★key で対象ごとに作り直す — 閉じたときに平文パスワードが state に残らないことを構造で保証する
          (effect による後片付けだと、次の店を開いた最初の描画に前の店のパスワードが載る) */}
      <IssueUserPanel
        key={issueTarget?.id ?? 'none'}
        target={issueTarget}
        onLockedChange={setPasswordShown}
        onClose={(issuedSomething) => {
          setIssueTarget(null);
          setPasswordShown(false);
          if (issuedSomething) refresh(); // 「未発行」バッジの更新
        }}
      />
    </div>
  );
}

function AccountBadge({ users }: { users: number }) {
  return users === 0 ? (
    <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">
      未発行
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
      {users} 名
    </span>
  );
}

/**
 * 右スライドパネルの共通枠 (dashboard/ReservationDrawer.tsx と同じ骨格・同じ幅)。
 * ★locked = true のあいだは Esc・背景クリック・× のどれでも閉じない。
 *   発行パネルが平文パスワードを表示している最中の誤閉じ (= パスワード消失) を防ぐため。
 */
function SlidePanel({
  open,
  title,
  description,
  locked = false,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  locked?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open || locked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, locked, onClose]);

  return (
    <>
      <div
        onClick={locked ? undefined : onClose}
        aria-hidden
        className={
          'fixed inset-0 z-40 bg-ink-900/30 backdrop-blur-sm transition-opacity duration-300 ' +
          (open ? 'opacity-100' : 'pointer-events-none opacity-0')
        }
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-hidden={!open}
        inert={!open}
        className={
          'fixed top-0 right-0 z-50 flex h-full w-[640px] flex-col overflow-hidden border-l border-ink-100 bg-surface-0 shadow-2xl transition-transform duration-300 ease-out ' +
          (open ? 'translate-x-0' : 'translate-x-full')
        }
      >
        {/* 閉じている間は中身ごと出さない (見えないボタンがキーボード操作に混ざらないように) */}
        {open && (
          <>
            <div className="flex items-start justify-between border-b border-ink-100 px-6 py-4">
              <div>
                <h2 className="text-base font-semibold text-ink-900">{title}</h2>
                {description && <p className="mt-0.5 text-[11px] text-ink-500">{description}</p>}
              </div>
              {!locked && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="閉じる"
                  className="rounded-full p-1 text-ink-300 transition-colors hover:bg-surface-100 hover:text-ink-700"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          </>
        )}
      </aside>
    </>
  );
}

const fieldClass =
  'w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-900 focus:border-[var(--line-green)] focus:outline-none focus:ring-2 focus:ring-[var(--line-green)]/20';

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  // label で入力欄を包む (暗黙の関連付け) — ラベル文字のクリックでも入力欄にフォーカスが当たる
  return (
    <label className="block space-y-1">
      <span className="block text-sm font-medium text-ink-700">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function CreateTenantPanel({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (tenant: { id: string; name: string; email: string }) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerRole, setOwnerRole] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 閉じたら入力を捨てる (パネルは常時マウントされているため手で戻す)
  useEffect(() => {
    if (open) return;
    setName('');
    setEmail('');
    setOwnerName('');
    setOwnerRole('');
    setPhone('');
    setAddress('');
    setError(null);
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    // 空白だけの店名は API 側で 400 (英語) になるので、画面側で先に止める
    if (!name.trim()) {
      setError('お店の名前を入力してください。');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const tenant = await platformApi.tenants.create({
        name: name.trim(),
        email: email.trim(),
        ownerName: ownerName.trim() || undefined,
        ownerRole: ownerRole.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });
      onCreated(tenant);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SlidePanel
      open={open}
      title="新しいお店を開設"
      description="お店の名前とメールアドレスだけで開設できます。営業時間・メニュー・LINE 接続は、お店側の設定画面で登録してもらいます。"
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        )}

        <Field label="お店の名前" required>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="サンプル サロン"
            className={fieldClass}
          />
        </Field>

        <Field label="お店の連絡先メールアドレス" required>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="salon@example.com"
            className={fieldClass}
          />
        </Field>
        <p className="-mt-3 text-[11px] text-ink-300">
          このあとのログイン用アカウントの初期値にも使われます (変更できます)。
        </p>

        <Field label="オーナー名">
          <input
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            className={fieldClass}
          />
        </Field>

        <Field label="肩書き">
          <input
            type="text"
            value={ownerRole}
            onChange={(e) => setOwnerRole(e.target.value)}
            placeholder="代表"
            className={fieldClass}
          />
        </Field>

        <Field label="電話番号">
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={fieldClass}
          />
        </Field>

        <Field label="住所">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={fieldClass}
          />
        </Field>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-ink-100 px-4 py-2 text-sm text-ink-500 transition-colors hover:bg-surface-100"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
            style={{ background: 'var(--line-green)' }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            開設する
          </button>
        </div>
      </form>
    </SlidePanel>
  );
}

/**
 * ログイン用アカウントの発行パネル。
 * ★親が key={target.id} で作り直すため、対象が変わると内部 state (平文パスワード含む) は必ず捨てられる。
 */
function IssueUserPanel({
  target,
  onClose,
  onLockedChange,
}: {
  target: IssueTarget | null;
  /** issuedSomething = このパネルで発行を行ったか (行っていれば親が一覧を再読込する) */
  onClose: (issuedSomething: boolean) => void;
  onLockedChange: (locked: boolean) => void;
}) {
  const [email, setEmail] = useState(target?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<IssuedUser | null>(null);
  const [copied, setCopied] = useState(false);

  const open = target !== null;
  const locked = issued !== null;

  // 平文表示中は背後の一覧をキーボードからも遮断してもらう
  useEffect(() => {
    onLockedChange(locked);
  }, [locked, onLockedChange]);

  // ★平文表示中はブラウザ側の離脱 (再読み込み / 戻る / タブを閉じる) にも確認を挟む。
  //   Esc・背景クリック・× を塞いでも、ここが空いていると控える前にパスワードが消える。
  useEffect(() => {
    if (!locked) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [locked]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target) return;
    // ★確認は「そのお店に既にアカウントがあるか」ではなく常に出す。
    //   一覧の件数は取得時点のスナップショットなので、それを条件にすると
    //   古い値のときに確認なしで既存パスワードを作り直してしまう (無言無効化)。
    const ok = window.confirm(
      `「${target.name}」に、このメールアドレスでログインできるようにします。\n\n` +
        `${email.trim()}\n\n` +
        `もし同じメールアドレスのアカウントが既にあれば、パスワードが作り直され、今までのパスワードは使えなくなります。続けますか？`,
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      setIssued(await platformApi.tenants.issueUser(target.id, email.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.password);
      setCopied(true);
      setError(null);
    } catch {
      // 使えない環境では画面の文字を手で控えてもらう (パスワードは表示されている)
      setError('コピーできませんでした。画面の文字を手で控えてください。');
    }
  };

  return (
    <SlidePanel
      open={open}
      title="ログイン用アカウントを発行"
      description={target ? target.name : undefined}
      // ★平文パスワード表示中は閉じさせない (Esc・背景クリック・× を全て無効化)
      locked={locked}
      onClose={() => onClose(issued !== null)}
    >
      {issued ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">この画面を閉じるとパスワードは二度と表示できません。</p>
                <p className="mt-0.5 text-[11px]">
                  控え忘れても大丈夫です — いつでも発行し直せます (そのときは今のパスワードが使えなくなります)。
                </p>
              </div>
            </div>
          </div>

          {issued.reissued && (
            <div className="rounded-lg border border-ink-100 bg-surface-50 px-3 py-2 text-[12px] text-ink-700">
              もとからあったアカウントのパスワードを作り直しました。前のパスワードは使えません。
            </div>
          )}

          <div className="space-y-1">
            <span className="block text-sm font-medium text-ink-700">メールアドレス</span>
            <div className="rounded-lg border border-ink-100 bg-surface-50 px-3 py-2 text-sm text-ink-900">
              {issued.email}
            </div>
          </div>

          <div className="space-y-1">
            <span className="block text-sm font-medium text-ink-700">パスワード</span>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-ink-100 bg-surface-50 px-3 py-2 text-base tracking-[0.08em] text-ink-900">
                {issued.password}
              </code>
              <button
                type="button"
                onClick={copy}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-ink-100 px-3 py-2 text-sm text-ink-700 transition-colors hover:bg-surface-100"
              >
                {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={1.75} />}
                {copied ? 'コピーしました' : 'コピー'}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => onClose(true)}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition"
              style={{ background: 'var(--line-green)' }}
            >
              控えました (閉じる)
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <Field label="ログインに使うメールアドレス" required>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={fieldClass}
            />
          </Field>

          <p className="text-[11px] text-ink-300">
            パスワードは自動で作られ、発行した直後に 1 回だけ表示されます (記録には残りません)。
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="rounded-lg border border-ink-100 px-4 py-2 text-sm text-ink-500 transition-colors hover:bg-surface-100"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
              style={{ background: 'var(--line-green)' }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              発行する
            </button>
          </div>
        </form>
      )}
    </SlidePanel>
  );
}

/** 日付のみ (broadcast/page.tsx の formatDateTime と同流儀。共有ユーティリティは存在しない) */
function formatDate(s: string | null): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return s;
  }
}

function formatDateTime(s: string | null): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return s;
  }
}
