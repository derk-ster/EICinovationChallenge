import Link from "next/link";
import { Suspense } from "react";
import { computeEntryResult } from "@/lib/domain/scoring";
import { submissionWindow } from "@/lib/domain/status";
import { requireOfficer } from "@/lib/server/auth";
import { getStore } from "@/lib/server/store";
import { windowLabel } from "@/components/site/window-label";
import { PageTitle, Stat } from "@/components/officers/ui";

export default function OverviewPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <Suspense fallback={<p className="text-stone">Loading…</p>}>
      <Overview searchParams={searchParams} />
    </Suspense>
  );
}

async function Overview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const officer = await requireOfficer();
  const denied = (await searchParams).denied === "admin";
  const store = getStore();
  const [subs, scores, settings] = await Promise.all([
    store.listSubmissions({ includeTest: true }),
    store.listScores({}),
    store.getSettings(),
  ]);
  const eligible = subs.filter((s) => s.eligibility === "eligible");
  const pending = subs.filter((s) => s.eligibility === "pending");
  const flagged = subs.filter((s) => s.flags.length > 0);
  const mine = scores.filter((r) => r.judgeId === officer.id);
  const mySubmitted = eligible.filter((s) => mine.some((r) => r.submissionId === s.id && r.status === "submitted")).length;
  const results = eligible.map((s) => computeEntryResult(s.id, s.eligibility, scores, settings.minJudgesPerEntry));
  const finalized = results.filter((r) => r.finalized).length;
  const w = submissionWindow(settings);

  return (
    <>
      <PageTitle title={`Hello, ${officer.displayName.split(" ")[0]}.`}>
        <p className="t-small text-stone">
          Public status: <strong className="text-ink">{windowLabel(w).long}</strong>
          {settings.resultsFinalizedAt && <> — results finalized</>}
        </p>
      </PageTitle>
      {denied && (
        <p role="alert" className="mb-10 border-l-4 border-amber bg-amber/10 p-4 font-medium">
          That page is only available to administrators.
        </p>
      )}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Entries received" value={subs.length} />
        <Stat label="Waiting for eligibility review" value={pending.length} />
        <Stat label="Flagged for a closer look" value={flagged.length} note="Video length, unverified email or possible duplicates" />
        <Stat label="Eligible entries" value={eligible.length} />
      </div>

      <section className="mt-16 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="t-h3">Your judging</h2>
          <p className="mt-2 text-stone">
            You’ve submitted score sheets for {mySubmitted} of {eligible.length} eligible entries.
          </p>
          <Progress value={mySubmitted} max={eligible.length} />
          <Link href="/officers/entries?eligibility=eligible" className="mt-6 inline-flex h-11 items-center bg-ink px-5 font-semibold text-paper hover:bg-forest">
            Score eligible entries
          </Link>
        </div>
        <div>
          <h2 className="t-h3">Overall progress</h2>
          <p className="mt-2 text-stone">
            {finalized} of {eligible.length} eligible entries have complete judging ({settings.minJudgesPerEntry} submitted
            sheets required, no drafts outstanding).
          </p>
          <Progress value={finalized} max={eligible.length} />
          {pending.length > 0 && (
            <Link href="/officers/entries?eligibility=pending" className="mt-6 inline-flex h-11 items-center border border-ink px-5 font-semibold hover:bg-ink hover:text-paper">
              Review {pending.length} pending {pending.length === 1 ? "entry" : "entries"}
            </Link>
          )}
        </div>
      </section>
    </>
  );
}

function Progress({ value, max }: { value: number; max: number }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mt-4">
      <div className="h-2 w-full bg-paper-2" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label="Progress">
        <div className="h-full bg-forest" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 t-small text-stone">{pct}%</p>
    </div>
  );
}
