'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Check, Loader2, Upload, X } from 'lucide-react';
import { formsApi, type Form, type FormField } from '../../../lib/api';

export default function PublicFormPage() {
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const lineUserId = search.get('u') ?? undefined;

  const [form, setForm] = useState<Form | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null); // サンクスメッセージ

  useEffect(() => {
    void load();
  }, [params.slug]);

  async function load() {
    try {
      const f = await formsApi.getPublic(params.slug);
      setForm(f);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'フォームが見つかりませんでした');
    }
  }

  function shouldShow(field: FormField): boolean {
    if (!field.showIf) return true;
    const { fieldId, mode = 'equals', equals } = field.showIf;
    const target = answers[fieldId];
    const isEmpty =
      target === undefined || target === '' || (Array.isArray(target) && target.length === 0);

    if (mode === 'answered') return !isEmpty;
    if (mode === 'empty') return isEmpty;

    // mode === 'equals'
    if (isEmpty || equals === undefined) return false;
    if (Array.isArray(equals)) {
      return equals.some((v) =>
        Array.isArray(target) ? target.includes(v) : target === v,
      );
    }
    return Array.isArray(target) ? target.includes(equals) : target === equals;
  }

  async function handleSubmit() {
    if (!form) return;
    setError(null);

    // 必須チェック
    for (const field of form.fields) {
      if (!field.required) continue;
      if (!shouldShow(field)) continue;
      const v = answers[field.id];
      const empty =
        v === undefined ||
        v === '' ||
        (Array.isArray(v) && v.length === 0);
      if (empty) {
        setError(`「${field.label}」は必須です`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await formsApi.submitPublic(form.slug, {
        lineUserId,
        answers,
      });
      setSubmitted(res.thankYouMessage ?? 'ご回答ありがとうございました。');
    } catch (e) {
      setError(e instanceof Error ? e.message : '送信に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !form) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[640px] items-center justify-center p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-500">
        <Loader2 size={20} className="animate-spin" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[640px] items-center justify-center p-6">
        <div className="rounded-2xl bg-surface-0 p-8 text-center shadow-sm ring-1 ring-ink-100">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'var(--line-green)' }}>
            <Check size={24} className="text-white" />
          </div>
          <p className="text-base font-semibold text-ink-900">送信完了</p>
          <p className="mt-2 whitespace-pre-line text-sm text-ink-500">{submitted}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[640px] p-4 sm:p-6">
      <div className="rounded-2xl bg-surface-0 p-6 shadow-sm ring-1 ring-ink-100">
        <h1 className="mb-1 text-xl font-bold text-ink-900">{form.name}</h1>
        {form.description && (
          <p className="mb-4 whitespace-pre-line text-sm text-ink-500">{form.description}</p>
        )}

        <div className="space-y-5">
          {form.fields.filter(shouldShow).map((field) => (
            <FieldInput
              key={field.id}
              field={field}
              value={answers[field.id]}
              onChange={(v) => setAnswers((prev) => ({ ...prev, [field.id]: v }))}
            />
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--line-green)' }}
        >
          {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
          {submitting ? '送信中...' : '回答を送信'}
        </button>
      </div>
    </div>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: string | string[] | undefined;
  onChange: (v: string | string[]) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink-900">
        {field.label}
        {field.required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {field.helperText && (
        <p className="mb-1.5 text-[11px] text-ink-500">{field.helperText}</p>
      )}

      {field.type === 'short_text' && (
        <input
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? ''}
          className="h-10 w-full rounded-lg border border-ink-100 bg-surface-0 px-3 text-sm outline-none focus:border-[var(--line-green)]"
        />
      )}

      {field.type === 'long_text' && (
        <textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={field.placeholder ?? ''}
          className="w-full resize-none rounded-lg border border-ink-100 bg-surface-0 px-3 py-2 text-sm outline-none focus:border-[var(--line-green)]"
        />
      )}

      {field.type === 'date' && (
        <input
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-ink-100 bg-surface-0 px-3 text-sm outline-none focus:border-[var(--line-green)]"
        />
      )}

      {field.type === 'single_choice' && (
        <div className="space-y-1.5">
          {(field.options ?? []).map((opt) => (
            <label
              key={opt}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                value === opt
                  ? 'border-[var(--line-green)] bg-[#e8f6ee]'
                  : 'border-ink-100 hover:border-ink-300'
              }`}
            >
              <input
                type="radio"
                name={field.id}
                checked={value === opt}
                onChange={() => onChange(opt)}
                className="sr-only"
              />
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full border-2 ${
                  value === opt ? 'border-[var(--line-green)]' : 'border-ink-300'
                }`}
              >
                {value === opt && (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: 'var(--line-green)' }}
                  />
                )}
              </span>
              {opt}
            </label>
          ))}
        </div>
      )}

      {field.type === 'multi_choice' && (
        <div className="space-y-1.5">
          {(field.options ?? []).map((opt) => {
            const arr = (value as string[]) ?? [];
            const checked = arr.includes(opt);
            return (
              <label
                key={opt}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  checked
                    ? 'border-[var(--line-green)] bg-[#e8f6ee]'
                    : 'border-ink-100 hover:border-ink-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    if (e.target.checked) onChange([...arr, opt]);
                    else onChange(arr.filter((v) => v !== opt));
                  }}
                  className="sr-only"
                />
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded border-2 ${
                    checked ? 'border-[var(--line-green)]' : 'border-ink-300'
                  }`}
                >
                  {checked && <Check size={10} style={{ color: 'var(--line-green)' }} strokeWidth={3} />}
                </span>
                {opt}
              </label>
            );
          })}
        </div>
      )}

      {field.type === 'image' && (
        <ImageFieldInput value={value as string | undefined} onChange={onChange} />
      )}
    </div>
  );
}

function ImageFieldInput({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setUploading(true);
    try {
      const url = await formsApi.uploadImage(file);
      onChange(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'アップロード失敗');
    } finally {
      setUploading(false);
      // 同じ画像を再選択できるように reset
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFile}
        disabled={uploading}
        hidden
      />
      {value ? (
        <div className="space-y-2">
          <img
            src={value}
            alt="アップロード済み画像"
            className="max-h-60 w-full rounded-lg border border-ink-100 object-contain"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-ink-100 px-3 py-2 text-xs text-ink-700 hover:bg-surface-50 disabled:opacity-50"
            >
              <Upload size={11} />
              画像を差し替える
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-ink-100 px-3 py-2 text-xs text-red-500 hover:bg-red-50"
            >
              <X size={11} />
              削除
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-ink-300 px-4 py-6 text-sm text-ink-500 transition-colors hover:border-[var(--line-green)] hover:bg-[#f0faf3] disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <Upload size={20} className="text-ink-500" />
          )}
          <span className="font-medium text-ink-700">
            {uploading ? 'アップロード中...' : '画像を選んでアップロード'}
          </span>
          <span className="text-[10px] text-ink-300">
            JPEG / PNG / 5MB 以下 (スマホで撮影した写真もそのまま OK)
          </span>
        </button>
      )}
      {err && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
          {err}
        </p>
      )}
    </div>
  );
}
