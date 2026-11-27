import Link from "next/link";
import { Suspense } from "react";
import { categories } from "@/content/competition";
import { requireOfficer } from "@/lib/server/auth";
import { getStore } from "@/lib/server/store";
import { Badge, EligibilityBadge, FlagBadges, PageTitle } from "@/components/officers/ui";
import { inputBase } from "@/components/submit/fields";
import { LocalDate } from "@/components/ui/LocalDate";

type Search = Promise<Record<string, string | string[] | undefined>>;

export default function EntriesPage({ searchParams }: { searchParams: Search }) {
  return (
    <Suspense fallback={<p className="text-stone">Loading entries…</p>}>
      <Entries searchParams={searchParams} />
    </Suspense>
  );
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function Entries({ searchParams }: { searchParams: Search }) {
  const officer = await requireOfficer();
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 100);
  const category = one(sp.category) || "all";
  const eligibility = (["pending", "eligible", "ineligible"].includes(one(sp.eligibility)) ? one(sp.eligibility) : "all") as
    | "pending"
    | "eligible"
    | "ineligible"
    | "all";
  const flagged = one(sp.flagged) === "1";
  const store = getStore();
  const [rows, myScores] = await Promise.all([
    store.listSubmissions({ q, category, eligibility, flagged, includeTest: true }),
    store.listScores({ judgeId: officer.id }),
  ]);
  const myStatus = new Map(myScores.map((s) => [s.submissionId, s.status]));
  const catTitle = new Map(categories.map((c) => [c.id, c.title]));

  return (
    <>
      <PageTitle title="Entries">
        <p className="t-small text-stone">{rows.length} shown</p>
      </PageTitle>
      <form method="get" className="mb-8 grid gap-4 md:grid-cols-[1fr_14rem_12rem_auto_auto] md:items-end">
        <div>
          <label htmlFor="q" className="t-small font-semibold">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Reference, project, student or email" className={`${inputBase} mt-1 py-2.5`} />
        </div>
        <div>
          <label htmlFor="category" className="t-small font-semibold">
            Category
          </label>
          <select id="category" name="category" defaultValue={category} className={`${inputBase} mt-1 py-2.5`}>
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="eligibility" className="t-small font-semibold">
            Eligibility
          </label>
          <select id="eligibility" name="eligibility" defaultValue={eligibility} className={`${inputBase} mt-1 py-2.5`}>
            <option value="all">Any status</option>
            <option value="pending">Needs review</option>
            <option value="eligible">Eligible</option>
            <option value="ineligible">Ineligible</option>
          </select>
        </div>
        <label className="flex h-[46px] items-center gap-2 t-small font-semibold">
          <input type="checkbox" name="flagged" value="1" defaultChecked={flagged} className="size-4 accent-[var(--color-forest)]" />
          Flagged only
        </label>
        <button type="submit" className="h-[46px] bg-ink px-5 font-semibold text-paper hover:bg-forest">
          Apply
        </button>
      </form>

      {rows.length === 0 ? (
        <p className="border border-dashed border-rule p-10 text-center text-stone">
          No entries match these filters.{" "}
          <Link href="/officers/entries" className="font-semibold text-ink underline underline-offset-4">
            Clear filters
          </Link>
        </p>
      ) : (
        <div className="overflow-x-auto border-t border-ink">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-rule t-small text-stone">
                <th scope="col" className="py-3 pr-4 font-semibold">Reference</th>
                <th scope="col" className="py-3 pr-4 font-semibold">Project</th>
                <th scope="col" className="py-3 pr-4 font-semibold">Students</th>
                <th scope="col" className="py-3 pr-4 font-semibold">Category</th>
                <th scope="col" className="py-3 pr-4 font-semibold">Status</th>
                <th scope="col" className="py-3 pr-4 font-semibold">Your score</th>
                <th scope="col" className="py-3 font-semibold">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-rule align-top hover:bg-paper-2/60">
                  <td className="py-4 pr-4">
                    <Link href={`/officers/entries/${r.id}`} className="t-num text-[1.05rem] underline decoration-rule underline-offset-4 hover:decoration-forest">
                      {r.reference}
                    </Link>
                    {r.isTest && <div className="mt-1"><Badge>Test</Badge></div>}
                  </td>
                  <td className="py-4 pr-4 font-semibold">{r.projectName}</td>
                  <td className="py-4 pr-4">{r.memberNames.join(", ")}</td>
                  <td className="py-4 pr-4 t-small">{catTitle.get(r.category)}</td>
                  <td className="py-4 pr-4">
                    <div className="flex flex-col items-start gap-1">
                      <EligibilityBadge status={r.eligibility} />
                      <FlagBadges flags={r.flags} />
                    </div>
                  </td>
                  <td className="py-4 pr-4 t-small">
                    {myStatus.get(r.id) === "submitted" ? <Badge tone="good">Submitted</Badge> : myStatus.get(r.id) === "draft" ? <Badge tone="info">Draft</Badge> : <span className="text-stone">—</span>}
                  </td>
                  <td className="py-4 t-small text-stone whitespace-nowrap"><LocalDate iso={r.submittedAt} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
