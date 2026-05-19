'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, X, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import { api, type CopilotContext, type CopilotSuggestion } from '@/lib/api';

function detectContext(pathname: string): CopilotContext | null {
  if (pathname.includes('/admin/dashboard')) return 'dashboard';
  if (pathname.includes('/admin/inbox')) return 'inbox';
  if (pathname.includes('/admin/broadcast')) return 'broadcast';
  if (pathname.includes('/admin/customers')) return 'customers';
  if (pathname.includes('/admin/segments')) return 'segments';
  return null;
}

const ACTION_LABELS: Record<CopilotSuggestion['action'], string> = {
  'go-to': '画面を開く',
  create: '新規作成',
  analyze: '分析する',
  message: 'メッセージを送る',
};

export function AiCopilotFab() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<CopilotSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const context = detectContext(pathname);

  useEffect(() => {
    if (open) {
      document.body.setAttribute('data-drawer', 'open');
    } else {
      document.body.removeAttribute('data-drawer');
    }
    return () => {
      document.body.removeAttribute('data-drawer');
    };
  }, [open]);

  const requestSuggestions = async () => {
    if (!context) {
      setError('この画面では AI Copilot は使えません (対応画面: ホーム / 受信箱 / 配信 / お客様 / 配信先)');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { suggestions } = await api.ai.copilotSuggest(context);
      setSuggestions(suggestions);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="AI Copilot を開く"
        data-fab="ai-copilot"
        onClick={() => setOpen(true)}
        className="group fixed bottom-10 right-0 z-50 flex flex-col items-center gap-2 rounded-l-2xl px-2.5 py-4 text-white"
        style={{
          background: 'var(--gradient-primary)',
          boxShadow:
            '-10px 12px 32px -10px rgba(184,154,236,0.55), -6px 6px 16px -6px rgba(245,143,184,0.40), inset 1px 0 0 rgba(255,255,255,0.4)',
        }}
      >
        <span
          aria-hidden
          className="absolute inset-0 -z-10 rounded-l-2xl opacity-50 blur-xl"
          style={{ background: 'var(--gradient-primary)' }}
        />
        <Sparkles size={18} strokeWidth={2} />
        <span
          className="text-[11px] font-semibold"
          style={{ writingMode: 'vertical-rl', letterSpacing: '0.18em' }}
        >
          AI Copilot
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/30"
          onClick={() => setOpen(false)}
        >
          <aside
            className="flex h-full w-[640px] flex-col border-l border-purple-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  AI Copilot
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  現在の画面: {context ?? '(対応外)'} — 今やるべき次の一手を提案します
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {!suggestions && !loading && (
                <div className="rounded-lg border border-dashed border-purple-200 bg-purple-50/50 p-6 text-center">
                  <Sparkles className="mx-auto mb-2 h-6 w-6 text-purple-400" />
                  <p className="text-sm text-slate-700">
                    現在の画面 ({context ?? '対応外'}) の状況を AI が分析して、次にやるべき行動を 3 案提示します。
                  </p>
                  <button
                    type="button"
                    onClick={requestSuggestions}
                    disabled={!context}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-600 disabled:opacity-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    次の一手を取得
                  </button>
                </div>
              )}

              {loading && (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  AI が分析中…
                </div>
              )}

              {error && (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {suggestions && suggestions.length === 0 && !loading && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  AI が提案を返せませんでした (API キー未設定 or 出力解析失敗)。再試行してください。
                </div>
              )}

              {suggestions && suggestions.length > 0 && (
                <div className="space-y-2">
                  {suggestions.map((s, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-purple-100 bg-purple-50/40 p-4 transition hover:border-purple-300 hover:bg-purple-50"
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-purple-600">
                          {ACTION_LABELS[s.action]}
                        </span>
                        <span className="text-[10px] text-slate-400">案 {i + 1}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900">{s.title}</h4>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{s.description}</p>
                      {s.targetPath && (
                        <Link
                          href={s.targetPath}
                          onClick={() => setOpen(false)}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-purple-700 hover:text-purple-900"
                        >
                          {s.targetPath} へ移動
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={requestSuggestions}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-xs text-purple-700 hover:bg-purple-50 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3 w-3" />
                    もう一度提案してもらう
                  </button>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
