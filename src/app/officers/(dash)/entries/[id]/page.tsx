import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { categories, rubric } from "@/content/competition";
import { computeEntryResult, totalOf } from "@/lib/domain/scoring";
import { formatBytes } from "@/lib/domain/files";
import type { SubmissionAsset } from "@/lib/domain/types";
import { requireOfficer } from "@/lib/server/auth";
import { getStore } from "@/lib/server/store";
import { Badge, EligibilityBadge, FlagBadges, flagLabels } from "@/components/officers/ui";
import { EligibilityForm } from "@/components/officers/EligibilityForm";
import { ScoreForm } from "@/components/officers/ScoreForm";
import { LocalDate } from "@/components/ui/LocalDate";

export default function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-stone">Loading entry…</p>}>
      <Entry params={params} />
    </Suspense>
  );
}

const LINK_TTL = 10 * 60;

async function Entry({ params }: { params: Promise<{ id: string }> }) {
  const officer = await requireOfficer();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const store = getStore();
  const [s, scores, settings, officers] = await Promise.all([
    store.getSubmission(id),
    store.listScores({ submissionId: id }),
    store.getSettings(),
    store.listOfficers(),
  ]);
  if (!s) notFound();
  const isAdmin = officer.role === "admin";
  const mine = scores.find((r) => r.judgeId === officer.id) ?? null;
  const result = computeEntryResult(s.id, s.eligibility, scores, settings.minJudgesPerEntry);
  const judgeName = new Map(officers.map((o) => [o.id, o.displayName]));
  const reviewer = s.eligibilityReviewedBy ? judgeName.get(s.eligibilityReviewedBy) : null;
  const category = categories.find((c) => c.id === s.category)?.title;
  const assets = await Promise.all(
    s.assets.map(async (a) => ({
      a,
      view: await store.signedFileUrl(a, { download: false, ttlSeconds: LINK_TTL }),
      download: await store.signedFileUrl(a, { download: true, ttlSeconds: LINK_TTL }),
    })),
  );
  await store.audit({ officerId: officer.id, action: "submission.view", target: s.id });

  return (
    <>
      <p className="t-small">
        <Link href="/officers/entries" className="font-semibold text-stone hover:text-ink">
          All entries
        </Link>
      </p>
      <div className="mt-4 mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-6">
        <div>
          <p className="t-num text-[1.2rem] text-forest">{s.reference}</p>
          <h1 className="t-h2 mt-1 !text-[clamp(2rem,4vw,3.25rem)]">{s.projectName}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <EligibilityBadge status={s.eligibility} />
            <Badge>{category}</Badge>
            <Badge>{s.entryType === "team" ? "Team of two" : "Individual"}</Badge>
            {s.isTest && <Badge tone="info">Test data</Badge>}
            <FlagBadges flags={s.flags} />
          </div>
        </div>
        <p className="t-small text-stone">
          Submitted <LocalDate iso={s.submittedAt} />
        </p>
      </div>

      <div className="grid gap-14 lg:grid-cols-12">
        <div className="space-y-14 lg:col-span-7">
          <Section title="Participants">
            <dl className="divide-y divide-rule border-y border-rule">
              {s.members.map((m) => (
                <div key={m.position} className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr]">
                  <dt className="t-small text-stone">{m.position === 1 ? (s.entryType === "team" ? "Team lead" : "Student") : "Partner"}</dt>
                  <dd>
                    <span className="font-semibold">{m.fullName}</span>, grade {m.grade}
                    {m.email && (
                      <span className="block t-small text-stone">
                        {m.email}
                        {m.position === 1 && (s.emailVerified ? " (verified)" : " (not verified)")}
                      </span>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section title="Project">
            <dl className="space-y-6">
              {[
                ["Short description", s.description],
                ["Problem", s.problem],
                ["Solution", s.solution],
                ["Target audience", s.targetAudience],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="t-small font-semibold text-stone">{k}</dt>
                  <dd className="mt-1 whitespace-pre-line measure">{v}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section title="Materials">
            <p className="mb-6 t-small text-stone">Private file links expire after 10 minutes. Reload the page for fresh links.</p>
            <div className="space-y-8">
              {(["prototype", "video"] as const).map((kind) => {
                const entry = assets.find((x) => x.a.kind === kind);
                return <Asset key={kind} kind={kind} entry={entry} />;
              })}
            </div>
          </Section>

          <Section title="AI disclosure">
            {s.aiUsed ? (
              <dl className="space-y-4">
                <div>
                  <dt className="t-small font-semibold text-stone">Tools used</dt>
                  <dd className="mt-1">{s.aiTools}</dd>
                </div>
                <div>
                  <dt className="t-small font-semibold text-stone">How they contributed</dt>
                  <dd className="mt-1 whitespace-pre-line measure">{s.aiContribution}</dd>
                </div>
              </dl>
            ) : (
              <p>The student confirmed that no AI tools were used.</p>
            )}
          </Section>

          <Section title="Agreements">
            <ul className="space-y-2">
              <li>
                Agreed to the official rules (version {s.rulesVersion}) on <LocalDate iso={s.rulesAgreedAt} />
              </li>
              <li>
                Public display permission:{" "}
                <strong>{s.publicationPermission ? "Granted" : "Not granted — do not display publicly"}</strong>
              </li>
            </ul>
          </Section>
        </div>

        <aside className="space-y-14 lg:col-span-5">
          <Section title="Eligibility">
            {s.flags.length > 0 && (
              <ul className="mb-6 space-y-2 border-l-4 border-amber bg-amber/10 p-4 t-small">
                {s.flags.map((f) => (
                  <li key={f}>
                    <strong>{flagLabels[f] ?? f}.</strong> {flagHelp[f] ?? ""}
                  </li>
                ))}
              </ul>
            )}
            {reviewer && s.eligibilityReviewedAt && (
              <p className="mb-4 t-small text-stone">
                Last decision by {reviewer}, <LocalDate iso={s.eligibilityReviewedAt} />
                {s.eligibilityNote ? `: “${s.eligibilityNote}”` : ""}
              </p>
            )}
            <EligibilityForm id={s.id} status={s.eligibility} note={s.eligibilityNote} />
          </Section>

          <Section title="Your score sheet">
            {s.eligibility === "eligible" ? (
              <ScoreForm submissionId={s.id} initial={mine?.scores ?? null} comments={mine?.comments ?? null} status={mine?.status ?? null} locked={settings.resultsFinalizedAt} />
            ) : (
              <p className="text-stone">Scoring opens once this entry is marked eligible.</p>
            )}
          </Section>

          <Section title="Judging status">
            <p>
              {result.submittedCount} submitted sheet{result.submittedCount === 1 ? "" : "s"}
              {result.draftCount ? `, ${result.draftCount} draft${result.draftCount === 1 ? "" : "s"}` : ""}.{" "}
              {result.finalized ? <Badge tone="good">Complete</Badge> : <span className="text-stone">{result.reason}.</span>}
            </p>
            {isAdmin && scores.length > 0 && (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full border-collapse text-left t-small">
                  <thead>
                    <tr className="border-b border-ink">
                      <th scope="col" className="py-2 pr-3">Judge</th>
                      {rubric.map((r) => (
                        <th key={r.key} scope="col" className="py-2 pr-2 text-right" title={r.title}>
                          {r.title.split(" ")[0]}
                        </th>
                      ))}
                      <th scope="col" className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scores.map((r) => (
                      <tr key={r.id} className="border-b border-rule">
                        <th scope="row" className="py-2 pr-3 font-medium">
                          {judgeName.get(r.judgeId) ?? "Unknown"}
                          {r.status === "draft" && <span className="ml-1 text-stone">(draft)</span>}
                        </th>
                        {rubric.map((k) => (
                          <td key={k.key} className="py-2 pr-2 text-right tabular-nums">
                            {r.scores[k.key] ?? "—"}
                          </td>
                        ))}
                        <td className="py-2 text-right font-semibold tabular-nums">{totalOf(r.scores)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {result.average !== null && (
                    <tfoot>
                      <tr>
                        <th scope="row" className="py-2 pr-3">Average (submitted)</th>
                        {rubric.map((k) => (
                          <td key={k.key} className="py-2 pr-2 text-right tabular-nums">
                            {result.categoryAverages[k.key]}
                          </td>
                        ))}
                        <td className="py-2 text-right font-semibold tabular-nums">{result.average}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                {scores.some((r) => r.comments) && (
                  <div className="mt-6 space-y-3">
                    {scores
                      .filter((r) => r.comments)
                      .map((r) => (
                        <blockquote key={r.id} className="border-l-2 border-rule pl-4 t-small">
                          <p className="whitespace-pre-line">{r.comments}</p>
                          <footer className="mt-1 text-stone">{judgeName.get(r.judgeId)}</footer>
                        </blockquote>
                      ))}
                  </div>
                )}
              </div>
            )}
          </Section>
        </aside>
      </div>
    </>
  );
}

const flagHelp: Record<string, string> = {
  "video-duration-review": "The video length couldn’t be measured automatically. Confirm it runs 2–3 minutes.",
  "video-link-unrecognized": "The video link isn’t from a common video host. Check that it opens.",
  "email-unverified": "Email verification was off when this was submitted.",
  "possible-duplicate-name": "A student with the same name appears in another entry. Check it isn’t the same person.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="t-h3 mb-5 border-b border-ink pb-3">{title}</h2>
      {children}
    </section>
  );
}

function Asset({
  kind,
  entry,
}: {
  kind: "prototype" | "video";
  entry?: { a: SubmissionAsset; view: string | null; download: string | null };
}) {
  const label = kind === "video" ? "Presentation video" : "Mockup or prototype";
  if (!entry) return <p className="text-danger">{label}: missing.</p>;
  const { a, view, download } = entry;
  const duration =
    kind === "video"
      ? a.durationStatus === "detected_in_range" && a.durationSeconds
        ? `Length ${Math.floor(a.durationSeconds / 60)}:${String(Math.round(a.durationSeconds % 60)).padStart(2, "0")} (measured in the student’s browser)`
        : "Length not verified — check it runs 2–3 minutes"
      : null;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-semibold">{label}</h3>
        {duration && <span className={`t-small ${a.durationStatus === "detected_in_range" ? "text-stone" : "font-semibold text-amber"}`}>{duration}</span>}
      </div>
      {a.source === "link" ? (
        <p className="mt-2 break-all">
          <a href={a.url ?? "#"} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold underline underline-offset-4 hover:text-forest">
            {a.url}
          </a>
          <span className="block t-small text-stone">External link, opens in a new tab. Don’t sign in to unfamiliar sites.</span>
        </p>
      ) : (
        <div className="mt-3">
          {view && a.mimeType?.startsWith("video/") && (
            <video controls preload="metadata" className="aspect-video w-full bg-ink" src={view}>
              <track kind="captions" />
            </video>
          )}
          {view && a.mimeType?.startsWith("image/") && (
            // eslint-disable-next-line @next/next/no-img-element -- private, short-lived signed URL
            <img src={view} alt={`${label} uploaded by the student`} className="max-h-[480px] w-auto border border-rule" />
          )}
          <p className="mt-2 t-small">
            {a.fileName} {a.sizeBytes ? `(${formatBytes(a.sizeBytes)})` : ""}{" "}
            {view && (
              <a href={view} target="_blank" rel="noopener noreferrer" className="ml-2 font-semibold underline underline-offset-4">
                Open
              </a>
            )}
            {download && (
              <a href={download} className="ml-3 font-semibold underline underline-offset-4">
                Download
              </a>
            )}
            {!view && <span className="text-danger">File link unavailable.</span>}
          </p>
        </div>
      )}
    </div>
  );
}
