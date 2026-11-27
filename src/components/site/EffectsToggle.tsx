"use client";

import { setEffectsPref, useEffectsPref } from "@/lib/client/effects";

export function EffectsToggle() {
  const pref = useEffectsPref();
  const off = pref === "off";
  return (
    <div>
      <button
        type="button"
        role="switch"
        aria-checked={off}
        onClick={() => {
          setEffectsPref(off ? "auto" : "off");
          // Reload so every scene and scroll effect picks up the change cleanly.
          window.location.reload();
        }}
        className="focus-light group flex items-center gap-3 text-silver hover:text-paper"
      >
        <span
          aria-hidden
          className={`relative h-5 w-9 border border-rule-dark transition-colors ${off ? "bg-emerald/80" : "bg-ink-3"}`}
        >
          <span className={`absolute top-[3px] size-3 bg-paper transition-[left] duration-200 ${off ? "left-[19px]" : "left-[3px]"}`} />
        </span>
        <span className="t-small">Reduce visual effects</span>
      </button>
      <p className="mt-2 t-small text-mist">Turns off 3D and smooth scrolling on this device.</p>
    </div>
  );
}
