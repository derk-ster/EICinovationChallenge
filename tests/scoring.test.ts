import { describe, expect, it } from "vitest";
import { computeEntryResult, rankResults, rubricMax, totalOf, validateScores } from "@/lib/domain/scoring";
import { rubric, rubricTotal } from "@/content/competition";
import type { ScoreRecord } from "@/lib/domain/types";

const full = { innovation: 20, problemSolution: 20, prototypeExecution: 20, businessPotential: 20, presentation: 10, research: 10 };

function sheet(submissionId: string, judgeId: string, v: number[], status: "draft" | "submitted" = "submitted"): ScoreRecord {
  return {
    id: `${submissionId}-${judgeId}`,
    submissionId,
    judgeId,
    scores: { innovation: v[0], problemSolution: v[1], prototypeExecution: v[2], businessPotential: v[3], presentation: v[4], research: v[5] },
    comments: null,
    status,
    updatedAt: "",
  };
}

describe("official rubric", () => {
  it("matches the official categories and totals 100", () => {
    expect(rubric.map((r) => [r.title, r.points])).toEqual([
      ["Innovation & Creativity", 20],
      ["Problem & Solution", 20],
      ["Prototype & Execution", 20],
      ["Business Potential", 20],
      ["Presentation & Communication", 10],
      ["Research & Feasibility", 10],
    ]);
    expect(rubricTotal).toBe(100);
  });
});

describe("validateScores", () => {
  it("accepts the maximum for every category", () => {
    const v = validateScores(full, true);
    expect(v.ok).toBe(true);
    if (v.ok) expect(totalOf(v.scores)).toBe(100);
  });
  it("rejects scores above a category maximum", () => {
    const v = validateScores({ ...full, presentation: 11 }, true);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errors.presentation).toMatch(/0–10/);
    const w = validateScores({ ...full, innovation: 21 }, true);
    expect(w.ok).toBe(false);
  });
  it("rejects negatives and decimals", () => {
    expect(validateScores({ ...full, research: -1 }, true).ok).toBe(false);
    expect(validateScores({ ...full, research: 7.5 }, true).ok).toBe(false);
    expect(validateScores({ ...full, research: "abc" }, true).ok).toBe(false);
  });
  it("requires every category on a submitted sheet but not on a draft", () => {
    const partial = { innovation: 10 };
    expect(validateScores(partial, true).ok).toBe(false);
    expect(validateScores(partial, false).ok).toBe(true);
  });
  it("uses the official maxima", () => {
    expect(rubricMax).toEqual({ innovation: 20, problemSolution: 20, prototypeExecution: 20, businessPotential: 20, presentation: 10, research: 10 });
  });
});

describe("averaging and ranking", () => {
  it("averages submitted sheets only", () => {
    const records = [sheet("a", "j1", [20, 20, 20, 20, 10, 10]), sheet("a", "j2", [10, 10, 10, 10, 5, 5]), sheet("a", "j3", [0, 0, 0, 0, 0, 0], "draft")];
    const r = computeEntryResult("a", "eligible", records, 2);
    expect(r.average).toBe(75);
    expect(r.submittedCount).toBe(2);
    expect(r.draftCount).toBe(1);
    expect(r.finalized).toBe(false); // an outstanding draft blocks finalization
  });
  it("is finalized only with enough sheets, eligibility and no drafts", () => {
    const two = [sheet("a", "j1", [15, 15, 15, 15, 8, 8]), sheet("a", "j2", [16, 16, 16, 16, 8, 8])];
    expect(computeEntryResult("a", "eligible", two, 2).finalized).toBe(true);
    expect(computeEntryResult("a", "eligible", two, 3).finalized).toBe(false);
    expect(computeEntryResult("a", "pending", two, 2).finalized).toBe(false);
    expect(computeEntryResult("a", "ineligible", two, 2).finalized).toBe(false);
  });
  it("never ranks incomplete entries and shares ranks on ties", () => {
    const records = [
      sheet("a", "j1", [20, 20, 20, 20, 10, 10]),
      sheet("a", "j2", [20, 20, 20, 20, 10, 10]),
      sheet("b", "j1", [10, 10, 10, 10, 5, 5]),
      sheet("b", "j2", [10, 10, 10, 10, 5, 5]),
      sheet("c", "j1", [10, 10, 10, 10, 5, 5]),
      sheet("c", "j2", [10, 10, 10, 10, 5, 5]),
      sheet("d", "j1", [20, 20, 20, 20, 10, 10]), // only one sheet
    ];
    const results = ["a", "b", "c", "d"].map((id) => computeEntryResult(id, "eligible", records, 2));
    const ranked = rankResults(results);
    expect(ranked.map((r) => [r.submissionId, r.rank])).toEqual([
      ["a", 1],
      ["b", 2],
      ["c", 2],
    ]);
  });
});
