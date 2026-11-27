import { effectiveDeadline } from "@/lib/domain/status";
import { getPublicState } from "@/lib/server/public";
import { LocalDate } from "@/components/ui/LocalDate";

/** One accurate line about submission availability, shown under the hero buttons. */
export async function HeroStatus() {
  const state = await getPublicState();
  if (!state) return <span>Submission status is unavailable right now.</span>;
  const w = state.window;
  const dot = (on: boolean) => (
    <span aria-hidden className={`mr-2 inline-block size-2 rounded-full align-middle ${on ? "bg-emerald" : "bg-mist/60"}`} />
  );
  if (w.state === "open") {
    const d = effectiveDeadline(state.settings);
    return (
      <span>
        {dot(true)}
        Submissions are open{d ? <>. Deadline: <LocalDate iso={d} /></> : ". The deadline will be announced by EIC."}
      </span>
    );
  }
  if (w.state === "not-yet-open")
    return (
      <span>
        {dot(false)}
        Submissions open {w.opensAt ? <LocalDate iso={w.opensAt} /> : "soon"}.
      </span>
    );
  if (w.state === "closed")
    return (
      <span>
        {dot(false)}
        Submissions are closed.
      </span>
    );
  return (
    <span>
      {dot(false)}
      Submissions aren’t open yet. Dates will be shared through official EIC announcements.
    </span>
  );
}
