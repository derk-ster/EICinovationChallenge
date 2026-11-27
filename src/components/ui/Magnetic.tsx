"use client";

import { useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { useMotionAllowed } from "@/lib/client/effects";

gsap.registerPlugin(useGSAP);

/** Gently pulls its child toward the cursor (fine pointers only). Purely decorative. */
export function Magnetic({ children, strength = 0.28 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const allowed = useMotionAllowed();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el || !allowed || !window.matchMedia("(pointer: fine)").matches) return;
      const xTo = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength);
        yTo((e.clientY - (r.top + r.height / 2)) * strength);
      };
      const leave = () => {
        xTo(0);
        yTo(0);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      return () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
      };
    },
    { dependencies: [allowed], scope: ref },
  );

  return (
    <span ref={ref} className="inline-block will-change-transform">
      {children}
    </span>
  );
}
