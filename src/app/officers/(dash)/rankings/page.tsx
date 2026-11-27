import Link from "next/link";
import { Suspense } from "react";
import { categories } from "@/content/competition";
import { computeEntryResult, rankResults } from "@/lib/domain/scoring";
import { requireAdmin } from "@/lib/server/auth";
import { getStore } from "@/lib/server/store";
import { PageTitle } from "@/components/officers/ui";
import { FinalizeForm } from "@/components/officers/SettingsForms";
import { LocalDate } from "@/components/ui/LocalDate";

export default function RankingsPage() {
  return (
    <Suspense fallback={<p className="text-stone">Loading rankings…</p>}>
      <Rankings />
    </Suspense>
  );
}

async function Rankings() {
  await requireAdmin();
  const store = getStore();
  const [subs, scores, settings] = await Promise.all([store.listSubmissions({ includeTest: true }), store.listScores({}), store.getSettings()]);
  const results = subs.map((s) => computeEntryResult(s.id, s.eligibility, scores, settings.minJudgesPerEntry));
  const ranked = rankResults(results);
  const byId = new Map(subs.map((s) => [s.id, s]));
  const inProgress = results.filter((r) => !r.finalized && byId.get(r.submissionId)?.eligibility === "eligible");
  const cat = new Map(categories.map((c) => [c.id, c.title]));

  return (
    <>
      <PageTitle title="Rankings">
        <div className="flex flex-wrap gap-3">
          <a href="/api/officers/export?type=submissions&test=1" className="inline-flex h-11 items-center border border-ink px-4 font-semibold hover:bg-ink hover:text-paper">
            Export entries (CSV)
          </a>
          <a href="/api/officers/export?type=scores&test=1" className="inline-flex h-11 items-center border border-ink px-4 font-semibold hover:bg-ink hover:text-paper">
            Export score sheets (CSV)
          </a>
        </div>
      </PageTitle>
      <p className="mb-10 max-w-[70ch] text-stone">
        Private to administrators. Only entries that are eligible, have at least {settings.minJudgesPerEntry} submitted
        score sheets and no outstanding drafts are ranked. Nothing here is published automatically.
      </p>

      <section>
        <h2 className="t-h3 mb-4">Finalized results</h2>
        {ranked.length === 0 ? (
          <p className="border border-dashed border-rule p-8 text-stone">No entries have complete judging yet.</p>
        ) : (
          <div className="overflow-x-auto border-t border-ink">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className="border-b border-rule t-small text-stone">
                  <th scope="col" className="py-3 pr-4">Rank</th>
                  <th scope="col" className="py-3 pr-4">Entry</th>
                  <th scope="col" className="py-3 pr-4">Category</th>
                  <th scope="col" className="py-3 pr-4 text-right">Sheets</th>
                  <th scope="col" className="py-3 text-right">Average /100</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r) => {
                  const s = byId.get(r.submissionId)!;
                  return (
                    <tr key={r.submissionId} className="border-b border-rule">
                      <td className="py-4 pr-4 t-num text-[1.6rem]">{r.rank}</td>
                      <td className="py-4 pr-4">
                        <Link href={`/officers/entries/${s.id}`} className="font-semibold underline decoration-rule underline-offset-4 hover:decoration-forest">
                          {s.projectName}
                        </Link>
                        <span className="block t-small text-stone">
                          {s.reference} — {s.memberNames.join(", ")}
                        </span>
                      </td>
                      <td className="py-4 pr-4 t-small">{cat.get(s.category)}</td>
                      <td className="py-4 pr-4 text-right tabular-nums">{r.submittedCount}</td>
                      <td className="py-4 text-right t-num text-[1.6rem]">{r.average?.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="t-h3 mb-4">Judging in progress (not ranked)</h2>
        {inProgress.length === 0 ? (
          <p className="text-stone">None.</p>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {inProgress.map((r) => {
              const s = byId.get(r.submissionId)!;
              return (
                <li key={r.submissionId} className="flex flex-wrap justify-between gap-3 py-3">
                  <Link href={`/officers/entries/${s.id}`} className="font-semibold hover:text-forest">
                    {s.projectName} <span className="font-normal text-stone">{s.reference}</span>
                  </Link>
                  <span className="t-small text-stone">{r.reason}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-14 border-t border-ink pt-8">
        <h2 className="t-h3">Finalize results</h2>
        <p className="mt-2 max-w-[66ch] text-stone">
          Finalizing locks every score sheet so the ranking can’t change. It does not publish a winner — announce the
          result through official EIC channels when you’re ready.
          {settings.resultsFinalizedAt && (
            <>
              {" "}
              Finalized <LocalDate iso={settings.resultsFinalizedAt} />.
            </>
          )}
        </p>
        <div className="mt-6">
          <FinalizeForm locked={!!settings.resultsFinalizedAt} />
        </div>
      </section>
    </>
  );
}
