"use client";

import { useState } from "react";

export type FaqEntry = {
  q: string;
  a: string;
};

export function FaqList({ items }: { items: FaqEntry[] }) {
  return (
    <div className="divide-y divide-ink-100 overflow-hidden rounded-3xl border border-ink-100 bg-white">
      {items.map((entry) => (
        <FaqItem key={entry.q} entry={entry} />
      ))}
    </div>
  );
}

function FaqItem({ entry }: { entry: FaqEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left transition hover:bg-surface-50 md:px-8 md:py-6"
      >
        <span className="text-base font-semibold text-ink-900 md:text-lg">
          {entry.q}
        </span>
        <span
          aria-hidden
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink-100 text-xl text-ink-500 transition ${
            open ? "rotate-45 border-brand-purple text-brand-purple" : ""
          }`}
        >
          +
        </span>
      </button>
      {open && (
        <div className="px-6 pb-6 text-sm leading-relaxed text-ink-500 md:px-8 md:pb-8 md:text-base">
          {entry.a}
        </div>
      )}
    </div>
  );
}
