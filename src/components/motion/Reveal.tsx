"use client";

import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useMotionAllowed } from "@/lib/client/effects";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Reveals direct children marked [data-r] once, as the block enters view.
 * Used only on section openers so the rest of the page stays calm.
 */
export function Reveal({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "header" }) {
  const ref = useRef<HTMLDivElement>(null);
  const allowed = useMotionAllowed();
  useGSAP(
    () => {
      if (!allowed) return;
      const items = gsap.utils.toArray<HTMLElement>("[data-r]");
      gsap.fromTo(
        items,
        { autoAlpha: 0, y: 24 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 1,
          ease: "expo.out",
          stagger: 0.08,
          scrollTrigger: { trigger: ref.current, start: "top 82%", once: true },
        },
      );
    },
    { scope: ref, dependencies: [allowed] },
  );
  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
