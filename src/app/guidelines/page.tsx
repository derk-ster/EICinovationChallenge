import type { Metadata } from "next";
import Link from "next/link";
import { aiPolicy, judgingProcess, mockupExamples, rules } from "@/content/competition";
import { VideoRoadmap } from "@/components/guidelines/VideoRoadmap";
import { RubricBar } from "@/components/ui/RubricBar";
import { Reveal } from "@/components/motion/Reveal";

export const metadata: Metadata = {
  title: "Requirements, judging and rules",
  description: "What to submit, how entries are judged, and the official rules for the EIC Innovation Challenge.",
};

const sections = [
  { href: "#requirements", label: "Submission requirements" },
  { href: "#video", label: "Video roadmap" },
  { href: "#judging", label: "Judging rubric" },
  { href: "#rules", label: "Official rules" },
  { href: "#ai-policy", label: "AI usage policy" },
];

export default function GuidelinesPage() {
  return (
    <main>
      <header className="surface-dark grain blueprint pt-36 pb-20 md:pt-44 md:pb-28">
        <div className="shell grid gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-8">
            <h1 data-r className="t-display text-paper max-w-[12ch]">
              The guidelines.
            </h1>
            <p data-r className="t-lead mt-8 max-w-[44ch] text-silver">
              Everything you need to know before you submit: what to make, how it’s judged and the rules every entry
              follows.
            </p>
          </Reveal>
          <nav aria-label="On this page" className="lg:col-span-3 lg:col-start-10 lg:self-end">
            <ul className="border-t border-rule-dark">
              {sections.map((s) => (
                <li key={s.href} className="border-b border-rule-dark">
                  <a href={s.href} className="focus-light block py-3 text-silver hover:text-paper">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <section id="requirements" aria-labelledby="req-title" className="grain py-24 md:py-32">
        <div className="shell">
          <h2 id="req-title" className="t-h2 max-w-[18ch]">
            Submission requirements
          </h2>
          <p className="mt-6 max-w-[56ch] text-stone">
            Every entry includes exactly two things. Nothing else is required.
          </p>
          <div className="mt-14 grid gap-14 lg:grid-cols-2 lg:gap-0 lg:divide-x lg:divide-rule">
            <article className="lg:pr-14">
              <p className="t-small font-semibold text-forest">Requirement 1</p>
              <h3 className="t-h2 mt-3 !text-[clamp(2rem,3.6vw,3.25rem)]">Mockup or prototype</h3>
              <p className="mt-5 text-stone measure">
                A visual or functional demonstration of your idea. Upload a file or share a link. A fully functioning
                product is not required.
              </p>
              <h4 className="mt-10 font-semibold">Accepted examples</h4>
              <ul className="mt-4 grid grid-cols-2 gap-x-6 border-t border-rule sm:grid-cols-3">
                {mockupExamples.map((m) => (
                  <li key={m} className="border-b border-rule py-3">
                    {m}
                  </li>
                ))}
              </ul>
            </article>
            <article className="lg:pl-14">
              <p className="t-small font-semibold text-forest">Requirement 2</p>
              <h3 className="t-h2 mt-3 !text-[clamp(2rem,3.6vw,3.25rem)]">Presentation video</h3>
              <p className="mt-5 text-stone measure">
                A video between <strong className="text-ink">2 and 3 minutes</strong> long that explains your idea.
                Upload the file or share a link (for example, an unlisted YouTube video or a Google Drive link that
                officers can open).
              </p>
              <p className="mt-6 text-stone measure">
                Uploaded videos are measured automatically. Linked videos are checked by an officer during review.
              </p>
              <a href="#video" className="mt-8 inline-flex border-b border-ink pb-1 font-semibold hover:border-forest hover:text-forest">
                Plan your video with the roadmap
              </a>
            </article>
          </div>
        </div>
      </section>

      <section id="video" aria-labelledby="video-title" className="surface-dark grain py-24 md:py-32">
        <div className="shell">
          <div className="mb-14 grid gap-6 lg:grid-cols-12">
            <h2 id="video-title" className="t-h2 text-paper lg:col-span-6">
              Structure your video in seven parts
            </h2>
            <p className="text-silver lg:col-span-5 lg:col-start-8 lg:self-end">
              Cover each part in this order. Select a part to see what to say.
            </p>
          </div>
          <VideoRoadmap />
        </div>
      </section>

      <section id="judging" aria-labelledby="judging-title" className="grain py-24 md:py-32">
        <div className="shell grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="judging-title" className="t-h2">
              Judging rubric
            </h2>
            <p className="mt-6 text-stone">
              Judging evaluates originality, usefulness, development, business potential, communication, research and
              feasibility.
            </p>
            <ul className="mt-10 border-t border-ink">
              {judgingProcess.map((j) => (
                <li key={j} className="border-b border-rule py-4 font-medium">
                  {j}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-8">
            <RubricBar />
          </div>
        </div>
      </section>

      <section id="rules" aria-labelledby="rules-title" className="bg-paper-2 py-24 md:py-32">
        <div className="shell">
          <div className="grid gap-6 lg:grid-cols-12">
            <h2 id="rules-title" className="t-h2 lg:col-span-6">
              Official competition rules
            </h2>
            <p className="text-stone lg:col-span-5 lg:col-start-8 lg:self-end">
              Every submission must follow these rules. Officers review each entry against them.
            </p>
          </div>
          <ol className="mt-14 grid border-t border-ink md:grid-cols-2 md:gap-x-14">
            {rules.map((r, i) => (
              <li key={r.title} className="grid grid-cols-[2.75rem_1fr] gap-x-3 border-b border-rule py-5">
                <span className="t-num text-[1.2rem] text-forest">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="font-semibold">{r.title}</h3>
                  <p className="mt-1 text-stone">{r.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="ai-policy" aria-labelledby="ai-title" className="surface-dark grain py-24 md:py-32">
        <div className="shell">
          <h2 id="ai-title" className="t-h2 max-w-[18ch] text-paper">
            {aiPolicy.summary}
          </h2>
          <div className="mt-16 grid gap-px bg-rule-dark md:grid-cols-2">
            <div className="bg-ink p-8 md:p-10">
              <h3 className="t-h3 text-paper">Acceptable AI assistance</h3>
              <p className="mt-3 text-silver">AI may assist with brainstorming, research, design, coding and development.</p>
              <ul className="mt-8 space-y-4">
                {aiPolicy.allowed.map((a) => (
                  <li key={a} className="flex gap-4 text-paper">
                    <svg aria-hidden viewBox="0 0 16 16" className="mt-[0.35em] size-4 shrink-0 text-emerald">
                      <path d="M2 8.5 6 12 14 3.5" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-ink p-8 md:p-10">
              <h3 className="t-h3 text-paper">Not allowed</h3>
              <p className="mt-3 text-silver">
                Submitting an entirely AI-generated project as your own work is prohibited.
              </p>
              <ul className="mt-8 space-y-4">
                {aiPolicy.notAllowed.map((a) => (
                  <li key={a} className="flex gap-4 text-paper">
                    <svg aria-hidden viewBox="0 0 16 16" className="mt-[0.35em] size-4 shrink-0 text-danger-dark">
                      <path d="M3 3 13 13 M13 3 3 13" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-12 grid gap-6 lg:grid-cols-12">
            <p className="t-lead text-silver lg:col-span-7">
              The core idea, decision-making and work must come from you. {aiPolicy.disclosure}
            </p>
            <div className="lg:col-span-4 lg:col-start-9 lg:self-end">
              <Link href="/submit" className="focus-light inline-flex h-14 items-center bg-paper px-7 font-semibold text-ink hover:bg-white">
                Submit Your Idea
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
