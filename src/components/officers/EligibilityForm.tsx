"use client";

import { useActionState, useState } from "react";
import { setEligibilityAction, type ActionState } from "@/app/officers/actions";
import type { EligibilityStatus } from "@/lib/domain/types";
import { inputBase, Spinner } from "@/components/submit/fields";

export function EligibilityForm({ id, status, note }: { id: string; status: EligibilityStatus; note: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(setEligibilityAction, null);
  const [choice, setChoice] = useState<EligibilityStatus>(status);
  const options: { v: EligibilityStatus; label: string }[] = [
    { v: "eligible", label: "Eligible" },
    { v: "ineligible", label: "Ineligible" },
    { v: "pending", label: "Needs review" },
  ];
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <fieldset>
        <legend className="font-semibold">Eligibility decision</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {options.map((o) => (
            <label key={o.v} className={`cursor-pointer border px-4 py-2 t-small font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-forest ${choice === o.v ? "border-ink bg-ink text-paper" : "border-rule hover:border-ink"}`}>
              <input type="radio" name="status" value={o.v} checked={choice === o.v} onChange={() => setChoice(o.v)} className="sr-only" />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div>
        <label htmlFor="elig-note" className="t-small font-semibold">
          Note {choice === "ineligible" ? "(required)" : "(optional)"}
        </label>
        <textarea id="elig-note" name="note" rows={2} defaultValue={note ?? ""} maxLength={1000} className={`${inputBase} mt-1`} aria-invalid={!!state?.errors?.note || undefined} />
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="inline-flex h-11 items-center gap-2 bg-ink px-5 font-semibold text-paper hover:bg-forest disabled:opacity-60">
          {pending && <Spinner />}
          Save decision
        </button>
        {state && (
          <p role="status" className={`t-small font-medium ${state.ok ? "text-forest" : "text-danger"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
