"use client";

import { type ReactNode } from "react";

export const inputBase =
  "block w-full border border-rule bg-white/70 px-4 py-3 text-[1.02rem] text-ink placeholder:text-stone/60 transition-colors hover:border-stone focus:border-forest focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-forest aria-[invalid=true]:border-danger";

export function fieldId(path: string) {
  return `f-${path.replace(/\./g, "-")}`;
}

export function Field({
  path,
  label,
  hint,
  error,
  optional,
  children,
  count,
}: {
  path: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  children: ReactNode;
  count?: { value: number; max: number };
}) {
  const id = fieldId(path);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="font-semibold">
          {label}
          {optional && <span className="ml-2 font-normal text-stone">Optional</span>}
        </label>
        {count && (
          <span className={`t-small tabular-nums ${count.value > count.max ? "text-danger" : "text-stone"}`} aria-hidden>
            {count.value}/{count.max}
          </span>
        )}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 t-small text-stone">
          {hint}
        </p>
      )}
      <div className="mt-2">{children}</div>
      {error && (
        <p id={`${id}-error`} className="mt-2 flex gap-2 t-small font-medium text-danger">
          <svg aria-hidden viewBox="0 0 16 16" className="mt-[0.2em] size-3.5 shrink-0">
            <circle cx="8" cy="8" r="7" fill="currentColor" />
            <path d="M8 4.5v4.5M8 11v.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

export function describedBy(path: string, error?: string, hint?: boolean) {
  const id = fieldId(path);
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

export function ChoiceCard({
  name,
  value,
  checked,
  onChange,
  title,
  body,
  invalid,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  body?: string;
  invalid?: boolean;
}) {
  return (
    <label
      className={`relative flex cursor-pointer gap-4 border p-5 transition-colors ${checked ? "border-forest bg-forest/[0.06]" : invalid ? "border-danger" : "border-rule hover:border-stone"}`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="mt-1 size-4 shrink-0 accent-[var(--color-forest)]"
      />
      <span>
        <span className="block font-semibold">{title}</span>
        {body && <span className="mt-1 block t-small text-stone">{body}</span>}
      </span>
    </label>
  );
}

export function Checkbox({
  id,
  checked,
  onChange,
  children,
  invalid,
  describedById,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
  invalid?: boolean;
  describedById?: string;
}) {
  return (
    <label htmlFor={id} className={`flex cursor-pointer gap-4 border p-5 ${checked ? "border-forest bg-forest/[0.06]" : invalid ? "border-danger" : "border-rule hover:border-stone"}`}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={invalid || undefined}
        aria-describedby={describedById}
        className="mt-1 size-4 shrink-0 accent-[var(--color-forest)]"
      />
      <span>{children}</span>
    </label>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-4 animate-spin ${className}`} aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
