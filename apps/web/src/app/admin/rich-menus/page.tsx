'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  Edit2,
  Image as ImageIcon,
  Layers,
  Link2,
  MessageCircle,
  Plus,
  Sparkles,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  RICH_MENU_PRESETS,
  lineAccountsApi,
  richMenusApi,
  type LineAccount,
  type RichMenu,
  type RichMenuArea,
  type RichMenuAreaAction,
  type RichMenuPreset,
  type RichMenuSize,
} from '../../../lib/api';

type LayoutTemplate = {
  name: string;
  cols: number;
  rows: number;
  build: (w: number, h: number) => Array<{
    bounds: { x: number; y: number; width: number; height: number };
    label: string;
  }>;
};

const LAYOUT_TEMPLATES: LayoutTemplate[] = [
  {
    name: '2 列',
    cols: 2,
    rows: 1,
    build: (w, h) => [
      { bounds: { x: 0, y: 0, width: w / 2, height: h }, label: '左' },
      { bounds: { x: w / 2, y: 0, width: w / 2, height: h }, label: '右' },
    ],
  },
  {
    name: '3 列',
    cols: 3,
    rows: 1,
    build: (w, h) => [
      { bounds: { x: 0, y: 0, width: w / 3, height: h }, label: '左' },
      { bounds: { x: w / 3, y: 0, width: w / 3, height: h }, label: '中' },
      { bounds: { x: (w / 3) * 2, y: 0, width: w / 3, height: h }, label: '右' },
    ],
  },
  {
    name: '2 × 2',
    cols: 2,
    rows: 2,
    build: (w, h) => [
      { bounds: { x: 0, y: 0, width: w / 2, height: h / 2 }, label: '左上' },
      { bounds: { x: w / 2, y: 0, width: w / 2, height: h / 2 }, label: '右上' },
      { bounds: { x: 0, y: h / 2, width: w / 2, height: h / 2 }, label: '左下' },
      { bounds: { x: w / 2, y: h / 2, width: w / 2, height: h / 2 }, label: '右下' },
    ],
  },
  {
    name: '2 × 3',
    cols: 3,
    rows: 2,
    build: (w, h) => [
      { bounds: { x: 0, y: 0, width: w / 3, height: h / 2 }, label: '左上' },
      { bounds: { x: w / 3, y: 0, width: w / 3, height: h / 2 }, label: '中上' },
      { bounds: { x: (w / 3) * 2, y: 0, width: w / 3, height: h / 2 }, label: '右上' },
      { bounds: { x: 0, y: h / 2, width: w / 3, height: h / 2 }, label: '左下' },
      { bounds: { x: w / 3, y: h / 2, width: w / 3, height: h / 2 }, label: '中下' },
      { bounds: { x: (w / 3) * 2, y: h / 2, width: w / 3, height: h / 2 }, label: '右下' },
    ],
  },
  {
    name: '1 大 + 2 小',
    cols: 2,
    rows: 2,
    build: (w, h) => [
      { bounds: { x: 0, y: 0, width: w / 2, height: h }, label: 'メイン' },
      { bounds: { x: w / 2, y: 0, width: w / 2, height: h / 2 }, label: '右上' },
      { bounds: { x: w / 2, y: h / 2, width: w / 2, height: h / 2 }, label: '右下' },
    ],
  },
];

type EditableArea = {
  bounds: { x: number; y: number; width: number; height: number };
  action: RichMenuAreaAction;
  label?: string;
};

type View = 'list' | 'create' | 'edit';
type MenuSize = 'full' | 'half';

const FULL_SIZE: RichMenuSize = { width: 2500, height: 1686 };
const HALF_SIZE: RichMenuSize = { width: 2500, height: 843 };

function sizeFor(m: MenuSize): RichMenuSize {
  return m === 'full' ? FULL_SIZE : HALF_SIZE;
}

function actionLabel(t: RichMenuAreaAction['type']): string {
  return t === 'uri' ? 'URL を開く' : t === 'postback' ? '内部データ送信' : 'テキスト送信';
}

