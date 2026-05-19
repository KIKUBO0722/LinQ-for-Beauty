'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, MessageSquare, BookOpen, Plus, Trash2, Save, X, Loader2, Wand2, Sparkles, Hand, Copy } from 'lucide-react';
import {
  api,
  KNOWLEDGE_CATEGORIES,
  AI_PURPOSE_LABELS,
  AI_TONE_LABELS,
  TENANT_ID,
  type AiConfig,
  type AiKnowledge,
  type AiKeywordRule,
  type AiPurpose,
  type AiTone,
  type AutoReplyResult,
} from '@/lib/api';

type Tab = 'config' | 'knowledge' | 'keyword' | 'generation' | 'greeting';

export default function AiPage() {
  const [tab, setTab] = useState<Tab>('config');
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [knowledge, setKnowledge] = useState<AiKnowledge[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [cfg, ks] = await Promise.all([api.ai.getConfig(), api.ai.listKnowledge()]);
      setConfig(cfg);
      setKnowledge(ks);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (TENANT_ID) refresh();
  }, [refresh]);

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <Bot className="h-6 w-6 text-purple-500" />
          AI 設定 (お客様メッセージへの自動応答)
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          応答 ON / OFF、応答トーン、お店の基本情報 (営業時間 / メニュー等) を設定。Day 10 で「キーワード応答」「文章生成」「あいさつ」も追加予定。
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {/* タブ */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        <TabButton active={tab === 'config'} onClick={() => setTab('config')} Icon={MessageSquare} label="応答設定" />
        <TabButton active={tab === 'knowledge'} onClick={() => setTab('knowledge')} Icon={BookOpen} label="ナレッジ" />
        <TabButton active={tab === 'keyword'} onClick={() => setTab('keyword')} Icon={Sparkles} label="キーワード応答" />
        <TabButton active={tab === 'generation'} onClick={() => setTab('generation')} Icon={Wand2} label="文章生成" />
        <TabButton active={tab === 'greeting'} onClick={() => setTab('greeting')} Icon={Hand} label="あいさつ" />
        <span className="ml-auto self-center text-xs text-slate-400">
          {config?.autoReplyEnabled ? '🟢 自動応答 ON' : '⚪ 自動応答 OFF'}
        </span>
      </div>

      {tab === 'config' && config && (
        <ConfigTab config={config} onSaved={refresh} setError={setError} />
      )}
      {tab === 'knowledge' && (
        <KnowledgeTab knowledge={knowledge} onChanged={refresh} setError={setError} />
      )}
      {tab === 'keyword' && config && (
        <KeywordTab config={config} onSaved={refresh} setError={setError} />
      )}
      {tab === 'generation' && (
        <GenerationTab setError={setError} />
      )}
      {tab === 'greeting' && config && (
        <GreetingTab config={config} onSaved={refresh} setError={setError} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  Icon: typeof MessageSquare;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-sm transition ${
        active
          ? 'border-purple-500 text-purple-700'
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

// ====== 応答設定タブ ======

function ConfigTab({
  config,
  onSaved,
  setError,
}: {
  config: AiConfig;
  onSaved: () => void;
  setError: (e: string | null) => void;
}) {
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(config.autoReplyEnabled);
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt ?? '');
  const [handoffInput, setHandoffInput] = useState('');
  const [handoffKeywords, setHandoffKeywords] = useState<string[]>(config.handoffKeywords ?? []);
  const [temperature, setTemperature] = useState(config.temperature);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const addKeyword = () => {
    const k = handoffInput.trim();
    if (!k || handoffKeywords.includes(k)) return;
    setHandoffKeywords([...handoffKeywords, k]);
    setHandoffInput('');
  };
  const removeKeyword = (k: string) => setHandoffKeywords(handoffKeywords.filter((x) => x !== k));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.ai.updateConfig({
        autoReplyEnabled,
        systemPrompt,
        handoffKeywords,
        temperature,
      });
      setSavedAt(new Date().toLocaleTimeString('ja-JP'));
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* 自動応答 ON/OFF */}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <div className="font-medium text-slate-900">自動応答</div>
          <p className="mt-0.5 text-xs text-slate-500">
            LINE で受信した顧客メッセージに AI が自動応答 (Day 18 の LINE 公式アカウント接続後に実発動)
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAutoReplyEnabled(!autoReplyEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            autoReplyEnabled ? 'bg-purple-500' : 'bg-slate-300'
          }`}
          aria-label="自動応答 ON/OFF"
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${
              autoReplyEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* システムプロンプト */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">応答トーン (AI への指示文)</label>
        <p className="text-xs text-slate-500">
          AI が応答するときの「お店の人格」を定義。お客様への口調・避けたい話題・引き継ぎ条件などを記載。
        </p>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          rows={8}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
        />
      </div>

      {/* 引き継ぎキーワード */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">スタッフへ引き継ぐキーワード</label>
        <p className="text-xs text-slate-500">
          顧客メッセージにこれらの語が含まれていたら AI 応答せず「スタッフから連絡します」だけ返して人間に通知
        </p>
        <div className="flex flex-wrap gap-1.5">
          {handoffKeywords.map((k) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700"
            >
              {k}
              <button
                type="button"
                onClick={() => removeKeyword(k)}
                className="rounded-full hover:bg-amber-200"
                aria-label={`${k} を削除`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={handoffInput}
            onChange={(e) => setHandoffInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addKeyword();
              }
            }}
            placeholder="例: 予約 / アレルギー / クレーム / 返金 / 体調"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
          />
          <button
            type="button"
            onClick={addKeyword}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm text-white hover:bg-amber-600"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 温度 (応答のばらつき) */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">
          応答のばらつき度: {temperature} / 10
        </label>
        <p className="text-xs text-slate-500">
          低い = 同じ質問にいつも同じ答え (堅実) / 高い = 表現が毎回少し違う (柔らかい)
        </p>
        <input
          type="range"
          min={0}
          max={10}
          value={temperature}
          onChange={(e) => setTemperature(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="text-xs text-slate-500">
          モデル: <code className="rounded bg-slate-100 px-1.5 py-0.5">{config.model}</code>
          {savedAt && <span className="ml-3 text-emerald-600">✓ 保存しました ({savedAt})</span>}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-600 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          保存
        </button>
      </div>
    </div>
  );
}

// ====== ナレッジタブ ======

function KnowledgeTab({
  knowledge,
  onChanged,
  setError,
}: {
  knowledge: AiKnowledge[];
  onChanged: () => void;
  setError: (e: string | null) => void;
}) {
  const [edit, setEdit] = useState<{
    id: string | null;
    category: string;
    title: string;
    content: string;
    isActive: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const groupedByCategory = useMemo(() => {
    const m = new Map<string, AiKnowledge[]>();
    for (const k of knowledge) {
      const list = m.get(k.category) ?? [];
      list.push(k);
      m.set(k.category, list);
    }
    return m;
  }, [knowledge]);

  const openNew = (category: string = 'faq') => {
    setEdit({ id: null, category, title: '', content: '', isActive: true });
  };

  const openExisting = (k: AiKnowledge) => {
    setEdit({ id: k.id, category: k.category, title: k.title, content: k.content, isActive: k.isActive });
  };

  const save = async () => {
    if (!edit) return;
    if (!edit.title.trim() || !edit.content.trim()) {
      setError('タイトルと本文は必須です');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (edit.id) {
        await api.ai.updateKnowledge(edit.id, {
          category: edit.category,
          title: edit.title.trim(),
          content: edit.content.trim(),
          isActive: edit.isActive,
        });
      } else {
        await api.ai.createKnowledge({
          category: edit.category,
          title: edit.title.trim(),
          content: edit.content.trim(),
          isActive: edit.isActive,
        });
      }
      setEdit(null);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!edit?.id) return;
    if (!confirm('このナレッジを削除しますか?')) return;
    setBusy(true);
    try {
      await api.ai.removeKnowledge(edit.id);
      setEdit(null);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-[minmax(340px,420px)_1fr] gap-6">
      {/* 左: カテゴリ別一覧 */}
      <div className="space-y-3">
        {KNOWLEDGE_CATEGORIES.map((cat) => {
          const items = groupedByCategory.get(cat.id) ?? [];
          return (
            <div key={cat.id} className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                <span className="text-sm font-medium text-slate-700">
                  {cat.label} ({items.length})
                </span>
                <button
                  type="button"
                  onClick={() => openNew(cat.id)}
                  className="rounded-md p-1 text-slate-400 hover:bg-purple-50 hover:text-purple-600"
                  aria-label={`${cat.label} に追加`}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {items.length === 0 ? (
                <div className="px-3 py-3 text-xs text-slate-400">
                  まだ登録なし
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {items.map((k) => (
                    <li key={k.id}>
                      <button
                        type="button"
                        onClick={() => openExisting(k)}
                        className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left transition hover:bg-purple-50/60 ${
                          edit?.id === k.id ? 'bg-purple-50' : ''
                        }`}
                      >
                        <span className="text-sm font-medium text-slate-900 line-clamp-1">
                          {k.title}
                        </span>
                        <span className="text-xs text-slate-500 line-clamp-1">{k.content}</span>
                        {!k.isActive && (
                          <span className="mt-0.5 inline-flex w-fit rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                            停止中
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* 右: 編集 */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {!edit && (
          <div className="flex h-full min-h-[400px] items-center justify-center px-8 py-16 text-center text-sm text-slate-400">
            左のカテゴリの「+」ボタンか、既存ナレッジをクリックして編集
          </div>
        )}

        {edit && (
          <div className="space-y-5 p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {edit.id ? 'ナレッジ編集' : '新規ナレッジ'}
              </h3>
              <button
                type="button"
                onClick={() => setEdit(null)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">カテゴリ</label>
              <select
                value={edit.category}
                onChange={(e) => setEdit({ ...edit, category: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
              >
                {KNOWLEDGE_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">タイトル</label>
              <input
                type="text"
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
                placeholder="例: 営業時間 / カット料金 / キャンセル ポリシー"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">本文 (AI が参照する答え)</label>
              <textarea
                value={edit.content}
                onChange={(e) => setEdit({ ...edit, content: e.target.value })}
                placeholder="例: 平日 11:00-20:00 / 土日 10:00-19:00 / 火曜定休"
                rows={6}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="knowledge-active"
                checked={edit.isActive}
                onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="knowledge-active" className="text-sm text-slate-700">
                AI に参照させる (OFF にすると一覧には残るが応答時には使わない)
              </label>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div>
                {edit.id && (
                  <button
                    type="button"
                    onClick={remove}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    削除
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-600 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {edit.id ? '更新' : '作成'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ====== キーワード応答タブ ======

function KeywordTab({
  config,
  onSaved,
  setError,
}: {
  config: AiConfig;
  onSaved: () => void;
  setError: (e: string | null) => void;
}) {
  const [rules, setRules] = useState<AiKeywordRule[]>(config.keywordRules ?? []);
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const addRule = () => {
    setRules([...rules, { keyword: '', response: '', matchType: 'contains' }]);
  };

  const updateRule = (idx: number, patch: Partial<AiKeywordRule>) => {
    setRules(rules.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const removeRule = (idx: number) => {
    if (!confirm('このルールを削除しますか?')) return;
    setRules(rules.filter((_, i) => i !== idx));
  };

  const save = async () => {
    const cleaned = rules.filter((r) => r.keyword.trim() && r.response.trim());
    setBusy(true);
    setError(null);
    try {
      await api.ai.updateConfig({ keywordRules: cleaned });
      setSavedAt(new Date().toLocaleTimeString('ja-JP'));
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-slate-900">キーワード応答</h3>
        <p className="mt-1 text-xs text-slate-500">
          顧客メッセージに特定の語が含まれていたら、AI ではなく固定文で即返信。引き継ぎキーワードよりも優先度は低い (引き継ぎが優先)。
        </p>
      </div>

      <div className="space-y-3">
        {rules.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-400">
            まだルールがありません。「+ ルール追加」から作成
          </div>
        )}
        {rules.map((rule, idx) => (
          <div key={idx} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="grid grid-cols-[1fr_140px_36px] items-center gap-2">
              <input
                type="text"
                value={rule.keyword}
                onChange={(e) => updateRule(idx, { keyword: e.target.value })}
                placeholder="キーワード (例: 営業時間 / 駐車場 / 料金)"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
              />
              <select
                value={rule.matchType ?? 'contains'}
                onChange={(e) => updateRule(idx, { matchType: e.target.value as 'contains' | 'exact' | 'startsWith' })}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
              >
                <option value="contains">含む</option>
                <option value="exact">完全一致</option>
                <option value="startsWith">で始まる</option>
              </select>
              <button
                type="button"
                onClick={() => removeRule(idx)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                aria-label="削除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <textarea
              value={rule.response}
              onChange={(e) => updateRule(idx, { response: e.target.value })}
              placeholder="このキーワードを検知したときの返信文"
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
            />
          </div>
        ))}

        <button
          type="button"
          onClick={addRule}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:border-purple-300 hover:bg-purple-50"
        >
          <Plus className="h-4 w-4" />
          ルール追加
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="text-xs text-slate-500">
          {savedAt && <span className="text-emerald-600">✓ 保存しました ({savedAt})</span>}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-600 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          保存
        </button>
      </div>
    </div>
  );
}

// ====== 文章生成タブ ======

function GenerationTab({ setError }: { setError: (e: string | null) => void }) {
  const [purpose, setPurpose] = useState<AiPurpose>('broadcast');
  const [tone, setTone] = useState<AiTone>('friendly');
  const [extraContext, setExtraContext] = useState('');
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    setSuggestions(null);
    try {
      const { suggestions } = await api.ai.generate({
        purpose,
        tone,
        extraContext: extraContext.trim() || undefined,
      });
      setSuggestions(suggestions);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch (e) {
      setError('クリップボードへのコピーに失敗しました');
    }
  };

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-slate-900">文章生成</h3>
        <p className="mt-1 text-xs text-slate-500">
          用途と語り口を選んで、AI に 3 案を出してもらう。気に入った案はコピーして 配信 / クーポン / カウンセリングで使用。
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">用途</label>
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as AiPurpose)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
          >
            {Object.entries(AI_PURPOSE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-700">語り口</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as AiTone)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
          >
            {Object.entries(AI_TONE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">追加要望 (任意)</label>
        <textarea
          value={extraContext}
          onChange={(e) => setExtraContext(e.target.value)}
          placeholder="例: 春の新メニュー / 母の日キャンペーン / カラー後 6 週間経過した顧客向け"
          rows={2}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
        />
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-600 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
        AI で 3 案 生成
      </button>

      {suggestions && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <div className="text-sm font-medium text-slate-700">AI 提案 3 案</div>
          {suggestions.map((s, i) => (
            <div key={i} className="rounded-lg border border-purple-100 bg-purple-50/50 p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-medium text-purple-700">案 {i + 1}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(s, i)}
                  className="inline-flex items-center gap-1 rounded-md border border-purple-200 bg-white px-2 py-1 text-[10px] text-purple-700 hover:bg-purple-100"
                >
                  <Copy className="h-3 w-3" />
                  {copiedIdx === i ? 'コピー済' : 'コピー'}
                </button>
              </div>
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{s}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ====== あいさつタブ ======

function GreetingTab({
  config,
  onSaved,
  setError,
}: {
  config: AiConfig;
  onSaved: () => void;
  setError: (e: string | null) => void;
}) {
  const [welcomeMessage, setWelcomeMessage] = useState(config.welcomeMessage ?? '');
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.ai.updateConfig({ welcomeMessage });
      setSavedAt(new Date().toLocaleTimeString('ja-JP'));
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-base font-semibold text-slate-900">あいさつ (AI 経由の初回メッセージ)</h3>
        <p className="mt-1 text-xs text-slate-500">
          自動応答 ON 時、お客さんが LINE で友だち追加した直後に AI 経由で送る初回案内文。通常のあいさつ
          (友だち追加時のあいさつメッセージ) は「配信」タブの「あいさつ」で別に設定可能。
        </p>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-700">AI 案内文</label>
        <textarea
          value={welcomeMessage}
          onChange={(e) => setWelcomeMessage(e.target.value)}
          placeholder="例: ご質問は LINE でお気軽にどうぞ。営業時間外は AI が一次対応し、スタッフからも翌営業日にご連絡いたします。"
          rows={6}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
        />
        <div className="text-right text-xs text-slate-500">{welcomeMessage.length} 文字</div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 pt-4">
        <div className="text-xs text-slate-500">
          {savedAt && <span className="text-emerald-600">✓ 保存しました ({savedAt})</span>}
          {!config.autoReplyEnabled && (
            <span className="ml-3 text-amber-600">
              ⚠ 自動応答 OFF のため、この案内文は現在送信されません
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-600 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          保存
        </button>
      </div>
    </div>
  );
}
