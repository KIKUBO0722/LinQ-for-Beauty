'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft,
  Calendar,
  CheckSquare,
  Circle,
  Copy,
  Edit2,
  Eye,
  FileText,
  Grip,
  Image as ImageIcon,
  Layers,
  Plus,
  Sparkles,
  Trash2,
  Type,
} from 'lucide-react';
import {
  FORM_PRESETS,
  formsApi,
  type Form,
  type FormField,
  type FormFieldType,
  type FormPreset,
} from '../../../lib/api';

const FIELD_TYPES: { type: FormFieldType; label: string; icon: typeof Type }[] = [
  { type: 'short_text', label: '短文', icon: Type },
  { type: 'long_text', label: '長文', icon: FileText },
  { type: 'single_choice', label: '単一選択', icon: Circle },
  { type: 'multi_choice', label: '複数選択', icon: CheckSquare },
  { type: 'date', label: '日付', icon: Calendar },
  { type: 'image', label: '画像', icon: ImageIcon },
];

type View = 'list' | 'edit';

function newFieldId(): string {
  return `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function makeEmptyField(type: FormFieldType): FormField {
  const base: FormField = { id: newFieldId(), type, label: '', required: false };
  if (type === 'single_choice' || type === 'multi_choice') {
    base.options = ['選択肢 1', '選択肢 2'];
  }
  return base;
}

export default function FormsPage() {
  const [forms, setForms] = useState<Form[] | null>(null);
  const [view, setView] = useState<View>('list');
  const [editing, setEditing] = useState<Form | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    void loadForms();
  }, []);

  async function loadForms() {
    try {
      setForms(await formsApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : '読み込みに失敗しました');
      setForms([]);
    }
  }

  async function startCreateFromPreset(preset: FormPreset) {
    setError(null);
    try {
      const slug = `${preset.presetId}-${Date.now().toString(36)}`;
      const created = await formsApi.create({
        name: preset.name,
        slug,
        category: preset.category,
        description: preset.description,
        fields: preset.fields.map((f) => ({ ...f, id: newFieldId() })),
        thankYouMessage: 'ご回答ありがとうございました。',
        isPublished: false,
      });
      await loadForms();
      setEditing(created);
      setView('edit');
    } catch (e) {
      setError(e instanceof Error ? e.message : '作成に失敗しました');
    }
  }

  async function startCreateBlank() {
    setError(null);
    try {
      const slug = `form-${Date.now().toString(36)}`;
      const created = await formsApi.create({
        name: '新しいフォーム',
        slug,
        category: 'custom',
        fields: [],
        thankYouMessage: 'ご回答ありがとうございました。',
        isPublished: false,
      });
      await loadForms();
      setEditing(created);
      setView('edit');
    } catch (e) {
      setError(e instanceof Error ? e.message : '作成に失敗しました');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('このフォームを削除します。よろしいですか?')) return;
    try {
      await formsApi.delete(id);
      await loadForms();
    } catch (e) {
      setError(e instanceof Error ? e.message : '削除に失敗しました');
    }
  }

  if (forms === null) {
    return <div className="flex h-full items-center justify-center text-ink-500">読み込み中...</div>;
  }

  if (view === 'edit' && editing) {
    return (
      <FormEditor
        form={editing}
        onBack={() => {
          void loadForms();
          setEditing(null);
          setView('list');
        }}
        onSavedRemote={(updated) => setEditing(updated)}
      />
    );
  }

  return (
    <div className="space-y-4 px-[5%] pt-3 pb-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">カウンセリングシート</h1>
          <p className="text-sm text-ink-500">
            お客様に LINE で送って、肌質・希望・既往歴などを事前に集める用紙
          </p>
        </div>
        <button
          type="button"
          onClick={startCreateBlank}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white"
          style={{ background: 'var(--line-green)' }}
        >
          <Plus size={14} />
          空から作る
        </button>
      </div>

      {error && <Banner kind="error" text={error} />}
      {info && <Banner kind="info" text={info} />}

      <Card
        title="業種向けひな型から作る"
        hint="クリックすると、項目が入った状態で編集画面が開きます。並べ替え・追加・削除自由"
        right={
          <span className="flex items-center gap-1 text-[10px] text-ink-500">
            <Sparkles size={11} />
            美容業界 6 業種対応
          </span>
        }
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {FORM_PRESETS.map((p) => (
            <button
              key={p.presetId}
              type="button"
              onClick={() => startCreateFromPreset(p)}
              className="flex flex-col gap-2 rounded-xl border border-ink-100 p-4 text-left transition-all hover:border-[var(--line-green)] hover:shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-ink-500" />
                <span className="font-semibold text-ink-900">{p.name}</span>
              </div>
              <p className="text-[11px] text-ink-500">{p.description}</p>
              <p className="text-[10px] text-ink-300">
                項目 {p.fields.length} 個 — {p.fields.slice(0, 3).map((f) => f.label).join(' / ')}
                {p.fields.length > 3 ? ' ...' : ''}
              </p>
            </button>
          ))}
        </div>
      </Card>

      {forms.length === 0 ? (
        <Card title="登録済みフォーム (0 件)">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText size={32} className="mb-2 text-ink-300" />
            <p className="text-sm text-ink-500">まだ登録されたフォームはありません</p>
            <p className="mt-1 text-xs text-ink-300">
              上のひな型または右上の「空から作る」から始めてください
            </p>
          </div>
        </Card>
      ) : (
        <div>
          <h2 className="mb-3 text-sm font-semibold text-ink-900">
            登録済みフォーム ({forms.length} 件)
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {forms.map((f) => (
              <FormCard
                key={f.id}
                form={f}
                onEdit={() => {
                  setEditing(f);
                  setView('edit');
                }}
                onDelete={() => handleDelete(f.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============== Editor ==============

function FormEditor({
  form: initial,
  onBack,
  onSavedRemote,
}: {
  form: Form;
  onBack: () => void;
  onSavedRemote: (f: Form) => void;
}) {
  const [form, setForm] = useState<Form>(initial);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // 自動保存 (debounce 500ms)
  const scheduleSave = useCallback((next: Form) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus('saving');
    saveTimer.current = setTimeout(async () => {
      try {
        const updated = await formsApi.update(next.id, {
          name: next.name,
          slug: next.slug,
          category: next.category ?? undefined,
          description: next.description ?? undefined,
          fields: next.fields,
          autoTagIds: next.autoTagIds,
          thankYouMessage: next.thankYouMessage ?? undefined,
          isPublished: next.isPublished,
        });
        setSaveStatus('saved');
        onSavedRemote(updated);
      } catch {
        setSaveStatus('error');
      }
    }, 500);
  }, [onSavedRemote]);

  function updateForm(patch: Partial<Form>) {
    setForm((prev) => {
      const next = { ...prev, ...patch };
      scheduleSave(next);
      return next;
    });
  }

  function updateField(fieldId: string, patch: Partial<FormField>) {
    setForm((prev) => {
      const next = {
        ...prev,
        fields: prev.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
      };
      scheduleSave(next);
      return next;
    });
  }

  function addField(type: FormFieldType) {
    const newField = makeEmptyField(type);
    setForm((prev) => {
      const next = { ...prev, fields: [...prev.fields, newField] };
      scheduleSave(next);
      return next;
    });
    setSelectedFieldId(newField.id);
  }

  function duplicateField(fieldId: string) {
    setForm((prev) => {
      const idx = prev.fields.findIndex((f) => f.id === fieldId);
      if (idx === -1) return prev;
      const dup: FormField = { ...prev.fields[idx], id: newFieldId() };
      const next = {
        ...prev,
        fields: [...prev.fields.slice(0, idx + 1), dup, ...prev.fields.slice(idx + 1)],
      };
      scheduleSave(next);
      return next;
    });
  }

  function deleteField(fieldId: string) {
    setForm((prev) => {
      const next = { ...prev, fields: prev.fields.filter((f) => f.id !== fieldId) };
      scheduleSave(next);
      return next;
    });
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  }

  function moveField(activeId: string, overId: string) {
    setForm((prev) => {
      const oldIdx = prev.fields.findIndex((f) => f.id === activeId);
      const newIdx = prev.fields.findIndex((f) => f.id === overId);
      if (oldIdx === -1 || newIdx === -1) return prev;
      const next = { ...prev, fields: arrayMove(prev.fields, oldIdx, newIdx) };
      scheduleSave(next);
      return next;
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const previewUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/forms/${form.slug}` : '';

  return (
    <div className="space-y-3 px-[5%] pt-3 pb-12">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-surface-100"
        >
          <ArrowLeft size={16} className="text-ink-500" />
        </button>
        <div className="flex-1">
          <input
            value={form.name}
            onChange={(e) => updateForm({ name: e.target.value })}
            className="w-full bg-transparent text-2xl font-bold text-ink-900 outline-none"
          />
          <p className="text-xs text-ink-500">
            {saveStatus === 'saving' && '保存中...'}
            {saveStatus === 'saved' && '自動保存済'}
            {saveStatus === 'error' && (
              <span className="text-red-500">保存に失敗</span>
            )}
            {saveStatus === 'idle' && ' '}
          </p>
        </div>
        <a
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-full border border-ink-100 px-3 py-1.5 text-xs text-ink-700 hover:bg-surface-50"
        >
          <Eye size={12} />
          プレビュー
        </a>
        <PublishToggle
          isPublished={form.isPublished}
          onChange={(v) => updateForm({ isPublished: v })}
        />
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-4">
        <div className="space-y-3">
          <Card title="基本情報">
            <div className="grid grid-cols-2 gap-3">
              <Field label="公開 URL の英数字 (slug)">
                <input
                  value={form.slug}
                  onChange={(e) => updateForm({ slug: e.target.value })}
                  placeholder="例: counseling / first-visit / hair-2026spring"
                  className="h-9 w-full rounded-lg border border-ink-100 bg-surface-0 px-3 text-sm outline-none"
                />
              </Field>
              <Field label="業種">
                <select
                  value={form.category ?? 'custom'}
                  onChange={(e) => updateForm({ category: e.target.value })}
                  className="h-9 w-full rounded-lg border border-ink-100 bg-surface-0 px-3 text-sm outline-none"
                >
                  <option value="custom">カスタム</option>
                  <option value="hair_salon">美容室</option>
                  <option value="nail">ネイル</option>
                  <option value="esthetic">エステ</option>
                  <option value="eyelash">マツエク</option>
                  <option value="hair_removal">脱毛</option>
                  <option value="chiro">整体</option>
                </select>
              </Field>
            </div>
            <Field label="説明文 (任意、回答ページの上部に表示)">
              <textarea
                value={form.description ?? ''}
                onChange={(e) => updateForm({ description: e.target.value })}
                rows={2}
                className="w-full resize-none rounded-lg border border-ink-100 bg-surface-0 px-3 py-2 text-sm outline-none"
              />
            </Field>
            <Field label="回答後のサンクスメッセージ (お客様に表示)">
              <textarea
                value={form.thankYouMessage ?? ''}
                onChange={(e) => updateForm({ thankYouMessage: e.target.value })}
                rows={2}
                placeholder="例: この度はご予約いただき誠にありがとうございます。当日お会いできるのを心より楽しみにしております。"
                className="w-full resize-none rounded-lg border border-ink-100 bg-surface-0 px-3 py-2 text-sm outline-none"
              />
            </Field>
          </Card>

          <Card title={`項目一覧 (${form.fields.length} 個)`} hint="ドラッグで並べ替え、クリックで編集">
            {form.fields.length === 0 ? (
              <p className="py-8 text-center text-xs text-ink-300">
                右の「+項目を追加」から始めてください
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={({ active, over }) => {
                  if (over && active.id !== over.id) {
                    moveField(String(active.id), String(over.id));
                  }
                }}
              >
                <SortableContext items={form.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                  <ul className="space-y-2">
                    {form.fields.map((field) => (
                      <SortableField
                        key={field.id}
                        field={field}
                        allFields={form.fields}
                        selected={selectedFieldId === field.id}
                        onSelect={() => setSelectedFieldId(field.id)}
                        onChange={(patch) => updateField(field.id, patch)}
                        onDuplicate={() => duplicateField(field.id)}
                        onDelete={() => deleteField(field.id)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
            )}
          </Card>
        </div>

        {/* 浮動ツールバー (sticky) */}
        <div className="sticky top-3 h-fit space-y-3">
          <Card title="+ 項目を追加">
            <div className="grid grid-cols-2 gap-2">
              {FIELD_TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => addField(t.type)}
                    className="flex items-center gap-2 rounded-lg border border-ink-100 px-3 py-2 text-xs text-ink-700 transition-colors hover:border-[var(--line-green)] hover:bg-surface-50"
                  >
                    <Icon size={13} className="text-ink-500" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card title="公開 URL">
            <div className="space-y-2">
              <input
                readOnly
                value={previewUrl}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="w-full rounded-lg border border-ink-100 bg-surface-100 px-2.5 py-1.5 text-[11px] text-ink-700 outline-none"
              />
              <p className="text-[10px] text-ink-500">
                {form.isPublished
                  ? '✓ 公開中。お客様に LINE で送れます'
                  : '公開オフ。上部のスイッチで公開してください'}
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SortableField({
  field,
  allFields,
  selected,
  onSelect,
  onChange,
  onDuplicate,
  onDelete,
}: {
  field: FormField;
  allFields: FormField[];
  selected: boolean;
  onSelect: () => void;
  onChange: (patch: Partial<FormField>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const typeInfo = FIELD_TYPES.find((t) => t.type === field.type);
  const TypeIcon = typeInfo?.icon ?? Type;

  return (
    <li ref={setNodeRef} style={style}>
      <div
        className={`rounded-xl border bg-surface-0 transition-colors ${
          selected ? 'border-[var(--line-green)] shadow-sm' : 'border-ink-100'
        }`}
      >
        <div className="flex items-center gap-2 p-3" onClick={onSelect}>
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="flex h-6 w-6 cursor-grab items-center justify-center text-ink-300 hover:text-ink-500"
            aria-label="並べ替え"
          >
            <Grip size={12} />
          </button>
          <TypeIcon size={13} className="text-ink-500" />
          <span className="flex-1 truncate text-sm text-ink-900">
            {field.label || <span className="text-ink-300">(項目名未入力)</span>}
          </span>
          {field.required && (
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[9px] font-semibold text-red-700">
              必須
            </span>
          )}
          <span className="text-[10px] text-ink-300">{typeInfo?.label}</span>
        </div>

        {selected && (
          <div className="space-y-2 border-t border-ink-100 p-3">
            <Field label="項目名 (お客様に表示される)">
              <input
                value={field.label}
                onChange={(e) => onChange({ label: e.target.value })}
                placeholder="例: お名前 / ご来店動機 / ご希望メニュー"
                className="h-9 w-full rounded-lg border border-ink-100 bg-surface-0 px-3 text-sm outline-none"
              />
            </Field>
            <Field label="補足説明 (任意、項目の下に小さく表示)">
              <input
                value={field.helperText ?? ''}
                onChange={(e) => onChange({ helperText: e.target.value })}
                placeholder="例: 全角でご記入ください / 旧姓ではなく現在のお名前"
                className="h-9 w-full rounded-lg border border-ink-100 bg-surface-0 px-3 text-sm outline-none"
              />
            </Field>

            {(field.type === 'short_text' || field.type === 'long_text') && (
              <Field label="入力例 (任意、入力欄の中にうすく表示)">
                <input
                  value={field.placeholder ?? ''}
                  onChange={(e) => onChange({ placeholder: e.target.value })}
                  placeholder={
                    field.type === 'short_text'
                      ? '例: 山田 花子 / 090-1234-5678'
                      : '例: 毛先のパサつきが気になります / ボリュームを出したい 等'
                  }
                  className="h-9 w-full rounded-lg border border-ink-100 bg-surface-0 px-3 text-sm outline-none"
                />
              </Field>
            )}

            {(field.type === 'single_choice' || field.type === 'multi_choice') && (
              <Field label="選択肢 (1 行に 1 つ)">
                <textarea
                  value={(field.options ?? []).join('\n')}
                  onChange={(e) =>
                    onChange({ options: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })
                  }
                  rows={4}
                  placeholder={'例:\nカット\nカラー\nパーマ\nトリートメント\nヘッドスパ'}
                  className="w-full resize-none rounded-lg border border-ink-100 bg-surface-0 px-3 py-2 text-sm outline-none"
                />
              </Field>
            )}

            {/* 条件分岐 */}
            <Field label="表示条件 (任意): 他の項目の回答に応じて表示する">
              <BranchEditor
                field={field}
                allFields={allFields}
                onChange={(showIf) => onChange({ showIf })}
              />
            </Field>

            <div className="flex items-center gap-2 pt-1">
              <label className="flex items-center gap-1.5 text-xs text-ink-700">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => onChange({ required: e.target.checked })}
                />
                必須回答
              </label>
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={onDuplicate}
                  className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-surface-100"
                  aria-label="複製"
                  title="この項目を複製"
                >
                  <Copy size={12} className="text-ink-500" />
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-red-500 hover:bg-red-50"
                  aria-label="削除"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

function BranchEditor({
  field,
  allFields,
  onChange,
}: {
  field: FormField;
  allFields: FormField[];
  onChange: (showIf: FormField['showIf']) => void;
}) {
  // 全項目を候補に (= 自分自身を除く、上の方の項目を優先)
  const candidates = allFields.filter((f) => f.id !== field.id);
  const cur = field.showIf;

  if (candidates.length === 0) {
    return (
      <p className="text-[10px] text-ink-300">
        条件分岐するには、他に項目を 1 つ以上追加してください
      </p>
    );
  }

  const targetField = cur ? allFields.find((f) => f.id === cur.fieldId) : null;
  const targetIsChoice =
    targetField?.type === 'single_choice' || targetField?.type === 'multi_choice';
  const mode = cur?.mode ?? (targetIsChoice ? 'equals' : 'answered');

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      <select
        value={cur?.fieldId ?? ''}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) onChange(undefined);
          else {
            const target = allFields.find((f) => f.id === v);
            const isChoice = target?.type === 'single_choice' || target?.type === 'multi_choice';
            onChange({
              fieldId: v,
              mode: isChoice ? 'equals' : 'answered',
              equals: isChoice ? '' : undefined,
            });
          }
        }}
        className="h-7 rounded-md border border-ink-100 bg-surface-0 px-2"
      >
        <option value="">(条件なし、常に表示)</option>
        {candidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label || '(無題)'}
          </option>
        ))}
      </select>

      {cur && (
        <>
          <span className="text-ink-500">の</span>
          <select
            value={mode}
            onChange={(e) => {
              const newMode = e.target.value as 'equals' | 'answered' | 'empty';
              onChange({
                fieldId: cur.fieldId,
                mode: newMode,
                equals: newMode === 'equals' ? '' : undefined,
              });
            }}
            className="h-7 rounded-md border border-ink-100 bg-surface-0 px-2"
          >
            {targetIsChoice && <option value="equals">回答が特定の値の時</option>}
            <option value="answered">回答があれば</option>
            <option value="empty">回答がなければ</option>
          </select>

          {mode === 'equals' && targetIsChoice && (
            <>
              <select
                value={typeof cur.equals === 'string' ? cur.equals : ''}
                onChange={(e) => onChange({ ...cur, mode: 'equals', equals: e.target.value })}
                className="h-7 rounded-md border border-ink-100 bg-surface-0 px-2"
              >
                <option value="">選んでください</option>
                {(targetField?.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <span className="text-ink-500">の時に表示</span>
            </>
          )}
          {mode !== 'equals' && <span className="text-ink-500">表示</span>}
        </>
      )}
    </div>
  );
}

function PublishToggle({
  isPublished,
  onChange,
}: {
  isPublished: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!isPublished)}
      className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
        isPublished
          ? 'text-white'
          : 'border border-ink-100 text-ink-700 hover:bg-surface-50'
      }`}
      style={isPublished ? { background: 'var(--line-green)' } : undefined}
    >
      {isPublished ? '✓ 公開中' : '公開オフ'}
    </button>
  );
}

function FormCard({
  form,
  onEdit,
  onDelete,
}: {
  form: Form;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const categoryLabel: Record<string, string> = {
    hair_salon: '美容室',
    nail: 'ネイル',
    esthetic: 'エステ',
    eyelash: 'マツエク',
    hair_removal: '脱毛',
    chiro: '整体',
    custom: 'カスタム',
  };
  return (
    <div className="overflow-hidden rounded-2xl bg-surface-0 ring-1 ring-ink-100">
      <div className="p-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-ink-900">{form.name}</h3>
            <p className="mt-0.5 text-[11px] text-ink-500">
              {categoryLabel[form.category ?? 'custom'] ?? form.category} ・ {form.fields.length} 項目
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              form.isPublished ? 'bg-[#e8f6ee] text-ink-900' : 'bg-surface-100 text-ink-500'
            }`}
          >
            {form.isPublished ? '公開中' : '非公開'}
          </span>
        </div>
        <p className="mb-3 truncate text-[10px] text-ink-300">
          公開 URL: /forms/{form.slug}
        </p>
        <div className="flex items-center gap-1.5">
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
    <div className="rounded-2xl bg-surface-0 p-5 ring-1 ring-ink-100">
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
  return <div className={`rounded-xl border px-4 py-2 text-xs ${styles}`}>{text}</div>;
}
