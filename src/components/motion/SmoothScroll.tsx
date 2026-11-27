"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionAllowed } from "@/lib/client/effects";

gsap.registerPlugin(ScrollTrigger);

/**
 * Lenis smooth scrolling, driven by GSAP's ticker so ScrollTrigger stays in
 * sync. Off for reduced motion, when effects are disabled, and on the
 * submission form and officer dashboard where native scrolling is better.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const allowed = useMotionAllowed();
  const enabled = allowed && !pathname.startsWith("/submit") && !pathname.startsWith("/officers");

  useEffect(() => {
    if (!enabled) return;
    const lenis = new Lenis({ duration: 1.1, anchors: { offset: -72 }, autoRaf: false });
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, [enabled]);

  useEffect(() => {
    // New route: start at the top unless navigating to an anchor.
    if (!window.location.hash) window.scrollTo(0, 0);
    ScrollTrigger.refresh();
  }, [pathname]);

  return null;
}
