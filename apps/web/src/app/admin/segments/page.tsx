'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, Plus, Trash2, Users, Save, X, Send, Sparkles, Loader2, Check } from 'lucide-react';
import {
  api,
  type Segment,
  type SegmentPreview,
  type Tag,
  type Location,
  TENANT_ID,
} from '@/lib/api';

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'treatment', label: '施術タイプ' },
  { id: 'status', label: '顧客ステータス' },
  { id: 'segment', label: '客層' },
  { id: 'location', label: '拠点' },
];

type EditState = {
  id: string | null;
  name: string;
  description: string;
  locationId: string | null;
  tagIds: string[];
  matchType: 'any' | 'all';
  excludeTagIds: string[];
};

const EMPTY_EDIT: EditState = {
  id: null,
  name: '',
  description: '',
  locationId: null,
  tagIds: [],
  matchType: 'any',
  excludeTagIds: [],
};

export default function SegmentsPage() {
  const [segments, setSegments] = useState<Segment[] | null>(null);
  const [tagsAll, setTagsAll] = useState<Tag[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [preview, setPreview] = useState<SegmentPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [broadcastModal, setBroadcastModal] = useState<{ message: string; suggestions: string[] | null; suggestLoading: boolean; sendResult: string | null } | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [segs, ts, locs] = await Promise.all([
        api.segments.list(),
        api.tags.list(),
        api.locations.list(),
      ]);
      setSegments(segs);
      setTagsAll(ts);
      setLocations(locs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setSegments([]);
    }
  }, []);

  useEffect(() => {
    if (TENANT_ID) refresh();
  }, [refresh]);

  const tagsByCategory = useMemo(() => {
    const grouped = new Map<string, Tag[]>();
    for (const t of tagsAll) {
      const cat = t.category ?? 'segment';
      const list = grouped.get(cat) ?? [];
      list.push(t);
      grouped.set(cat, list);
    }
    return grouped;
  }, [tagsAll]);

  const tagById = useMemo(() => {
    const m = new Map<string, Tag>();
    for (const t of tagsAll) m.set(t.id, t);
    return m;
  }, [tagsAll]);

  const openNew = () => {
    setEdit({ ...EMPTY_EDIT });
    setPreview(null);
  };

  const loadPreview = useCallback(async (id: string) => {
    setPreviewLoading(true);
    try {
      const p = await api.segments.preview(id);
      setPreview(p);
    } catch (e) {
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const openExisting = async (seg: Segment) => {
    setEdit({
      id: seg.id,
      name: seg.name,
      description: seg.description ?? '',
      locationId: seg.locationId,
      tagIds: [...seg.tagIds],
      matchType: (seg.matchType ?? 'any') as 'any' | 'all',
      excludeTagIds: [...seg.excludeTagIds],
    });
    setPreview(null);
    void loadPreview(seg.id);
  };

  const closeEdit = () => {
    setEdit(null);
    setPreview(null);
  };

  const openBroadcastModal = () => {
    setBroadcastModal({ message: '', suggestions: null, suggestLoading: false, sendResult: null });
  };

  const closeBroadcastModal = () => setBroadcastModal(null);

  const requestSuggestions = async () => {
    if (!edit?.id || !broadcastModal) return;
    setBroadcastModal({ ...broadcastModal, suggestLoading: true });
    try {
      const { suggestions } = await api.segments.suggest(edit.id);
      setBroadcastModal((prev) => prev && { ...prev, suggestions, suggestLoading: false });
    } catch (e) {
      setBroadcastModal((prev) =>
        prev && {
          ...prev,
          suggestLoading: false,
          sendResult: e instanceof Error ? `AI 候補取得エラー: ${e.message}` : 'AI 候補取得エラー',
        },
      );
    }
  };

  const useSuggestion = (text: string) => {
    if (!broadcastModal) return;
    setBroadcastModal({ ...broadcastModal, message: text });
  };

  const sendBroadcast = async () => {
    if (!edit?.id || !broadcastModal) return;
    if (!broadcastModal.message.trim()) {
      setBroadcastModal({ ...broadcastModal, sendResult: '本文を入力してください' });
      return;
    }
    if (!confirm(`このセグメント (${preview?.count ?? '?'} 名) に配信を実行しますか?`)) return;

    setBroadcastModal({ ...broadcastModal, sendResult: '送信中…' });
    try {
      const result = await api.segments.broadcast(edit.id, broadcastModal.message);
      setBroadcastModal({
        ...broadcastModal,
        sendResult: `配信完了: 該当 ${result.recipientCount} 名 / 送信可能 ${result.sendableCount} 名 / 実送信 ${result.sentCount} 名`,
      });
      if (edit.id) void loadPreview(edit.id);
    } catch (e) {
      setBroadcastModal({
        ...broadcastModal,
        sendResult: e instanceof Error ? `エラー: ${e.message}` : 'エラー',
      });
    }
  };

  const toggleInclude = (tagId: string) => {
    if (!edit) return;
    const has = edit.tagIds.includes(tagId);
    setEdit({
      ...edit,
      tagIds: has ? edit.tagIds.filter((t) => t !== tagId) : [...edit.tagIds, tagId],
      excludeTagIds: edit.excludeTagIds.filter((t) => t !== tagId),
    });
  };

  const toggleExclude = (tagId: string) => {
    if (!edit) return;
    const has = edit.excludeTagIds.includes(tagId);
    setEdit({
      ...edit,
      excludeTagIds: has
        ? edit.excludeTagIds.filter((t) => t !== tagId)
        : [...edit.excludeTagIds, tagId],
      tagIds: edit.tagIds.filter((t) => t !== tagId),
    });
  };

  const save = async () => {
    if (!edit) return;
    if (!edit.name.trim()) {
      setError('名称は必須です');
      return;
    }
    if (edit.tagIds.length === 0) {
      setError('含めるタグを最低 1 つ選んでください');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: edit.name.trim(),
        description: edit.description.trim() || undefined,
        locationId: edit.locationId,
        tagIds: edit.tagIds,
        matchType: edit.matchType,
        excludeTagIds: edit.excludeTagIds,
      };
      if (edit.id) {
        await api.segments.update(edit.id, payload);
      } else {
        await api.segments.create(payload);
      }
      await refresh();
      closeEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!edit?.id) return;
    if (!confirm('このセグメントを削除しますか?')) return;
    setBusy(true);
    try {
      await api.segments.remove(edit.id);
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
            <Layers className="h-6 w-6 text-pink-500" />
            セグメント (絞り込みグループ)
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            タグの組合せでお客さんを絞り込む条件を作成。配信や AI 分析の対象指定に使う。
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-lg bg-pink-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-pink-600"
        >
          <Plus className="h-4 w-4" />
          新規作成
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
            セグメント一覧 ({segments?.length ?? 0})
          </div>
          {segments === null && (
            <div className="px-4 py-8 text-center text-sm text-slate-400">読込中…</div>
          )}
          {segments && segments.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              まだセグメントがありません。
              <br />
              「新規作成」から最初のグループ条件を作りましょう。
            </div>
          )}
          {segments && segments.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {segments.map((seg) => {
                const matchLabel = seg.matchType === 'all' ? 'すべて一致' : 'いずれか一致';
                const isActive = edit?.id === seg.id;
                return (
                  <li key={seg.id}>
                    <button
                      type="button"
                      onClick={() => openExisting(seg)}
                      className={`flex w-full flex-col gap-1 px-4 py-3 text-left transition hover:bg-pink-50/60 ${
                        isActive ? 'bg-pink-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900">{seg.name}</span>
                        <span className="text-xs text-slate-500">
                          {seg.tagIds.length} タグ
                          {seg.excludeTagIds.length > 0 && ` / 除外 ${seg.excludeTagIds.length}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5">{matchLabel}</span>
                        {seg.locationId &&
                          locations.find((l) => l.id === seg.locationId)?.name && (
                            <span className="rounded-md bg-slate-100 px-2 py-0.5">
                              {locations.find((l) => l.id === seg.locationId)?.name}
                            </span>
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
              左から既存セグメントを選ぶか、
              <br />
              右上の「新規作成」を押してください。
            </div>
          )}

          {edit && (
            <div className="space-y-6 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">
                  {edit.id ? 'セグメント編集' : '新規セグメント'}
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
                <label className="text-sm font-medium text-slate-700">名称</label>
                <input
                  type="text"
                  value={edit.name}
                  onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                  placeholder="例: VIP リピーター / 新規 1 ヶ月以内 / 休眠顧客"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">説明 (任意)</label>
                <textarea
                  value={edit.description}
                  onChange={(e) => setEdit({ ...edit, description: e.target.value })}
                  placeholder="このセグメントをどう使うか、社内向けメモ"
                  rows={2}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">対象拠点 (任意)</label>
                <select
                  value={edit.locationId ?? ''}
                  onChange={(e) =>
                    setEdit({ ...edit, locationId: e.target.value || null })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
                >
                  <option value="">指定なし (全拠点)</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-700">含めるタグ</label>
                  <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setEdit({ ...edit, matchType: 'any' })}
                      className={`rounded px-2 py-1 transition ${
                        edit.matchType === 'any'
                          ? 'bg-pink-500 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      いずれか一致
                    </button>
                    <button
                      type="button"
                      onClick={() => setEdit({ ...edit, matchType: 'all' })}
                      className={`rounded px-2 py-1 transition ${
                        edit.matchType === 'all'
                          ? 'bg-pink-500 text-white'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      すべて一致
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  {edit.matchType === 'any'
                    ? '選んだタグの「どれか 1 つでも持っている顧客」が対象'
                    : '選んだタグの「すべてを持っている顧客」が対象'}
                </p>
                {CATEGORIES.map((cat) => {
                  const tags = tagsByCategory.get(cat.id) ?? [];
                  if (tags.length === 0) return null;
                  return (
                    <div key={cat.id} className="space-y-1">
                      <div className="text-xs font-medium text-slate-500">{cat.label}</div>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((t) => {
                          const on = edit.tagIds.includes(t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => toggleInclude(t.id)}
                              className={`rounded-full border px-3 py-1 text-xs transition ${
                                on
                                  ? 'border-pink-400 bg-pink-100 text-pink-700'
                                  : 'border-slate-200 bg-white text-slate-600 hover:border-pink-200 hover:bg-pink-50'
                              }`}
                              style={
                                on && t.color
                                  ? { borderColor: t.color, backgroundColor: `${t.color}22`, color: t.color }
                                  : undefined
                              }
                            >
                              {t.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">外したいタグ (任意)</label>
                <p className="text-xs text-slate-500">
                  このタグを持っている顧客は対象から外す
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {tagsAll.map((t) => {
                    const on = edit.excludeTagIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleExclude(t.id)}
                        className={`rounded-full border px-3 py-1 text-xs transition ${
                          on
                            ? 'border-slate-700 bg-slate-700 text-white'
                            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {edit.id && (
                <div className="space-y-3">
                  {previewLoading && (
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> 該当人数を集計中…
                    </div>
                  )}
                  {!previewLoading && preview && (
                    <div className="space-y-3 rounded-lg border border-pink-100 bg-pink-50/60 p-4">
                      <div className="flex items-center gap-2 text-sm text-pink-700">
                        <Users className="h-4 w-4" />
                        現在の条件で該当する顧客: <strong>{preview.count} 名</strong>
                      </div>

                      {preview.count > 0 && (
                        <>
                          <TierBar tierBreakdown={preview.tierBreakdown} total={preview.count} />

                          <div className="rounded-md border border-slate-200 bg-white p-3 text-xs">
                            <div className="mb-1.5 font-medium text-slate-700">
                              配信費用見積 (LINE Messaging API ¥{preview.costEstimate.pricePerMessage}/通)
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600">
                              <span>全員に配信</span>
                              <span className="text-right tabular-nums">
                                ¥{preview.costEstimate.costYen.toLocaleString()}
                              </span>
                              {preview.costEstimate.dormantCount > 0 && (
                                <>
                                  <span>休眠顧客 ({preview.costEstimate.dormantCount} 名) 除外</span>
                                  <span className="text-right tabular-nums text-emerald-600">
                                    ¥{preview.costEstimate.costExcludingDormantYen.toLocaleString()}
                                    <span className="ml-1 text-[10px] text-emerald-700">
                                      (-¥{preview.costEstimate.potentialSavingsYen.toLocaleString()})
                                    </span>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {preview.sampleCustomers.length > 0 && (
                            <div className="text-xs text-slate-500">
                              該当例:{' '}
                              {preview.sampleCustomers.map((c) => c.name).join(' / ')}
                              {preview.count > preview.sampleCustomers.length &&
                                ` ほか ${preview.count - preview.sampleCustomers.length} 名`}
                            </div>
                          )}

                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={openBroadcastModal}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-pink-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-pink-600"
                            >
                              <Send className="h-3.5 w-3.5" />
                              この条件で配信
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

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
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeEdit}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    キャンセル
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-pink-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-pink-600 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {edit.id ? '更新' : '作成'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 配信モーダル */}
      {broadcastModal && edit?.id && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={closeBroadcastModal}
        >
          <div
            className="w-full max-w-2xl rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Send className="h-4 w-4 text-pink-500" />
                セグメント配信 ({preview?.count ?? '?'} 名対象)
              </h3>
              <button
                type="button"
                onClick={closeBroadcastModal}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="閉じる"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">配信文</label>
                <button
                  type="button"
                  onClick={requestSuggestions}
                  disabled={broadcastModal.suggestLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                >
                  {broadcastModal.suggestLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  AI に配信文案を出してもらう
                </button>
              </div>

              {broadcastModal.suggestions && (
                <div className="space-y-2 rounded-lg border border-purple-100 bg-purple-50/50 p-3">
                  <div className="text-xs font-medium text-purple-700">
                    AI 提案 3 案 — クリックで本文に挿入
                  </div>
                  {broadcastModal.suggestions.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => useSuggestion(s)}
                      className="block w-full rounded-md border border-purple-100 bg-white p-3 text-left text-xs text-slate-700 hover:border-purple-300 hover:bg-purple-50"
                    >
                      <div className="mb-1 text-[10px] font-medium text-purple-600">案 {i + 1}</div>
                      <div className="whitespace-pre-wrap leading-relaxed">{s}</div>
                    </button>
                  ))}
                </div>
              )}

              <textarea
                value={broadcastModal.message}
                onChange={(e) =>
                  setBroadcastModal({ ...broadcastModal, message: e.target.value })
                }
                placeholder="ここに配信本文を入力 (LINE のテキストメッセージとして送信)"
                rows={6}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-100"
              />
              <div className="text-right text-xs text-slate-500">
                {broadcastModal.message.length} 文字
              </div>

              {broadcastModal.sendResult && (
                <div
                  className={`rounded-md px-3 py-2 text-xs ${
                    broadcastModal.sendResult.startsWith('配信完了')
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                      : broadcastModal.sendResult.startsWith('送信中')
                        ? 'border border-slate-200 bg-slate-50 text-slate-600'
                        : 'border border-rose-200 bg-rose-50 text-rose-700'
                  }`}
                >
                  {broadcastModal.sendResult.startsWith('配信完了') && (
                    <Check className="mr-1 inline h-3.5 w-3.5" />
                  )}
                  {broadcastModal.sendResult}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={closeBroadcastModal}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  閉じる
                </button>
                <button
                  type="button"
                  onClick={sendBroadcast}
                  disabled={!broadcastModal.message.trim() || broadcastModal.sendResult === '送信中…'}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-pink-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-pink-600 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  送信する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TierBar({
  tierBreakdown,
  total,
}: {
  tierBreakdown: { active: number; warm: number; cold: number; dormant: number; unknown: number };
  total: number;
}) {
  if (total === 0) return null;
  const items = [
    { key: 'active', label: '活発', count: tierBreakdown.active, color: 'bg-emerald-400' },
    { key: 'warm', label: '関心あり', count: tierBreakdown.warm, color: 'bg-amber-400' },
    { key: 'cold', label: '冷ややか', count: tierBreakdown.cold, color: 'bg-orange-400' },
    { key: 'dormant', label: '休眠', count: tierBreakdown.dormant, color: 'bg-slate-400' },
    { key: 'unknown', label: '未分類', count: tierBreakdown.unknown, color: 'bg-slate-300' },
  ];
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-slate-100">
        {items.map((it) => {
          const pct = (it.count / total) * 100;
          if (pct === 0) return null;
          return <div key={it.key} className={it.color} style={{ width: `${pct}%` }} />;
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
        {items.map(
          (it) =>
            it.count > 0 && (
              <span key={it.key} className="inline-flex items-center gap-1">
                <span className={`inline-block h-2 w-2 rounded-full ${it.color}`} />
                {it.label} {it.count}
              </span>
            ),
        )}
      </div>
    </div>
  );
}
