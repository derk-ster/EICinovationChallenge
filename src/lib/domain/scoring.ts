import { rubric, rubricTotal, type RubricKey } from "@/content/competition";
import type { EligibilityStatus, RubricScores, ScoreRecord } from "./types";

export const rubricMax: Record<RubricKey, number> = Object.fromEntries(
  rubric.map((r) => [r.key, r.points]),
) as Record<RubricKey, number>;

export const rubricKeys = rubric.map((r) => r.key);

export function emptyScores(): RubricScores {
  return Object.fromEntries(rubricKeys.map((k) => [k, null])) as RubricScores;
}

export type ScoreValidation = { ok: true; scores: RubricScores } | { ok: false; errors: Partial<Record<RubricKey, string>> };

/**
 * Validates a judge's score sheet. Each category must be a whole number between
 * 0 and its official maximum. Drafts may leave categories empty; submitted
 * sheets must be complete.
 */
export function validateScores(input: Partial<Record<RubricKey, unknown>>, requireComplete: boolean): ScoreValidation {
  const errors: Partial<Record<RubricKey, string>> = {};
  const scores = emptyScores();
  for (const key of rubricKeys) {
    const raw = input[key];
    const max = rubricMax[key];
    if (raw === null || raw === undefined || raw === "") {
      if (requireComplete) errors[key] = "Required";
      continue;
    }
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isInteger(n)) errors[key] = "Use a whole number";
    else if (n < 0 || n > max) errors[key] = `Must be 0–${max}`;
    else scores[key] = n;
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, scores };
}

export function isComplete(scores: RubricScores): boolean {
  return rubricKeys.every((k) => typeof scores[k] === "number");
}

export function totalOf(scores: RubricScores): number {
  return rubricKeys.reduce((sum, k) => sum + (scores[k] ?? 0), 0);
}

export interface EntryResult {
  submissionId: string;
  submittedCount: number;
  draftCount: number;
  average: number | null;
  /** Category averages across submitted sheets (null if none). */
  categoryAverages: Record<RubricKey, number | null>;
  finalized: boolean;
  reason: string | null;
}

/**
 * An entry's result is "finalized" only when it is marked eligible, at least
 * `minJudges` judges have submitted complete sheets, and no judge still has an
 * unfinished draft for it. Anything else is shown as in progress and is never
 * ranked as a final result.
 */
export function computeEntryResult(
  submissionId: string,
  eligibility: EligibilityStatus,
  records: ScoreRecord[],
  minJudges: number,
): EntryResult {
  const mine = records.filter((r) => r.submissionId === submissionId);
  const submitted = mine.filter((r) => r.status === "submitted" && isComplete(r.scores));
  const drafts = mine.filter((r) => r.status === "draft");
  const average = submitted.length
    ? round2(submitted.reduce((s, r) => s + totalOf(r.scores), 0) / submitted.length)
    : null;
  const categoryAverages = Object.fromEntries(
    rubricKeys.map((k) => [
      k,
      submitted.length ? round2(submitted.reduce((s, r) => s + (r.scores[k] ?? 0), 0) / submitted.length) : null,
    ]),
  ) as Record<RubricKey, number | null>;

  let reason: string | null = null;
  if (eligibility !== "eligible") reason = eligibility === "ineligible" ? "Ineligible" : "Eligibility not reviewed";
  else if (submitted.length < minJudges) reason = `${submitted.length} of ${minJudges} required score sheets submitted`;
  else if (drafts.length) reason = `${drafts.length} judge${drafts.length > 1 ? "s" : ""} still drafting`;

  return {
    submissionId,
    submittedCount: submitted.length,
    draftCount: drafts.length,
    average,
    categoryAverages,
    finalized: reason === null,
    reason,
  };
}

/** Ranks only finalized results. Ties share a rank (1, 2, 2, 4). */
export function rankResults(results: EntryResult[]): (EntryResult & { rank: number })[] {
  const finalized = results
    .filter((r) => r.finalized && r.average !== null)
    .toSorted((a, b) => (b.average ?? 0) - (a.average ?? 0));
  let lastScore: number | null = null;
  let lastRank = 0;
  return finalized.map((r, i) => {
    if (r.average !== lastScore) {
      lastRank = i + 1;
      lastScore = r.average;
    }
    return { ...r, rank: lastRank };
  });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export { rubricTotal };
