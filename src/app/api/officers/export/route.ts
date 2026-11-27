import { categories, rubric } from "@/content/competition";
import { computeEntryResult, rankResults, totalOf } from "@/lib/domain/scoring";
import { getOfficer } from "@/lib/server/auth";
import { toCsv } from "@/lib/server/csv";
import { guarded, jsonError } from "@/lib/server/request";
import { getStore } from "@/lib/server/store";

/** Admin-only CSV exports: ?type=submissions | scores. Private files are not included, only references. */
export const GET = guarded(async (req: Request) => {
  const officer = await getOfficer();
  if (!officer) return jsonError(401, "Sign in as an officer.");
  if (officer.role !== "admin") return jsonError(403, "Only administrators can export records.");
  const url = new URL(req.url);
  const type = url.searchParams.get("type") === "scores" ? "scores" : "submissions";
  const includeTest = url.searchParams.get("test") === "1";
  const store = getStore();
  const [subs, scores, settings, officers] = await Promise.all([
    store.listAllSubmissions(includeTest),
    store.listScores({}),
    store.getSettings(),
    store.listOfficers(),
  ]);
  const catTitle = new Map(categories.map((c) => [c.id, c.title]));
  const judgeName = new Map(officers.map((o) => [o.id, o.displayName]));
  let csv: string;

  if (type === "submissions") {
    const results = subs.map((s) => computeEntryResult(s.id, s.eligibility, scores, settings.minJudgesPerEntry));
    const ranks = new Map(rankResults(results).map((r) => [r.submissionId, r.rank]));
    const byId = new Map(results.map((r) => [r.submissionId, r]));
    csv = toCsv([
      [
        "Reference", "Submitted at", "Test data", "Entry type", "Student 1", "Grade 1", "Email 1", "Email verified",
        "Student 2", "Grade 2", "Email 2", "Project", "Category", "Description", "Problem", "Solution", "Target audience",
        "Prototype", "Video", "Video duration (s)", "Video duration status", "AI used", "AI tools", "AI contribution",
        "Rules version", "Publication permission", "Eligibility", "Eligibility note", "Flags",
        "Submitted score sheets", "Average score", "Result status", "Rank (finalized only)",
      ],
      ...subs.map((s) => {
        const [m1, m2] = s.members;
        const proto = s.assets.find((a) => a.kind === "prototype");
        const video = s.assets.find((a) => a.kind === "video");
        const r = byId.get(s.id)!;
        const assetRef = (a?: typeof proto) => (!a ? "" : a.source === "link" ? a.url : `file: ${a.fileName}`);
        return [
          s.reference, s.submittedAt, s.isTest, s.entryType, m1?.fullName, m1?.grade, m1?.email, s.emailVerified,
          m2?.fullName, m2?.grade, m2?.email, s.projectName, catTitle.get(s.category), s.description, s.problem, s.solution,
          s.targetAudience, assetRef(proto), assetRef(video), video?.durationSeconds, video?.durationStatus, s.aiUsed,
          s.aiTools, s.aiContribution, s.rulesVersion, s.publicationPermission, s.eligibility, s.eligibilityNote,
          s.flags.join("; "), r.submittedCount, r.average, r.finalized ? "finalized" : `in progress: ${r.reason}`,
          ranks.get(s.id) ?? "",
        ];
      }),
    ]);
  } else {
    const refs = new Map(subs.map((s) => [s.id, s]));
    csv = toCsv([
      ["Reference", "Project", "Judge", "Status", ...rubric.map((r) => `${r.title} (/${r.points})`), "Total (/100)", "Comments", "Updated at"],
      ...scores
        .filter((r) => refs.has(r.submissionId))
        .map((r) => [
          refs.get(r.submissionId)!.reference, refs.get(r.submissionId)!.projectName, judgeName.get(r.judgeId) ?? r.judgeId,
          r.status, ...rubric.map((k) => r.scores[k.key]), totalOf(r.scores), r.comments, r.updatedAt,
        ]),
    ]);
  }

  await store.audit({ officerId: officer.id, action: `export.${type}`, details: { includeTest } });
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="eic-${type}-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
});
