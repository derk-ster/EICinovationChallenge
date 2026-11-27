import { timeline } from "@/content/competition";
import { effectiveDeadline } from "@/lib/domain/status";
import { getPublicState } from "@/lib/server/public";
import { Countdown } from "@/components/ui/Countdown";
import { LocalDate } from "@/components/ui/LocalDate";

/** Process timeline. Shows an officer-configured date only where one exists — no invented dates. */
export async function Timeline() {
  const state = await getPublicState();
  const s = state?.settings;
  const deadline = s ? effectiveDeadline(s) : null;
  const dateFor = (key: string): string | null => {
    if (!s) return null;
    if (key === "announcedAt") return s.announcedAt;
    if (key === "opensAt") return s.opensAt;
    if (key === "deadlineAt") return deadline;
    if (key === "winnerAnnouncementAt") return s.winnerAnnouncementAt;
    return null;
  };
  // The window is only "open" while the deadline is still ahead, so no clock read is needed here.
  const showCountdown = state?.window.state === "open" && Boolean(deadline);

  return (
    <div className="grid gap-14 lg:grid-cols-12">
      <ol className="lg:col-span-8 relative">
        {timeline.map((step, i) => {
          const date = dateFor(step.key);
          return (
            <li key={step.key} className="grid grid-cols-[3.25rem_1fr] gap-x-4 border-t border-rule py-6 sm:grid-cols-[4.5rem_1fr_14rem]">
              <span className="t-num text-[1.6rem] leading-none text-forest">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="t-h3">{step.title}</h3>
                <p className="mt-2 text-stone measure">{step.body}</p>
              </div>
              <p className="col-start-2 mt-3 t-small text-stone sm:col-start-3 sm:mt-1 sm:text-right">
                {date ? (
                  <span className="font-medium text-ink">
                    {step.key === "deadlineAt" && s?.extensionUntil === date ? "Extended to " : ""}
                    <LocalDate iso={date} withTime={step.key === "deadlineAt"} />
                  </span>
                ) : step.key === "eligibilityReview" || step.key === "judging" ? (
                  "After the deadline"
                ) : step.key === "opensAt" && state?.window.state === "open" ? (
                  <span className="font-medium text-forest">Underway now</span>
                ) : (
                  "Date to be announced"
                )}
              </p>
            </li>
          );
        })}
      </ol>
      <aside className="lg:col-span-4">
        <div className="border-t-2 border-ink pt-6 lg:sticky lg:top-24">
          {showCountdown ? (
            <>
              <h3 className="t-h3">Time left to submit</h3>
              <div className="mt-6">
                <Countdown to={deadline!} tone="light" />
              </div>
              {s?.extensionNote && <p className="mt-6 t-small text-stone">{s.extensionNote}</p>}
            </>
          ) : (
            <>
              <h3 className="t-h3">Dates come from EIC</h3>
              <p className="mt-4 text-stone">
                Exact dates, the submission deadline and the winner announcement will be shared through official EIC
                announcements and posted here as soon as they’re set.
              </p>
            </>
          )}
          {state?.announcements.length ? (
            <div className="mt-10">
              <h3 className="font-semibold">Latest from EIC</h3>
              <ul className="mt-3 space-y-4">
                {state.announcements.slice(0, 3).map((a) => (
                  <li key={a.id} className="border-l-2 border-forest pl-4">
                    <p className="font-medium">{a.title}</p>
                    <p className="t-small text-stone whitespace-pre-line">{a.body}</p>
                    {a.publishedAt && (
                      <p className="mt-1 t-small text-stone">
                        <LocalDate iso={a.publishedAt} withTime={false} />
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
