'use client';

import { useCallback, useEffect, useState } from 'react';
import { Workflow, Plus, Trash2, Save, X, GripVertical, Clock, ArrowDown, Loader2, Power } from 'lucide-react';
import {
  api,
  STEP_TRIGGER_LABELS,
  TENANT_ID,
  type StepScenarioWithCounts,
  type StepScenarioDetail,
  type StepTriggerType,
} from '@/lib/api';

type EditMessage = {
  delayMinutes: number;
  text: string;
};

type EditState = {
  id: string | null;
  name: string;
  description: string;
  triggerType: StepTriggerType;
  isActive: boolean;
  messages: EditMessage[];
};

const EMPTY_EDIT: EditState = {
  id: null,
  name: '',
  description: '',
  triggerType: 'manual',
  isActive: false,
  messages: [{ delayMinutes: 0, text: '' }],
};

function formatDelay(min: number): string {
  if (min === 0) return '即時';
  const days = Math.floor(min / 1440);
  const hours = Math.floor((min % 1440) / 60);
  const mins = min % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} 日`);
  if (hours > 0) parts.push(`${hours} 時間`);
  if (mins > 0) parts.push(`${mins} 分`);
  return parts.join(' ') + '後';
}

export default function StepsPage() {
  const [scenarios, setScenarios] = useState<StepScenarioWithCounts[] | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const rows = await api.steps.list();
      setScenarios(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setScenarios([]);
    }
  }, []);

  useEffect(() => {
    if (TENANT_ID) refresh();
  }, [refresh]);

  const openNew = () => {
    setEdit({ ...EMPTY_EDIT, messages: [{ delayMinutes: 0, text: '' }] });
    setSavedAt(null);
  };

  const openExisting = async (id: string) => {
    setError(null);
    try {
      const detail: StepScenarioDetail = await api.steps.get(id);
      setEdit({
        id: detail.id,
        name: detail.name,
        description: detail.description ?? '',
        triggerType: detail.triggerType,
        isActive: detail.isActive,
        messages:
          detail.messages.length > 0
            ? detail.messages.map((m) => ({
                delayMinutes: m.delayMinutes,
                text: 'text' in m.messageContent ? (m.messageContent.text as string) : '',
              }))
            : [{ delayMinutes: 0, text: '' }],
      });
      setSavedAt(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const closeEdit = () => {
    setEdit(null);
    setSavedAt(null);
  };

  const updateMessage = (idx: number, patch: Partial<EditMessage>) => {
    if (!edit) return;
    setEdit({
      ...edit,
      messages: edit.messages.map((m, i) => (i === idx ? { ...m, ...patch } : m)),
    });
  };

  const addMessage = () => {
    if (!edit) return;
    setEdit({
      ...edit,
      messages: [...edit.messages, { delayMinutes: 1440, text: '' }], // デフォルト 1 日後
    });
  };

  const removeMessage = (idx: number) => {
    if (!edit) return;
    if (edit.messages.length <= 1) {
      setError('ステップは最低 1 つ必要です');
      return;
    }
    setEdit({ ...edit, messages: edit.messages.filter((_, i) => i !== idx) });
  };

  const moveMessage = (idx: number, dir: -1 | 1) => {
    if (!edit) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= edit.messages.length) return;
    const arr = [...edit.messages];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    setEdit({ ...edit, messages: arr });
  };

  const save = async () => {
    if (!edit) return;
    if (!edit.name.trim()) {
      setError('シナリオ名を入力してください');
      return;
    }
    const cleanedMessages = edit.messages.filter((m) => m.text.trim());
    if (cleanedMessages.length === 0) {
      setError('最低 1 つのステップに本文を入力してください');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const scenarioPayload = {
        name: edit.name.trim(),
        description: edit.description.trim() || undefined,
        triggerType: edit.triggerType,
        isActive: edit.isActive,
      };
      let scenarioId = edit.id;
      if (scenarioId) {
        await api.steps.update(scenarioId, scenarioPayload);
      } else {
        const created = await api.steps.create(scenarioPayload);
        scenarioId = created.id;
      }

      await api.steps.replaceMessages(
        scenarioId,
        cleanedMessages.map((m, i) => ({
          delayMinutes: m.delayMinutes,
          sortOrder: i,
          messageContent: { type: 'text' as const, text: m.text.trim() },
        })),
      );

      setSavedAt(new Date().toLocaleTimeString('ja-JP'));
      await refresh();
      // 新規作成の場合は ID 設定
      if (!edit.id) {
        setEdit({ ...edit, id: scenarioId });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!edit?.id) return;
    if (!confirm('このシナリオを削除しますか? 進行中の顧客もキャンセルされます')) return;
    setBusy(true);
    try {
      await api.steps.remove(edit.id);
      await refresh();
      closeEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Workflow className="h-6 w-6 text-purple-500" />
            ステップ配信 (順番に時間差で送るメッセージ)
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            「友だち追加 → 翌日お礼 → 1 週間後フォロー → 4 週間後再来店案内」のような決まった流れを自動で配信。
            <br />
            ⚠ 実発火スケジューラは Day 13 で結線、本日は作成 / 編集 / 進行管理まで。
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-600"
        >
          <Plus className="h-4 w-4" />
          新規シナリオ
        </button>
      </header>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-[minmax(340px,420px)_1fr] gap-6">
        {/* 左: 一覧 */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
            シナリオ一覧 ({scenarios?.length ?? 0})
          </div>
          {scenarios === null && (
            <div className="px-4 py-8 text-center text-sm text-slate-400">読込中…</div>
          )}
          {scenarios && scenarios.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              まだシナリオがありません。
              <br />
              「新規シナリオ」から作成しましょう。
            </div>
          )}
          {scenarios && scenarios.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {scenarios.map((s) => {
                const isActive = edit?.id === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => openExisting(s.id)}
                      className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-purple-50/60 ${
                        isActive ? 'bg-purple-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900">{s.name}</span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] ${
                            s.isActive
                              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border border-slate-200 bg-slate-50 text-slate-500'
                          }`}
                        >
                          <Power className="h-2.5 w-2.5" />
                          {s.isActive ? '有効' : '停止'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{STEP_TRIGGER_LABELS[s.triggerType]}</span>
                        <span className="text-slate-300">·</span>
                        <span>{s.messageCount} ステップ</span>
                        {s.activeEnrollmentCount > 0 && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="text-purple-600">進行中 {s.activeEnrollmentCount}</span>
                          </>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 右: 編集 */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {!edit && (
            <div className="flex h-full min-h-[400px] items-center justify-center px-8 py-16 text-center text-sm text-slate-400">
              左から既存シナリオを選ぶか、
              <br />
              右上の「新規シナリオ」を押してください。
            </div>
          )}

          {edit && (
            <div className="space-y-5 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  {edit.id ? 'シナリオ編集' : '新規シナリオ'}
                </h2>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="閉じる"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">シナリオ名</label>
                <input
                  type="text"
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  placeholder="例: 新規友だち追加 → 4 週間フォロー"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">説明 (任意)</label>
                <input
                  type="text"
                  value={edit.description}
                  onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                  placeholder="このシナリオの目的・対象を社内向けにメモ"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">起動タイミング</label>
                <select
                  value={edit.triggerType}
                  onChange={(e) => setEdit({ ...edit, triggerType: e.target.value as StepTriggerType })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                >
                  {Object.entries(STEP_TRIGGER_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  {edit.triggerType === 'manual'
                    ? '手動で顧客一覧画面から「シナリオに追加」する想定'
                    : '⚠ 自動トリガーの結線は Day 13 で実装、現在は手動 enroll のみ動作'}
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div>
                  <div className="text-sm font-medium text-slate-900">シナリオを有効化</div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    OFF の間は顧客の追加 / 自動配信 ともに止まる
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEdit({ ...edit, isActive: !edit.isActive })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    edit.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${
                      edit.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* ステップ並べ */}
              <div className="space-y-3">
                <div className="text-sm font-medium text-slate-700">配信ステップ ({edit.messages.length})</div>
                {edit.messages.map((m, i) => (
                  <div key={i} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-slate-400" />
                      <span className="text-xs font-medium text-slate-700">
                        ステップ {i + 1}
                      </span>
                      <span className="ml-auto text-xs text-slate-500">{formatDelay(m.delayMinutes)}</span>
                      <button
                        type="button"
                        onClick={() => moveMessage(i, -1)}
                        disabled={i === 0}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-200 disabled:opacity-30"
                        aria-label="上に移動"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveMessage(i, 1)}
                        disabled={i === edit.messages.length - 1}
                        className="rounded-md p-1 text-slate-400 hover:bg-slate-200 disabled:opacity-30"
                        aria-label="下に移動"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => removeMessage(i)}
                        className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label="削除"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Clock className="h-3.5 w-3.5" />
                      <span>前ステップから:</span>
                      <input
                        type="number"
                        value={Math.floor(m.delayMinutes / 1440)}
                        onChange={(e) => {
                          const days = Number(e.target.value) || 0;
                          const hours = Math.floor((m.delayMinutes % 1440) / 60);
                          updateMessage(i, { delayMinutes: days * 1440 + hours * 60 });
                        }}
                        min={0}
                        className="w-14 rounded border border-slate-300 px-1.5 py-0.5 text-xs focus:border-purple-400 focus:outline-none"
                      />
                      <span>日</span>
                      <input
                        type="number"
                        value={Math.floor((m.delayMinutes % 1440) / 60)}
                        onChange={(e) => {
                          const days = Math.floor(m.delayMinutes / 1440);
                          const hours = Number(e.target.value) || 0;
                          updateMessage(i, { delayMinutes: days * 1440 + hours * 60 });
                        }}
                        min={0}
                        max={23}
                        className="w-14 rounded border border-slate-300 px-1.5 py-0.5 text-xs focus:border-purple-400 focus:outline-none"
                      />
                      <span>時間 後</span>
                    </div>

                    <textarea
                      value={m.text}
                      onChange={(e) => updateMessage(i, { text: e.target.value })}
                      placeholder="LINE で送る本文"
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    />

                    {i < edit.messages.length - 1 && (
                      <div className="flex justify-center pt-1">
                        <ArrowDown className="h-4 w-4 text-slate-300" />
                      </div>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addMessage}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:border-purple-300 hover:bg-purple-50"
                >
                  <Plus className="h-4 w-4" />
                  ステップ追加
                </button>
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
                <div className="flex items-center gap-3">
                  {savedAt && <span className="text-xs text-emerald-600">✓ 保存しました ({savedAt})</span>}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
