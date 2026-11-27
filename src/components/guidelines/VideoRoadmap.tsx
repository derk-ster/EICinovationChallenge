"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { videoRoadmap } from "@/content/competition";

/** Suggested pacing only. The rule is the 2–3 minute total, not these splits. */
const pace = [15, 25, 30, 40, 20, 25, 25];
const total = pace.reduce((a, b) => a + b, 0);

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export function VideoRoadmap() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const id = useId();
  const starts = pace.map((_, i) => pace.slice(0, i).reduce((a, b) => a + b, 0));
  const step = videoRoadmap[active];

  const onKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + pace.length) % pace.length;
    setActive(n);
    document.getElementById(`${id}-tab-${n}`)?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Video sections in order" className="flex w-full flex-col gap-px bg-rule-dark md:flex-row">
        {videoRoadmap.map((s, i) => {
          const selected = i === active;
          return (
            <button
              key={s.title}
              id={`${id}-tab-${i}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(e) => onKey(e, i)}
              style={{ flexGrow: pace[i] }}
              className={`focus-light group relative flex basis-0 items-center gap-3 px-4 py-4 text-left transition-colors duration-300 md:flex-col md:items-start md:gap-6 md:py-5 ${selected ? "bg-emerald text-ink" : "bg-ink-2 text-silver hover:bg-ink-3 hover:text-paper"}`}
            >
              <span className="t-num text-[1.1rem]">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-[0.95rem] font-semibold leading-tight [font-stretch:88%]">{s.title}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 hidden justify-between t-small text-mist md:flex" aria-hidden>
        {starts.map((s, i) => (
          <span key={i} style={{ flexGrow: pace[i] }} className="basis-0">
            {clock(s)}
          </span>
        ))}
        <span>{clock(total)}</span>
      </div>

      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${active}`} className="mt-10 min-h-[11rem]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={active}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="grid gap-6 md:grid-cols-12"
          >
            <p className="t-h2 text-paper md:col-span-7">{step.question}</p>
            <div className="md:col-span-4 md:col-start-9">
              <p className="text-silver">{step.tip}</p>
              <p className="mt-4 t-small text-mist">
                Suggested: around {pace[active]} seconds ({clock(starts[active])}–{clock(starts[active] + pace[active])})
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="mt-8 t-small text-mist">
        Timings are a suggested pace for a 3-minute video. The only requirement is a total length between 2 and 3
        minutes that covers all seven parts.
      </p>
    </div>
  );
}
