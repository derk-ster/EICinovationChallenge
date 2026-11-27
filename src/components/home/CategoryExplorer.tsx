"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { categories, type CategoryId } from "@/content/competition";
import { useGlTier } from "@/lib/client/effects";
import { CategoryGlyph } from "./CategoryGlyph";

const CategoryScene = dynamic(() => import("@/components/three/CategoryScene"), { ssr: false });

export function CategoryExplorer() {
  const [active, setActive] = useState<CategoryId>(categories[0].id);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tier = useGlTier();
  const reduce = useReducedMotion();
  const baseId = useId();
  const current = categories.find((c) => c.id === active)!;
  const use3d = tier === "high" || tier === "low";

  // Load the 3D stage only when it approaches the viewport; pause it when off-screen.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
        if (entry.isIntersecting) setNear(true);
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const next = e.key === "ArrowDown" || e.key === "ArrowRight" ? i + 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? i - 1 : null;
    const target = e.key === "Home" ? 0 : e.key === "End" ? categories.length - 1 : next;
    if (target === null) return;
    e.preventDefault();
    const idx = (target + categories.length) % categories.length;
    setActive(categories[idx].id);
    tabRefs.current[idx]?.focus();
  };

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
      <div role="tablist" aria-orientation="vertical" aria-label="Project categories" className="lg:col-span-5 border-t border-rule-dark">
        {categories.map((c, i) => {
          const selected = c.id === active;
          return (
            <button
              key={c.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              id={`${baseId}-tab-${c.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${baseId}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(c.id)}
              onPointerEnter={(e) => e.pointerType === "mouse" && setActive(c.id)}
              onKeyDown={(e) => onKey(e, i)}
              className="focus-light group relative flex w-full items-baseline gap-5 border-b border-rule-dark py-5 text-left"
            >
              <span
                aria-hidden
                className={`absolute left-0 top-0 h-full w-[3px] origin-top bg-emerald transition-transform duration-500 ease-[var(--ease-out-expo)] ${selected ? "scale-y-100" : "scale-y-0"}`}
              />
              <span
                className={`t-h3 transition-[color,transform] duration-500 ease-[var(--ease-out-expo)] ${selected ? "translate-x-5 text-paper" : "text-mist group-hover:text-silver"}`}
              >
                {c.title}
              </span>
            </button>
          );
        })}
      </div>

      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${active}`}
        className="lg:col-span-7 lg:pl-8"
      >
        <div ref={stageRef} className="relative aspect-[5/4] w-full border border-rule-dark bg-ink-2 blueprint sm:aspect-[16/10]">
          {use3d && near ? (
            <CategoryScene tier={tier} activeId={active} running={visible} />
          ) : (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                initial={reduce ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 grid place-items-center p-8"
              >
                <CategoryGlyph id={active} className="h-full max-h-64 w-auto" />
              </motion.div>
            </AnimatePresence>
          )}
        </div>
        <div className="mt-6 grid gap-2 sm:grid-cols-[1fr_1.2fr] sm:gap-8" aria-live="polite">
          <p className="text-paper text-[1.15rem] font-medium leading-snug">{current.short}</p>
          <p className="text-silver">
            <span className="text-mist">For example: </span>
            {current.example}
          </p>
        </div>
      </div>
    </div>
  );
}
