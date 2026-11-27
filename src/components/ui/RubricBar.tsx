"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { rubric, rubricTotal, type RubricKey } from "@/content/competition";
import { useMotionAllowed } from "@/lib/client/effects";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * The 100-point rubric as 100 cells. Each category owns a run of cells; hover
 * or focus a category to isolate its share. Cells assemble on scroll.
 */
export function RubricBar({ tone = "light", detailed = true }: { tone?: "light" | "dark"; detailed?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [focus, setFocus] = useState<RubricKey | null>(null);
  const allowed = useMotionAllowed();
  const dark = tone === "dark";

  useGSAP(
    () => {
      if (!allowed) return;
      gsap.fromTo(
        "[data-cell]",
        { scaleY: 0, transformOrigin: "50% 100%" },
        {
          scaleY: 1,
          duration: 0.6,
          ease: "power3.out",
          stagger: { each: 0.006, from: "start" },
          scrollTrigger: { trigger: ref.current, start: "top 85%", once: true },
        },
      );
      gsap.fromTo(
        "[data-points]",
        { textContent: 0 },
        {
          textContent: (i: number, el: HTMLElement) => Number(el.dataset.points),
          duration: 1.2,
          ease: "power2.out",
          snap: { textContent: 1 },
          stagger: 0.06,
          scrollTrigger: { trigger: ref.current, start: "top 85%", once: true },
        },
      );
    },
    { scope: ref, dependencies: [allowed] },
  );

  const cells: { key: RubricKey; index: number }[] = [];
  rubric.forEach((r, ri) => {
    for (let i = 0; i < r.points; i++) cells.push({ key: r.key, index: ri });
  });

  const shade = (index: number, key: RubricKey) => {
    const isFocus = focus === null || focus === key;
    if (!isFocus) return dark ? "bg-ink-3" : "bg-paper-2";
    // Alternate two finishes so adjacent categories stay distinguishable without a rainbow.
    if (focus === key) return "bg-emerald";
    return index % 2 === 0 ? (dark ? "bg-silver" : "bg-ink") : dark ? "bg-mist/60" : "bg-stone/70";
  };

  return (
    <div ref={ref}>
      <div className="flex h-16 items-end gap-[2px] sm:h-20" aria-hidden>
        {cells.map((c, i) => (
          <div
            key={i}
            data-cell
            className={`h-full flex-1 transition-colors duration-300 ${shade(c.index, c.key)} ${i > 0 && cells[i - 1].key !== c.key ? "ml-1.5" : ""}`}
          />
        ))}
      </div>
      <div className={`mt-2 flex justify-between t-small ${dark ? "text-mist" : "text-stone"}`} aria-hidden>
        <span>0</span>
        <span>{rubricTotal} points</span>
      </div>

      <table className="mt-8 w-full border-collapse text-left">
        <caption className="sr-only">Judging rubric: six categories totaling {rubricTotal} points</caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Category</th>
            <th scope="col">What judges look for</th>
            <th scope="col">Points</th>
          </tr>
        </thead>
        <tbody>
          {rubric.map((r) => (
            <tr
              key={r.key}
              tabIndex={0}
              onPointerEnter={() => setFocus(r.key)}
              onPointerLeave={() => setFocus(null)}
              onFocus={() => setFocus(r.key)}
              onBlur={() => setFocus(null)}
              className={`group border-t ${dark ? "border-rule-dark focus-light" : "border-rule"} outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${dark ? "focus-visible:outline-emerald" : "focus-visible:outline-forest"}`}
            >
              <th scope="row" className={`py-4 pr-6 align-top font-semibold ${dark ? "text-paper" : "text-ink"} t-h3 !text-[1.15rem] sm:!text-[1.3rem]`}>
                {r.title}
              </th>
              {detailed && (
                <td className={`hidden py-4 pr-6 align-top md:table-cell ${dark ? "text-silver" : "text-stone"}`}>{r.looksFor}</td>
              )}
              <td className={`py-4 text-right align-top t-num text-[1.75rem] leading-none ${focus === r.key ? (dark ? "text-emerald" : "text-forest") : dark ? "text-paper" : "text-ink"}`}>
                <span data-points={r.points}>{r.points}</span>
              </td>
            </tr>
          ))}
          <tr className={`border-t-2 ${dark ? "border-silver" : "border-ink"}`}>
            <th scope="row" className={`py-4 font-semibold ${dark ? "text-paper" : "text-ink"}`}>
              Total
            </th>
            {detailed && <td className="hidden md:table-cell" />}
            <td className={`py-4 text-right t-num text-[1.75rem] leading-none ${dark ? "text-paper" : "text-ink"}`}>{rubricTotal}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
