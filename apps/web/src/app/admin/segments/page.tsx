'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layers, Plus, Trash2, Users, Save, X } from 'lucide-react';
import {
  api,
  type Segment,
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
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setPreviewCount(null);
  };

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
    setPreviewCount(null);
    try {
      const { count } = await api.segments.previewCount(seg.id);
      setPreviewCount(count);
    } catch (e) {
      setPreviewCount(null);
    }
  };

  const closeEdit = () => {
    setEdit(null);
    setPreviewCount(null);
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
                  placeholder="例: 池袋 VIP 月 2 回以上来店"
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

              {edit.id && previewCount !== null && (
                <div className="rounded-lg border border-pink-100 bg-pink-50/60 px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-pink-700">
                    <Users className="h-4 w-4" />
                    現在の条件で該当する顧客: <strong>{previewCount} 名</strong>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    変更を保存後に再表示。詳細な内訳・配信コスト見積は次バージョン (Day 8) で追加予定。
                  </p>
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
    </div>
  );
}
