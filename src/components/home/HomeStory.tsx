"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { competition, hero } from "@/content/competition";
import { useGlTier, useMotionAllowed } from "@/lib/client/effects";
import { StaticInvention } from "@/components/three/StaticInvention";
import { Magnetic } from "@/components/ui/Magnetic";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const InventionScene = dynamic(() => import("@/components/three/InventionScene"), { ssr: false });

const stages = [
  {
    title: "It starts as pieces.",
    body: "A problem you keep running into. A sketch in the margin of a notebook. A question nobody around you has answered yet.",
  },
  {
    title: "Give it a shape.",
    body: "Draw it, model it, mock it up, or build a rough version. A prototype doesn’t have to work perfectly. It has to show the idea.",
  },
  {
    title: "Make the case.",
    body: "Record a 2–3 minute video: the problem, how your solution works, who it’s for, and why it could succeed.",
  },
  {
    title: "Now it’s real.",
    body: "Submit it to the EIC Innovation Challenge. Officers score every eligible entry, and the top score wins the $75 grand prize.",
  },
];

const headlineLines = ["Turn your idea", "into something", "real."];

export function HomeStory({ status }: { status: ReactNode }) {
  const root = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const intro = useRef(0);
  const tier = useGlTier();
  const motion = useMotionAllowed();
  const [active, setActive] = useState(true);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const use3d = tier !== null && tier !== "none" && !failed;

  useGSAP(
    () => {
      const st = ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: (self) => {
          progress.current = self.progress;
          gsap.set("[data-rail]", { scaleY: self.progress });
        },
      });
      const vis = ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => setActive(self.isActive),
      });

      if (!motion) {
        intro.current = 1;
        return () => {
          st.kill();
          vis.kill();
        };
      }

      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
      const introState = { v: 0 };
      tl.to(introState, { v: 1, duration: 2.6, ease: "power3.out", onUpdate: () => (intro.current = introState.v) }, 0)
        .fromTo("[data-hero-kicker]", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1 }, 0.15)
        .fromTo("[data-hero-line] > span", { yPercent: 112 }, { yPercent: 0, duration: 1.25, stagger: 0.09 }, 0.22)
        .set("[data-hero-headline]", { autoAlpha: 1 }, 0.22)
        .fromTo("[data-hero-sub]", { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 1.1 }, 0.7)
        .fromTo("[data-hero-cta]", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08 }, 0.85)
        .fromTo("[data-hero-fact]", { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.07 }, 1.0);

      gsap.utils.toArray<HTMLElement>("[data-stage]").forEach((el) => {
        gsap.fromTo(
          el.querySelectorAll("[data-stage-item]"),
          { autoAlpha: 0, y: 28 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            stagger: 0.08,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 68%", end: "bottom 30%", toggleActions: "play reverse play reverse" },
          },
        );
      });

      return () => {
        st.kill();
        vis.kill();
      };
    },
    { scope: root, dependencies: [motion] },
  );

  return (
    <section ref={root} aria-label="Introduction" className="relative surface-dark grain">
      {/* Sticky visual layer behind the copy */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="sticky top-0 h-svh w-full overflow-hidden blueprint">
          {use3d && (
            <div className={`absolute inset-0 transition-opacity duration-[1400ms] ${ready ? "opacity-100" : "opacity-0"}`}>
              <InventionScene
                tier={tier}
                progress={progress}
                intro={intro}
                active={active}
                eventSource={root}
                onReady={() => setReady(true)}
                onFallback={() => setFailed(true)}
              />
            </div>
          )}
          {tier !== null && !use3d && (
            <StaticInvention className="absolute right-[4%] top-1/2 hidden h-[78vh] max-h-[720px] -translate-y-[46%] md:block" />
          )}
          {/* Scroll rail for the assembly sequence */}
          <div className="absolute bottom-10 right-[var(--gutter)] hidden h-40 w-px bg-rule-dark md:block">
            <div data-rail className="h-full w-full origin-top scale-y-0 bg-emerald" />
          </div>
        </div>
      </div>

      <div className="relative">
        {/* Hero */}
        <div className="shell flex min-h-svh flex-col pt-24 pb-8 md:pt-28">
          <p data-reveal data-hero-kicker className="t-wordmark uppercase text-[clamp(0.95rem,1.5vw,1.3rem)] text-silver">
            {competition.name}
          </p>
          <h1 data-reveal data-hero-headline className="t-display mt-5 max-w-[11ch] text-paper md:mt-6">
            {headlineLines.map((line) => (
              <span key={line} data-hero-line className="line-mask">
                <span>{line}</span>
              </span>
            ))}
          </h1>
          <div className="mt-8 grid gap-6 md:max-w-[34rem]">
            <p data-reveal data-hero-sub className="t-lead text-silver">
              {hero.supporting}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <span data-reveal data-hero-cta>
                <Magnetic>
                  <Link
                    href="/submit"
                    className="focus-light inline-flex h-14 items-center bg-paper px-7 text-[1.02rem] font-semibold text-ink transition-colors hover:bg-white"
                  >
                    Submit Your Idea
                  </Link>
                </Magnetic>
              </span>
              <span data-reveal data-hero-cta>
                <Link
                  href="#overview"
                  className="focus-light inline-flex h-14 items-center border border-rule-dark px-7 text-[1.02rem] font-medium text-paper transition-colors hover:border-silver"
                >
                  Explore the Challenge
                </Link>
              </span>
            </div>
            <div data-reveal data-hero-cta className="t-small text-mist">
              {status}
            </div>
          </div>

          <ul className="mt-auto grid grid-cols-2 border-t border-rule-dark pt-6 md:grid-cols-4 md:pt-7">
            {hero.facts.map((fact, i) => (
              <li
                key={fact}
                data-reveal
                data-hero-fact
                className={`py-3 pr-4 text-[0.98rem] font-medium leading-snug text-paper md:py-0 ${i > 0 ? "md:border-l md:border-rule-dark md:pl-6" : ""} ${i % 2 === 1 ? "border-l border-rule-dark pl-4 md:pl-6" : ""}`}
              >
                {fact}
              </li>
            ))}
          </ul>
        </div>

        {/* Assembly sequence */}
        <div className="shell pb-16 md:pb-0">
          {stages.map((stage, i) => (
            <div key={stage.title} data-stage className="flex items-center py-8 md:min-h-[85svh] md:py-20">
              <div className="max-w-[34rem] border-l border-rule-dark pl-6 md:border-0 md:pl-0">
                <p data-stage-item className="t-num text-[1.05rem] text-emerald" aria-hidden>
                  {String(i + 1).padStart(2, "0")} / {String(stages.length).padStart(2, "0")}
                </p>
                <h2 data-stage-item className="t-h2 mt-4 text-paper">
                  {stage.title}
                </h2>
                <p data-stage-item className="t-lead mt-6 text-silver">
                  {stage.body}
                </p>
                {i === stages.length - 1 && (
                  <StaticInvention className="mt-8 h-60 w-auto max-w-full md:hidden" />
                )}
                {i === stages.length - 1 && (
                  <div data-stage-item className="mt-10">
                    <Link
                      href="/submit"
                      className="focus-light inline-flex h-14 items-center bg-paper px-7 font-semibold text-ink hover:bg-white"
                    >
                      Submit Your Idea
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
