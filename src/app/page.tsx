import Link from "next/link";
import { Suspense } from "react";
import { competition, eligibility, mockupExamples, overview } from "@/content/competition";
import { HomeStory } from "@/components/home/HomeStory";
import { HeroStatus } from "@/components/home/HeroStatus";
import { CategoryExplorer } from "@/components/home/CategoryExplorer";
import { PrizeStage } from "@/components/home/PrizeStage";
import { Timeline } from "@/components/home/Timeline";
import { Reveal } from "@/components/motion/Reveal";
import { RubricBar } from "@/components/ui/RubricBar";

export default function HomePage() {
  return (
    <main>
      <HomeStory
        status={
          <Suspense fallback={<span className="opacity-0">Checking submission status</span>}>
            <HeroStatus />
          </Suspense>
        }
      />

      {/* Overview */}
      <section id="overview" aria-labelledby="overview-title" className="grain py-28 md:py-40">
        <div className="shell grid gap-14 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <h2 id="overview-title" data-r className="t-h2 max-w-[14ch]">
              A competition for ideas, not budgets.
            </h2>
            <p data-r className="t-lead mt-10 max-w-[38ch] text-stone">
              {overview.lead}
            </p>
            <p data-r className="mt-6 max-w-[52ch]">
              {overview.body}
            </p>
          </Reveal>
          <div className="lg:col-span-5 lg:pt-4">
            <p className="font-semibold">The challenge rewards</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {overview.encourages.map((e) => (
                <li key={e} className="border border-rule px-3 py-1.5 text-[0.95rem]">
                  {e}
                </li>
              ))}
            </ul>
            <dl className="mt-14 divide-y divide-rule border-y border-rule">
              {overview.reassurance.map((r) => (
                <div key={r.title} className="grid gap-1 py-6 sm:grid-cols-[1fr_1.3fr] sm:gap-6">
                  <dt className="font-semibold leading-snug">{r.title}</dt>
                  <dd className="text-stone">{r.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Eligibility */}
      <section id="eligibility" aria-labelledby="eligibility-title" className="bg-paper-2 py-28 md:py-36">
        <div className="shell grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="eligibility-title" className="t-h2">
              Who can enter
            </h2>
            <p className="mt-8 max-w-[30ch] text-stone">
              The official eligibility requirements. If you’re a {competition.school} student, you’re in.
            </p>
          </div>
          <div className="lg:col-span-8">
            <EligibilityGroup title="Participants" rules={eligibility.filter((e) => e.group === "who").map((e) => e.rule)} />
            <EligibilityGroup title="Entries" rules={eligibility.filter((e) => e.group === "entry").map((e) => e.rule)} />
            <EligibilityGroup title="Cost" rules={eligibility.filter((e) => e.group === "cost").map((e) => e.rule)} emphasis="Free" />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section id="categories" aria-labelledby="categories-title" className="surface-dark grain py-28 md:py-36">
        <div className="shell">
          <div className="mb-14 grid gap-6 lg:grid-cols-12">
            <h2 id="categories-title" className="t-h2 lg:col-span-6">
              What you can create
            </h2>
            <p className="t-lead text-silver lg:col-span-5 lg:col-start-8 lg:self-end">
              Six kinds of projects are accepted. Pick the one that fits your idea best. Judges score them all on the
              same rubric.
            </p>
          </div>
          <CategoryExplorer />
        </div>
      </section>

      {/* What you submit */}
      <section id="requirements" aria-labelledby="requirements-title" className="grain py-28 md:py-40">
        <div className="shell">
          <h2 id="requirements-title" className="t-h2 max-w-[16ch]">
            Two things to submit.
          </h2>
          <div className="mt-16 grid gap-px bg-rule lg:grid-cols-2">
            <div className="bg-paper p-8 md:p-12">
              <p className="t-num text-[4.5rem] leading-none text-forest">1</p>
              <h3 className="t-h3 mt-6">A mockup or prototype</h3>
              <p className="mt-4 text-stone measure">
                A visual or functional demonstration of your idea. A fully functioning product is not required.
              </p>
              <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[0.95rem]">
                {mockupExamples.map((m) => (
                  <li key={m} className="text-ink">
                    {m}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-paper p-8 md:p-12">
              <p className="t-num text-[4.5rem] leading-none text-forest">2</p>
              <h3 className="t-h3 mt-6">A presentation video, 2–3 minutes</h3>
              <p className="mt-4 text-stone measure">
                Explain the idea, the problem, your solution, a demonstration, your target market, the business
                potential and what makes it different.
              </p>
              <Link
                href="/guidelines#video"
                className="mt-8 inline-flex items-center gap-2 border-b border-ink pb-1 font-semibold hover:border-forest hover:text-forest"
              >
                See the video roadmap
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Judging */}
      <section id="judging" aria-labelledby="judging-title" className="bg-paper-2 py-28 md:py-36">
        <div className="shell grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 id="judging-title" className="t-h2">
              Scored out of 100.
            </h2>
            <p className="mt-8 text-stone max-w-[34ch]">
              EIC officers score every eligible entry independently. Their scores are averaged. There’s no separate
              finalist round.
            </p>
            <Link
              href="/guidelines#judging"
              className="mt-8 inline-flex border-b border-ink pb-1 font-semibold hover:border-forest hover:text-forest"
            >
              How judging works
            </Link>
          </div>
          <div className="lg:col-span-8">
            <RubricBar detailed={false} />
          </div>
        </div>
      </section>

      {/* Prize */}
      <section id="prize" aria-labelledby="prize-title" className="surface-dark grain overflow-hidden py-28 md:py-36">
        <div className="shell grid items-center gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <h2 id="prize-title" className="sr-only">
              Grand prize
            </h2>
            <p className="t-num text-[clamp(7rem,24vw,22rem)] leading-[0.8] tracking-[-0.06em] text-paper" aria-hidden>
              $75
            </p>
            <p className="t-h3 mt-6 text-paper">{competition.prize.label}</p>
            <p className="mt-5 max-w-[42ch] text-silver">{competition.prize.detail}</p>
            <p className="sr-only">The grand prize is one $75 gift card.</p>
          </div>
          <div className="lg:col-span-6">
            <PrizeStage />
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section id="timeline" aria-labelledby="timeline-title" className="grain py-28 md:py-36">
        <div className="shell">
          <div className="mb-14 grid gap-6 lg:grid-cols-12">
            <h2 id="timeline-title" className="t-h2 lg:col-span-6">
              How it unfolds
            </h2>
            <p className="t-lead text-stone lg:col-span-5 lg:col-start-8 lg:self-end">
              Expect roughly 3–4 weeks to develop and submit your idea, subject to the official schedule.
            </p>
          </div>
          <Suspense fallback={<div className="h-96" />}>
            <Timeline />
          </Suspense>
        </div>
      </section>

      {/* Closing CTA */}
      <section aria-labelledby="cta-title" className="surface-dark grain blueprint py-28 md:py-36">
        <div className="shell flex flex-col items-start gap-10 md:flex-row md:items-end md:justify-between">
          <h2 id="cta-title" className="t-display max-w-[9ch] text-paper">
            Your idea goes here.
          </h2>
          <div className="flex flex-col gap-4 md:items-end">
            <Link href="/submit" className="focus-light inline-flex h-14 items-center bg-paper px-8 font-semibold text-ink hover:bg-white">
              Submit Your Idea
            </Link>
            <Link href="/faq" className="focus-light text-silver underline-offset-4 hover:text-paper hover:underline">
              Read the FAQ
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

function EligibilityGroup({ title, rules, emphasis }: { title: string; rules: readonly string[]; emphasis?: string }) {
  return (
    <div className="grid gap-4 border-t border-ink py-7 sm:grid-cols-[10rem_1fr] sm:gap-8">
      <h3 className="font-semibold">
        {title}
        {emphasis && <span className="mt-2 block t-num text-[3rem] leading-none text-forest">{emphasis}</span>}
      </h3>
      <ul className="space-y-3">
        {rules.map((r) => (
          <li key={r} className="flex gap-4 text-[1.1rem] leading-snug">
            <svg aria-hidden viewBox="0 0 16 16" className="mt-[0.3em] size-4 shrink-0 text-forest">
              <path d="M2 8.5 6 12 14 3.5" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}