function areaLetter(i: number): string {
  // 0 → 'A', 1 → 'B', ... LINE 公式マネージャー準拠
  return String.fromCharCode(65 + i);
}

function newEmptyAreas(template: LayoutTemplate, size: RichMenuSize): EditableArea[] {
  return template.build(size.width, size.height).map((a) => ({
    bounds: {
      x: Math.round(a.bounds.x),
      y: Math.round(a.bounds.y),
      width: Math.round(a.bounds.width),
      height: Math.round(a.bounds.height),
    },
    action: { type: 'message', text: '' },
    label: a.label,
  }));
}

function presetToAreas(preset: RichMenuPreset): EditableArea[] {
  return preset.areas.map((a) => ({
    bounds: { ...a.bounds },
    action: { ...a.action } as RichMenuAreaAction,
    label: a.label,
  }));
}

export default function RichMenusPage() {
  const [menus, setMenus] = useState<RichMenu[] | null>(null);
  const [accounts, setAccounts] = useState<LineAccount[]>([]);
  const [view, setView] = useState<View>('list');
  const [editingMenu, setEditingMenu] = useState<RichMenu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // editor state
  const [menuSize, setMenuSize] = useState<MenuSize>('full');
  const [name, setName] = useState('');
  const [chatBarText, setChatBarText] = useState('メニュー');
  const [areas, setAreas] = useState<EditableArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const size = sizeFor(menuSize);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    try {
      const [m, a] = await Promise.all([richMenusApi.list(), lineAccountsApi.list()]);
      setMenus(m);
      setAccounts(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : '読み込みに失敗しました');
      setMenus([]);
    }
  }

  function resetEditor() {
    setName('');
    setChatBarText('メニュー');
    setMenuSize('full');
    setAreas([]);
    setSelectedArea(null);
    setImageFile(null);
    setImagePreview(null);
    setEditingMenu(null);
  }

  function startCreateBlank() {
    resetEditor();
    setAreas(newEmptyAreas(LAYOUT_TEMPLATES[3], FULL_SIZE));
    setView('create');
  }

  function startCreateFromPreset(preset: RichMenuPreset) {
    resetEditor();
    setName(preset.name);
    setChatBarText(preset.chatBarText);
    setMenuSize(preset.size.height > 1000 ? 'full' : 'half');
    setAreas(presetToAreas(preset));
    setView('create');
  }

  function startEdit(menu: RichMenu) {
    resetEditor();
    setEditingMenu(menu);
    setName(menu.name);
    setChatBarText(menu.chatBarText ?? 'メニュー');
    const sz = menu.size ?? FULL_SIZE;
    setMenuSize(sz.height > 1000 ? 'full' : 'half');
    setAreas(
      (menu.areas ?? []).map((a, i) => ({
        bounds: a.bounds,
        action: a.action ?? { type: 'message' as const, text: '' },
        label: a.label ?? `エリア${areaLetter(i)}`,
      })),
    );
    setImagePreview(menu.imageUrl?.startsWith('http') ? menu.imageUrl : null);
    setView('edit');
  }

  function startDuplicate(menu: RichMenu) {
    // 既存メニューを土台に「新規作成」として開く (= editingMenu は null、保存時は新レコード)
    resetEditor();
    setName(`${menu.name} (コピー)`);
    setChatBarText(menu.chatBarText ?? 'メニュー');
    const sz = menu.size ?? FULL_SIZE;
    setMenuSize(sz.height > 1000 ? 'full' : 'half');
    setAreas(
      (menu.areas ?? []).map((a, i) => ({
        bounds: a.bounds,
        action: a.action ?? { type: 'message' as const, text: '' },
        label: a.label ?? `エリア${areaLetter(i)}`,
      })),
    );
    setView('create');
  }

  function applyTemplate(t: LayoutTemplate) {
    setAreas(newEmptyAreas(t, size));
    setSelectedArea(null);
  }

  function updateArea(i: number, patch: Partial<EditableArea>) {
    setAreas((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }

  function updateAreaAction(i: number, action: RichMenuAreaAction) {
    setAreas((prev) => prev.map((a, idx) => (idx === i ? { ...a, action } : a)));
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選んでください');
      return;
    }
    if (file.size > 1024 * 1024) {
      setError('画像は 1MB 以下にしてください');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setError(null);
    setInfo(null);
    if (!name.trim()) {
      setError('名前を入力してください');
      return;
    }
    if (accounts.length === 0) {
      setError('LINE 公式アカウントが未登録です');
      return;
    }
    const lineAccountId = accounts[0].id;

    setSaving(true);
    try {
      const mappedAreas: RichMenuArea[] = areas.map((a) => ({
        bounds: a.bounds,
        action: a.action,
        label: a.label,
      }));

      let menu: RichMenu;
      if (view === 'edit' && editingMenu) {
        menu = await richMenusApi.update(editingMenu.id, {
          name,
          chatBarText,
          size,
          areas: mappedAreas,
        });
      } else {
        menu = await richMenusApi.create({
          lineAccountId,
          name,
          chatBarText,
          size,
          areas: mappedAreas,
        });
      }

      if (imageFile) {
        try {
          await richMenusApi.uploadImage(menu.id, imageFile);
        } catch (uerr) {
          setInfo(
            `保存はできましたが、画像の LINE 反映に失敗しました (${
              uerr instanceof Error ? uerr.message : 'unknown'
            })。LINE アカウントの認証情報を確認してください。`,
          );
        }
      }

      await loadData();
      resetEditor();
      setView('list');
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('この LINE 画面下メニューを削除します。よろしいですか?')) return;
    try {
      await richMenusApi.delete(id);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました');
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await richMenusApi.setDefault(id);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'デフォルト設定に失敗しました');
    }
  }

  // ============== RENDER ==============

  if (menus === null) {
    return (
      <div className="flex h-full items-center justify-center text-ink-500">
        読み込み中...
      </div>
    );
  }

  // ============== EDITOR VIEW ==============
  if (view === 'create' || view === 'edit') {
    return (
      <div className="space-y-3 px-[5%] pt-3 pb-12">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              resetEditor();
              setView('list');
            }}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-100"
          >
            <ArrowLeft size={16} className="text-ink-500" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-ink-900">
              {view === 'edit' ? 'LINE 画面下メニューを編集' : 'LINE 画面下メニューを作成'}
            </h1>
            <p className="text-sm text-ink-500">
              レイアウト・ボタン動作・画像を設定して LINE に反映します
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--line-green)' }}
          >
            <Check size={14} />
            {saving ? '保存中...' : '保存して LINE に反映'}
          </button>
        </div>

        {error && <Banner kind="error" text={error} />}
        {info && <Banner kind="info" text={info} />}

        {accounts.length === 0 ? (
          <AccountWarning />
        ) : (
          <div className="grid grid-cols-[1fr_380px] gap-6">
            {/* LEFT: settings */}
            <div className="space-y-4">
              <Card title="基本設定">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="メニュー名">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="例: 通常営業メニュー"
                      className="h-9 w-full rounded-lg border border-ink-100 bg-surface-0 px-3 text-sm outline-none"
                    />
                  </Field>
                  <Field label="メニューバーのテキスト">
                    <input
                      value={chatBarText}
                      onChange={(e) => setChatBarText(e.target.value)}
                      placeholder="メニュー"
                      className="h-9 w-full rounded-lg border border-ink-100 bg-surface-0 px-3 text-sm outline-none"
                    />
                  </Field>
                </div>
                <Field label="サイズ">
                  <div className="flex gap-2">
                    {(
                      [
                        { v: 'full' as const, label: 'フル', hint: '大きい (2500×1686)', barClass: 'h-8' },
                        { v: 'half' as const, label: 'ハーフ', hint: '小さい (2500×843)', barClass: 'h-4' },
                      ]
                    ).map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setMenuSize(opt.v)}
                        className={`flex-1 cursor-pointer rounded-md border-2 p-2 text-center text-xs font-medium transition-all ${
                          menuSize === opt.v
                            ? 'border-[var(--line-green)] bg-[#e8f6ee]'
                            : 'border-ink-100 bg-surface-0 hover:border-ink-300'
                        }`}
                      >
                        <div className={`mb-1 w-full rounded bg-ink-100 ${opt.barClass}`} />
                        {opt.label}
                        <span className="ml-1 text-[10px] text-ink-300">{opt.hint}</span>
                      </button>
                    ))}
                  </div>
                </Field>
              </Card>

              <Card
                title="レイアウト"
                hint="形を選ぶとボタンの数と位置が決まります"
              >
                <div className="flex flex-wrap gap-2">
                  {LAYOUT_TEMPLATES.map((t, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="flex flex-col items-center gap-1.5 rounded-lg border border-ink-100 p-3 transition-colors hover:border-ink-300"
                    >
                      <div
                        className="grid h-9 w-14 gap-px overflow-hidden rounded bg-ink-300"
                        style={{
                          gridTemplateColumns: `repeat(${t.cols}, 1fr)`,
                          gridTemplateRows: `repeat(${t.rows}, 1fr)`,
                        }}
                      >
                        {Array.from({ length: t.cols * t.rows }).map((_, j) => (
                          <div key={j} className="bg-surface-0" />
                        ))}
                      </div>
                      <span className="text-[10px] text-ink-500">{t.name}</span>
                    </button>
                  ))}
                </div>
              </Card>

              <Card
                title="メニュー画像"
                right={
                  <span className="rounded-full border border-ink-100 px-2 py-0.5 text-[10px] text-ink-500">
                    {size.width}×{size.height} / 1MB 以下
                  </span>
                }
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={handleImageSelect}
                  hidden
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-ink-300 px-4 py-3 text-sm text-ink-500 transition-colors hover:border-ink-500"
                >
                  <Upload size={14} />
                  {imageFile ? imageFile.name : '画像をアップロード'}
                </button>
                <p className="mt-1.5 text-[10px] text-ink-300">
                  PNG / JPEG 形式。画像がないと LINE 上ではグレーで表示されます。
                </p>
              </Card>

              <Card title="ボタン (エリア) の動作">
                {areas.length === 0 ? (
                  <p className="py-6 text-center text-xs text-ink-300">
                    上の「レイアウト」から形を選んでください
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {areas.map((a, i) => (
                      <li
                        key={i}
                        className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                          selectedArea === i
                            ? 'border-[var(--line-green)] bg-[#e8f6ee] shadow-sm'
                            : 'border-ink-100 hover:border-ink-300'
                        }`}
                        onClick={() => setSelectedArea(i)}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white ${
                              selectedArea === i ? 'bg-[var(--line-green)]' : 'bg-ink-300'
                            }`}
                          >
                            {areaLetter(i)}
                          </div>
                          <span className="flex-1 text-xs font-medium">
                            {a.label || `エリア ${areaLetter(i)}`}
                          </span>
                          <span className="rounded-full border border-ink-100 px-2 py-0.5 text-[10px] text-ink-500">
                            {actionLabel(a.action.type)}
                          </span>
                        </div>

                        {selectedArea === i && (
                          <div className="space-y-2 border-t border-ink-100 pt-2">
                            <Field label="動作の種類">
                              <div className="flex flex-wrap gap-1">
                                {(
                                  [
                                    { v: 'message', l: 'テキスト送信', icon: MessageCircle },
                                    { v: 'uri', l: 'URL を開く', icon: Link2 },
                                    { v: 'postback', l: '内部データ送信', icon: Layers },
                                  ] as const
                                ).map((opt) => {
                                  const Icon = opt.icon;
                                  const active = a.action.type === opt.v;
                                  return (
                                    <button
                                      key={opt.v}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (opt.v === 'message')
                                          updateAreaAction(i, { type: 'message', text: '' });
                                        else if (opt.v === 'uri')
                                          updateAreaAction(i, {
                                            type: 'uri',
                                            uri: '',
                                            label: a.label,
                                          });
                                        else
                                          updateAreaAction(i, {
                                            type: 'postback',
                                            data: '',
                                            label: a.label,
                                          });
                                      }}
                                      className={`flex items-center gap-1 rounded border px-2 py-1 text-[10px] transition-all ${
                                        active
                                          ? 'border-[var(--line-green)] bg-[#e8f6ee] text-ink-900'
                                          : 'border-ink-100 text-ink-500 hover:border-ink-300'
                                      }`}
                                    >
                                      <Icon className="h-3 w-3" />
                                      {opt.l}
                                    </button>
                                  );
                                })}
                              </div>
                            </Field>

                            {a.action.type === 'message' && (
                              <Field label="送信するテキスト">
                                <input
                                  value={a.action.text}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) =>
                                    updateAreaAction(i, { type: 'message', text: e.target.value })
                                  }
                                  placeholder="例: クーポンを見たい"
                                  className="h-8 w-full rounded-lg border border-ink-100 bg-surface-0 px-2.5 text-xs outline-none"
                                />
                              </Field>
                            )}
                            {a.action.type === 'uri' && (
                              <Field label="URL">
                                <input
                                  value={a.action.uri}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) =>
                                    updateAreaAction(i, {
                                      type: 'uri',
                                      uri: e.target.value,
                                      label: a.label,
                                    })
                                  }
                                  placeholder="https://example.com"
                                  className="h-8 w-full rounded-lg border border-ink-100 bg-surface-0 px-2.5 text-xs outline-none"
                                />
                              </Field>
                            )}
                            {a.action.type === 'postback' && (
                              <Field label="送信データ (内部用、ユーザーには表示されません)">
                                <input
                                  value={a.action.data}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) =>
                                    updateAreaAction(i, {
                                      type: 'postback',
                                      data: e.target.value,
                                      label: a.label,
                                    })
                                  }
                                  placeholder="action=coupon&type=newcomer"
                                  className="h-8 w-full rounded-lg border border-ink-100 bg-surface-0 px-2.5 text-xs outline-none"
                                />
                              </Field>
                            )}

                            <Field label="表示名">
                              <input
                                value={a.label ?? ''}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => updateArea(i, { label: e.target.value })}
                                placeholder="例: 予約する"
                                className="h-8 w-full rounded-lg border border-ink-100 bg-surface-0 px-2.5 text-xs outline-none"
                              />
                            </Field>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            {/* RIGHT: preview (sticky — 編集中も常に見える) */}
            <div className="sticky top-3 h-fit space-y-3">
              <p className="text-center text-xs font-medium text-ink-500">LINE プレビュー</p>
              <Preview
                size={size}
                areas={areas}
                imageUrl={imagePreview}
                selected={selectedArea}
                onSelect={setSelectedArea}
                chatBarText={chatBarText}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============== LIST VIEW ==============
  return (
    <div className="space-y-4 px-[5%] pt-3 pb-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">LINE 画面下メニュー</h1>
          <p className="text-sm text-ink-500">
            LINE トーク画面の下部に固定表示されるメニューを作成・管理
          </p>
        </div>
        <button
          type="button"
          onClick={startCreateBlank}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white"
          style={{ background: 'var(--line-green)' }}
        >
          <Plus size={14} />
          新規作成
        </button>
      </div>

      {error && <Banner kind="error" text={error} />}
      {info && <Banner kind="info" text={info} />}

      {/* Preset section (業界版独自) */}
      <Card
        title="業界向けひな型から作る"
        hint="クリックすると、ボタン構成が入った状態で編集画面が開きます"
        right={
          <span className="flex items-center gap-1 text-[10px] text-ink-500">
            <Sparkles size={11} />
            美容業界向け
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {RICH_MENU_PRESETS.map((p) => (
            <button
              key={p.presetId}
              type="button"
              onClick={() => startCreateFromPreset(p)}
              className="flex items-center gap-3 rounded-xl border border-ink-100 p-3 text-left transition-all hover:border-[var(--line-green)] hover:shadow-sm"
            >
              <PresetThumb preset={p} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink-900">{p.name}</p>
                <p className="mt-0.5 text-[11px] text-ink-500">{p.description}</p>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Existing menus */}
      {menus.length === 0 ? (
        <Card title="登録済みメニュー (0 件)">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ImageIcon size={32} className="mb-2 text-ink-300" />
            <p className="text-sm text-ink-500">まだ登録されたメニューはありません</p>
            <p className="mt-1 text-xs text-ink-300">
              上のひな型または右上の「新規作成」から作ってください
            </p>
          </div>
        </Card>
      ) : (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">
            登録済みメニュー ({menus.length} 件)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {menus.map((m) => (
              <MenuCard
                key={m.id}
                menu={m}
                onEdit={() => startEdit(m)}
                onDuplicate={() => startDuplicate(m)}
                onDelete={() => handleDelete(m.id)}
                onSetDefault={() => handleSetDefault(m.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============ Reusable bits ============

function Card({
  title,
  hint,
  right,
  children,
}: {
  title: string;
  hint?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-surface-0 p-5">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
        {hint && <p className="text-[11px] text-ink-300">— {hint}</p>}
        {right && <div className="ml-auto">{right}</div>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-[11px] font-medium text-ink-500">{label}</span>
      {children}
    </label>
  );
}

function Banner({ kind, text }: { kind: 'error' | 'info'; text: string }) {
  const styles =
    kind === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-amber-200 bg-amber-50 text-amber-800';
  return (
    <div className={`rounded-xl border px-4 py-2 text-xs ${styles}`}>{text}</div>
  );
}

function AccountWarning() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-amber-900">LINE 公式アカウントが未登録</p>
        <p className="mt-0.5 text-xs text-amber-700">
          先に LINE 公式アカウントを登録してください
        </p>
      </div>
    </div>
  );
}

function PresetThumb({ preset }: { preset: RichMenuPreset }) {
  const w = 100;
  const h = (w * preset.size.height) / preset.size.width;
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-md bg-ink-100"
      style={{ width: w, height: h }}
    >
      {preset.areas.map((a, i) => {
        const left = (a.bounds.x / preset.size.width) * 100;
        const top = (a.bounds.y / preset.size.height) * 100;
        const aw = (a.bounds.width / preset.size.width) * 100;
        const ah = (a.bounds.height / preset.size.height) * 100;
        return (
          <div
            key={i}
            className="absolute border border-white/60 bg-surface-0"
            style={{ left: `${left}%`, top: `${top}%`, width: `${aw}%`, height: `${ah}%` }}
          />
        );
      })}
    </div>
  );
}

function MenuCard({
  menu,
  onEdit,
  onDuplicate,
  onDelete,
  onSetDefault,
}: {
  menu: RichMenu;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const sz = menu.size ?? FULL_SIZE;
  const isHalf = sz.height < 1000;
  const thumbHeight = isHalf ? 60 : 100;
  const areaList = menu.areas ?? [];

  return (
    <div className="overflow-hidden rounded-2xl bg-surface-0 ring-1 ring-ink-100">
      <div
        className="border-b border-ink-100 bg-surface-100 p-3"
        style={{ height: thumbHeight }}
      >
        <div className="relative h-full w-full">
          {areaList.map((area, i) => {
            const left = (area.bounds.x / sz.width) * 100;
            const top = (area.bounds.y / sz.height) * 100;
            const w = (area.bounds.width / sz.width) * 100;
            const h = (area.bounds.height / sz.height) * 100;
            return (
              <div
                key={i}
                className="absolute flex items-center justify-center rounded border border-dashed border-ink-300 bg-surface-0/60"
                style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%` }}
              >
                <span className="text-[9px] text-ink-500">{areaLetter(i)}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
              <span className="truncate">{menu.name}</span>
              {menu.isDefault && (
                <span className="flex shrink-0 items-center gap-0.5 rounded-full border border-amber-300 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                  <Star size={8} />
                  既定
                </span>
              )}
            </h3>
            <p className="mt-0.5 text-[11px] text-ink-500">
              {areaList.length} エリア・{isHalf ? 'ハーフ' : 'フル'}サイズ
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              menu.isActive ? 'bg-[#e8f6ee] text-ink-900' : 'bg-surface-100 text-ink-500'
            }`}
          >
            {menu.isActive ? 'LINE 反映済' : 'LINE 未反映'}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-1 rounded-full border border-ink-100 px-3 py-1.5 text-xs text-ink-700 hover:bg-surface-50"
          >
            <Edit2 size={11} />
            編集
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            aria-label="複製して新規作成"
            title="このメニューを土台に新しいメニューを作る"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-100 text-ink-500 hover:bg-surface-50 hover:text-ink-900"
          >
            <Copy size={12} />
          </button>
          {!menu.isDefault && (
            <button
              type="button"
              onClick={onSetDefault}
              aria-label="既定にする"
              title="このメニューを LINE の既定メニューにする"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-100 hover:bg-surface-50"
            >
              <Star size={12} className="text-amber-500" />
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            aria-label="削除"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-100 text-red-500 hover:bg-red-50"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Preview({
  size,
  areas,
  imageUrl,
  selected,
  onSelect,
  chatBarText,
}: {
  size: RichMenuSize;
  areas: EditableArea[];
  imageUrl: string | null;
  selected: number | null;
  onSelect: (i: number) => void;
  chatBarText: string;
}) {
  const previewWidth = 360;
  const scale = previewWidth / size.width;
  const previewHeight = size.height * scale;
  return (
    <div className="mx-auto" style={{ width: previewWidth }}>
      <div className="rounded-t-2xl bg-[#7494C0] px-2.5 pt-7 pb-3">
        <div className="flex h-20 items-end justify-center pb-2">
          <div className="rounded-xl bg-white/80 px-3 py-1.5">
            <p className="text-[10px] text-gray-700">トーク画面イメージ</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-gray-200 bg-[#F7F8FA] px-3 py-2">
        <div className="flex-1 rounded-full border bg-white px-3 py-1.5 text-[10px] text-gray-400">
          メッセージを入力
        </div>
        <div className="text-[10px] font-semibold" style={{ color: 'var(--line-green)' }}>
          {chatBarText || 'メニュー'}
        </div>
      </div>
      <div
        className="relative overflow-hidden border border-t-0 border-gray-200 bg-surface-100"
        style={{ height: previewHeight }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : null}
        {areas.length === 0 && !imageUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-ink-300">
            <ImageIcon size={28} />
            <p className="mt-2 text-[11px]">レイアウトを選んでください</p>
          </div>
        )}
        {areas.map((a, i) => {
          const left = (a.bounds.x / size.width) * 100;
          const top = (a.bounds.y / size.height) * 100;
          const w = (a.bounds.width / size.width) * 100;
          const h = (a.bounds.height / size.height) * 100;
          const active = selected === i;
          return (
            <button
              type="button"
              key={i}
              onClick={() => onSelect(i)}
              className={`absolute flex items-center justify-center border-2 transition-all ${
                active
                  ? 'z-10 border-[var(--line-green)] bg-[var(--line-green)]/20'
                  : imageUrl
                    ? 'border-white/40 hover:border-white/80'
                    : 'border-dashed border-ink-300 bg-surface-0/40 hover:border-ink-500'
              }`}
              style={{ left: `${left}%`, top: `${top}%`, width: `${w}%`, height: `${h}%` }}
            >
              <span
                className={`px-1 text-center text-[10px] font-bold ${
                  imageUrl ? 'text-white drop-shadow-md' : 'text-ink-700'
                }`}
              >
                {a.label || areaLetter(i)}
              </span>
            </button>
          );
        })}
      </div>
      <div className="h-3 rounded-b-2xl border-x border-b border-gray-200 bg-white" />
    </div>
  );
}
