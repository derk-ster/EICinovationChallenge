"use client";

import { useEffect, useRef, useState } from "react";

const steps = [
  { x: 40, y: 200, label: "Idea" },
  { x: 150, y: 168, label: "Prototype" },
  { x: 260, y: 112, label: "Pitch video" },
  { x: 370, y: 40, label: "$75 prize" },
];

/** An upward trend from idea to prize that draws itself when it scrolls into view. */
export function CtaTrend() {
  const ref = useRef<SVGSVGElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShown(true), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const d = `M${steps.map((s) => `${s.x} ${s.y}`).join(" L")}`;
  return (
    <svg ref={ref} viewBox="0 0 420 240" className={`cta-trend w-full max-w-md ${shown ? "is-shown" : ""}`} role="img" aria-label="An upward path from idea to prototype to pitch video to the $75 prize">
      {[60, 120, 180].map((y) => (
        <line key={y} x1="0" x2="420" y1={y} y2={y} stroke="#3b3d42" strokeDasharray="3 6" />
      ))}
      <path d={`${d} L370 240 L40 240 Z`} className="cta-trend-area" fill="#52b78b" />
      <path d={d} pathLength={1} className="cta-trend-line" fill="none" stroke="#52b78b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M352 38 L372 38 L370 58" className="cta-trend-head" fill="none" stroke="#52b78b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {steps.map((s, i) => (
        <g key={s.label} className="cta-trend-step" style={{ transitionDelay: `${0.25 + i * 0.28}s` }}>
          <circle cx={s.x} cy={s.y} r={i === steps.length - 1 ? 7 : 5} fill={i === steps.length - 1 ? "#52b78b" : "#1b1c1e"} stroke="#52b78b" strokeWidth="2" />
          <text x={s.x} y={s.y + (i === steps.length - 1 ? -16 : 26)} textAnchor={i === 0 ? "start" : i === steps.length - 1 ? "end" : "middle"} fill={i === steps.length - 1 ? "#ecebe6" : "#9da1a6"} fontSize={i === steps.length - 1 ? 18 : 14} fontWeight={i === steps.length - 1 ? 700 : 500}>
            {s.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
