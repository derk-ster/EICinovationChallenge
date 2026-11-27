"use client";

import { useSyncExternalStore } from "react";

/**
 * Visitor preference for heavy visual effects (3D, smooth scrolling).
 * "auto" follows the device; "off" forces the lightweight fallbacks.
 * Stored in localStorage as a convenience only; the site works without it.
 */
export type EffectsPref = "auto" | "off";
const KEY = "eic-effects";
const listeners = new Set<() => void>();

function read(): EffectsPref {
  try {
    return localStorage.getItem(KEY) === "off" ? "off" : "auto";
  } catch {
    return "auto";
  }
}

export function setEffectsPref(v: EffectsPref) {
  try {
    if (v === "off") localStorage.setItem(KEY, "off");
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable: preference lasts for this page only */
  }
  document.documentElement.classList.toggle("effects-off", v === "off");
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", cb);
  };
}

export function useEffectsPref(): EffectsPref {
  return useSyncExternalStore(subscribe, read, () => "auto");
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** True when motion-heavy effects should run: no reduced-motion preference and effects not turned off. */
export function useMotionAllowed(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => !prefersReducedMotion() && read() !== "off",
    () => false,
  );
}

export type GlTier = "none" | "low" | "high";

/**
 * Decides how much real-time 3D this device gets.
 * none → static illustration (reduced motion, effects off, no WebGL, phones/small screens)
 * low  → simplified materials, DPR 1, fewer particles (e.g. Chromebooks, 4-core machines)
 * high → full scene
 */
export function detectGlTier(): GlTier {
  if (typeof window === "undefined") return "none";
  if (prefersReducedMotion() || read() === "off") return "none";
  const small = window.matchMedia("(max-width: 767px)").matches;
  const coarseOnly = window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches;
  if (small || coarseOnly) return "none";
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") || c.getContext("webgl");
    if (!gl) return "none";
    const lose = (gl as WebGLRenderingContext).getExtension("WEBGL_lose_context");
    lose?.loseContext();
  } catch {
    return "none";
  }
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 8;
  if (cores <= 4 || mem <= 4) return "low";
  return "high";
}

const tierListeners = new Set<() => void>();
let cachedTier: GlTier | null = null;

function subscribeTier(cb: () => void) {
  tierListeners.add(cb);
  const unsub = subscribe(() => {
    cachedTier = null;
    cb();
  });
  const onResize = () => {
    const next = detectGlTier();
    if (next !== cachedTier) {
      cachedTier = next;
      cb();
    }
  };
  window.addEventListener("resize", onResize);
  return () => {
    tierListeners.delete(cb);
    unsub();
    window.removeEventListener("resize", onResize);
  };
}

export function useGlTier(): GlTier | null {
  return useSyncExternalStore(
    subscribeTier,
    () => (cachedTier ??= detectGlTier()),
    () => null,
  );
}
