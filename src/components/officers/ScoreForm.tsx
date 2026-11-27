"use client";

import { useActionState, useState } from "react";
import { saveScoreAction, type ActionState } from "@/app/officers/actions";
import { rubric, rubricTotal, type RubricKey } from "@/content/competition";
import type { RubricScores } from "@/lib/domain/types";
import { inputBase, Spinner } from "@/components/submit/fields";

export function ScoreForm({
  submissionId,
  initial,
  comments,
  status,
  locked,
}: {
  submissionId: string;
  initial: RubricScores | null;
  comments: string | null;
  status: "draft" | "submitted" | null;
  locked: string | null;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveScoreAction, null);
  const [values, setValues] = useState<Record<RubricKey, string>>(
    () => Object.fromEntries(rubric.map((r) => [r.key, initial?.[r.key] != null ? String(initial[r.key]) : ""])) as Record<RubricKey, string>,
  );
  const total = rubric.reduce((s, r) => s + (Number(values[r.key]) || 0), 0);
  const errors = state?.errors ?? {};

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="submissionId" value={submissionId} />
      <fieldset disabled={!!locked} className="space-y-5">
        <legend className="sr-only">Your scores</legend>
        {rubric.map((r) => {
          const v = values[r.key];
          const n = Number(v);
          const over = v !== "" && (!Number.isInteger(n) || n < 0 || n > r.points);
          const err = errors[r.key] ?? (over ? `Must be 0–${r.points}` : undefined);
          return (
            <div key={r.key} className="grid grid-cols-[1fr_6.5rem] items-start gap-4">
              <label htmlFor={`score-${r.key}`}>
                <span className="block font-semibold">{r.title}</span>
                <span className="block t-small text-stone">{r.looksFor}</span>
              </label>
              <div>
                <div className="flex items-center gap-2">
                  <input
                    id={`score-${r.key}`}
                    name={r.key}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={r.points}
                    step={1}
                    value={v}
                    onChange={(e) => setValues((p) => ({ ...p, [r.key]: e.target.value }))}
                    aria-invalid={!!err || undefined}
                    aria-describedby={err ? `score-${r.key}-err` : undefined}
                    className={`${inputBase} w-20 px-3 py-2 text-right tabular-nums`}
                  />
                  <span className="t-small text-stone">/{r.points}</span>
                </div>
                {err && (
                  <p id={`score-${r.key}-err`} className="mt-1 t-small font-medium text-danger">
                    {err}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div className="flex items-baseline justify-between border-t-2 border-ink pt-4">
          <span className="font-semibold">Your total</span>
          <span className="t-num text-[2.5rem] leading-none">
            {total}
            <span className="text-[1.1rem] text-stone">/{rubricTotal}</span>
          </span>
        </div>
        <div>
          <label htmlFor="comments" className="font-semibold">
            Comments <span className="font-normal text-stone">Visible to administrators only</span>
          </label>
          <textarea id="comments" name="comments" rows={4} maxLength={3000} defaultValue={comments ?? ""} className={`${inputBase} mt-2`} />
        </div>
      </fieldset>
      {locked ? (
        <p className="t-small text-stone">Results were finalized, so scores are locked.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" name="intent" value="submit" disabled={pending} className="inline-flex h-11 items-center gap-2 bg-ink px-5 font-semibold text-paper hover:bg-forest disabled:opacity-60">
            {pending && <Spinner />}
            {status === "submitted" ? "Update submitted sheet" : "Submit score sheet"}
          </button>
          <button type="submit" name="intent" value="draft" disabled={pending} className="inline-flex h-11 items-center border border-ink px-5 font-semibold hover:bg-ink hover:text-paper disabled:opacity-60">
            Save as draft
          </button>
          {state && (
            <p role="status" className={`t-small font-medium ${state.ok ? "text-forest" : "text-danger"}`}>
              {state.message}
            </p>
          )}
        </div>
      )}
      <p className="t-small text-stone">
        Score independently. Other judges’ sheets aren’t shown to judges; entries only count as finalized once enough
        judges have submitted complete sheets.
      </p>
    </form>
  );
}
