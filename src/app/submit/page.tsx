import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { effectiveDeadline } from "@/lib/domain/status";
import { uploadLimits } from "@/lib/server/env";
import { getPublicState } from "@/lib/server/public";
import { SubmissionForm } from "@/components/submit/SubmissionForm";
import { LocalDate } from "@/components/ui/LocalDate";
import { Countdown } from "@/components/ui/Countdown";

export const metadata: Metadata = {
  title: "Submit an entry",
  description: "Submit your project to the EIC Innovation Challenge.",
};

export default function SubmitPage() {
  return (
    <main className="grain min-h-svh pt-32 pb-28 md:pt-40">
      <div className="shell">
        <Suspense fallback={<p className="text-stone">Checking whether submissions are open…</p>}>
          <SubmitContent />
        </Suspense>
      </div>
    </main>
  );
}

async function SubmitContent() {
  const state = await getPublicState();
  if (!state)
    return (
      <Closed title="Submissions aren’t available right now.">
        The submission system hasn’t been configured yet. Please check back later or contact an EIC officer.
      </Closed>
    );
  const w = state.window;
  if (w.state === "disabled")
    return (
      <Closed title="Submissions aren’t open yet.">
        Dates and the deadline will be shared through official EIC announcements. In the meantime, read the guidelines
        and start building.
      </Closed>
    );
  if (w.state === "not-yet-open")
    return (
      <Closed title="Submissions open soon.">
        {w.opensAt ? (
          <>
            The submission form opens <LocalDate iso={w.opensAt} />.
          </>
        ) : (
          "The opening date will be shared through official EIC announcements."
        )}
      </Closed>
    );
  if (w.state === "closed")
    return (
      <Closed title="Submissions are closed.">
        The deadline has passed. Late submissions are not accepted unless an extension is announced by EIC.
      </Closed>
    );

  const deadline = effectiveDeadline(state.settings);
  const intro = (
      <header className="mb-14 grid gap-8 border-b border-rule pb-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <h1 className="t-display !text-[clamp(3rem,7vw,6.5rem)]">Submit your entry.</h1>
          <p className="t-lead mt-6 max-w-[46ch] text-stone">
            Five short steps. Your answers are kept as you move between steps, and you can review everything before you
            submit.
          </p>
        </div>
        <div className="lg:col-span-4 lg:col-start-9 lg:self-end">
          {deadline ? (
            <>
              <p className="t-small text-stone">
                {w.extended ? "Extended deadline" : "Deadline"}: <LocalDate iso={deadline} />
              </p>
              <div className="mt-4">
                <Countdown to={deadline} tone="light" />
              </div>
              {state.settings.extensionNote && <p className="mt-3 t-small text-stone">{state.settings.extensionNote}</p>}
            </>
          ) : (
            <p className="t-small text-stone">The deadline will be announced by EIC.</p>
          )}
          <p className="mt-6 t-small text-stone">
            Before you start, have your mockup or prototype and your 2–3 minute video ready (as files or links).
          </p>
        </div>
      </header>
  );
  return <SubmissionForm settings={state.settings} limits={uploadLimits()} intro={intro} />;
}

function Closed({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="max-w-3xl">
      <h1 className="t-display !text-[clamp(3rem,8vw,6.5rem)]">{title}</h1>
      <p className="t-lead mt-8 text-stone">{children}</p>
      <div className="mt-12 flex flex-wrap gap-4">
        <Link href="/guidelines" className="inline-flex h-14 items-center bg-ink px-7 font-semibold text-paper hover:bg-forest">
          Read the guidelines
        </Link>
        <Link href="/faq" className="inline-flex h-14 items-center border border-ink px-7 font-semibold hover:bg-ink hover:text-paper">
          FAQ
        </Link>
      </div>
    </div>
  );
}
