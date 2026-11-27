"use client";

import { useSyncExternalStore } from "react";

// One shared one-second clock for every countdown on the page.
let now = 0;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
function subscribe(cb: () => void) {
  listeners.add(cb);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      listeners.forEach((l) => l());
    }, 1000);
  }
  return () => {
    listeners.delete(cb);
    if (!listeners.size && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}
const getSnapshot = () => now || Date.now();
const getServerSnapshot = () => 0;

/** Only rendered when a real deadline has been configured by officers. */
export function Countdown({ to, tone = "dark" }: { to: string; tone?: "dark" | "light" }) {
  const t = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (!t) return <div className="h-[4.5rem]" aria-hidden />;
  const ms = Math.max(0, Date.parse(to) - t);
  const parts = [
    { label: "days", v: Math.floor(ms / 86_400_000) },
    { label: "hours", v: Math.floor(ms / 3_600_000) % 24 },
    { label: "minutes", v: Math.floor(ms / 60_000) % 60 },
    { label: "seconds", v: Math.floor(ms / 1000) % 60 },
  ];
  const muted = tone === "dark" ? "text-mist" : "text-stone";
  return (
    <div role="timer" aria-label={`${parts[0].v} days and ${parts[1].v} hours until the deadline`}>
      <dl className="flex gap-6 sm:gap-10" aria-hidden>
        {parts.map((p) => (
          <div key={p.label} className="flex flex-col-reverse">
            <dt className={`mt-1 t-small ${muted}`}>{p.label}</dt>
            <dd className="t-num text-[clamp(2.25rem,5vw,3.5rem)] leading-none">{String(p.v).padStart(2, "0")}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
