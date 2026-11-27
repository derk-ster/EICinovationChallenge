"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();
  const base = useId();
  return (
    <div className="border-t border-ink">
      {items.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="border-b border-rule">
            <h3>
              <button
                type="button"
                id={`${base}-q-${i}`}
                aria-expanded={isOpen}
                aria-controls={`${base}-a-${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="group flex w-full items-baseline justify-between gap-6 py-6 text-left"
              >
                <span className={`t-h3 transition-colors ${isOpen ? "text-forest" : "group-hover:text-forest"}`}>{item.q}</span>
                <span aria-hidden className="relative size-4 shrink-0 self-center">
                  <span className="absolute left-0 top-1/2 h-[2px] w-4 -translate-y-1/2 bg-current" />
                  <span
                    className={`absolute left-1/2 top-0 h-4 w-[2px] -translate-x-1/2 bg-current transition-transform duration-300 ${isOpen ? "scale-y-0" : "scale-y-100"}`}
                  />
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`${base}-a-${i}`}
                  role="region"
                  aria-labelledby={`${base}-q-${i}`}
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduce ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-[62ch] pb-7 text-[1.08rem] text-stone">{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
