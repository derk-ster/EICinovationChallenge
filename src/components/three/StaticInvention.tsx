/**
 * Lightweight, non-WebGL rendering of the assembled invention, drawn as a
 * blueprint. Used on phones, with reduced motion, when effects are off and
 * when WebGL isn't available.
 */
export function StaticInvention({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 480" className={className} aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
      <g stroke="#9da1a6" strokeWidth="0.8" strokeDasharray="4 5" opacity="0.55">
        <path d="M40 405 L200 350 L360 405 L200 460 Z" />
        <path d="M40 405 V140 M360 405 V140 M200 460 V195 M200 350 V85" />
        <path d="M40 140 L200 85 L360 140 L200 195 Z" />
        <ellipse cx="200" cy="410" rx="178" ry="52" stroke="#52b78b" opacity="0.8" />
      </g>
      <g stroke="#b7babe" strokeWidth="1.3">
        {/* base plate */}
        <path d="M55 400 L200 352 L345 400 L200 448 Z" fill="#2c2e32" />
        <path d="M55 400 V410 L200 458 L345 410 V400" />
        <path d="M200 448 V458" />
        {/* plinth */}
        <path d="M120 393 L200 366 L280 393 L200 420 Z" fill="#222326" />
        {/* struts */}
        <path d="M148 386 V246 M252 386 V246 M200 404 V262 M200 368 V232" />
        {/* gear */}
        <ellipse cx="200" cy="318" rx="74" ry="21" fill="#2c2e32" />
        <path
          d="M128 314 l-6 4 M139 304 l-5 -4 M160 299 l-2 -5 M184 297 v-5 M208 297 l1 -5 M232 299 l3 -5 M255 304 l5 -4 M270 312 l7 2 M270 324 l7 3 M255 332 l5 4 M232 337 l3 5 M208 339 l1 5 M184 339 v5 M160 337 l-2 5 M139 332 l-5 4"
          opacity="0.8"
        />
        <ellipse cx="200" cy="318" rx="17" ry="5" />
        {/* deck */}
        <ellipse cx="200" cy="240" rx="98" ry="28" fill="#1d5c45" stroke="#52b78b" />
        <path d="M102 240 v6 a98 28 0 0 0 196 0 v-6" stroke="#52b78b" />
        {/* core + rings */}
        <circle cx="200" cy="178" r="46" fill="#2c2e32" />
        <path d="M172 158 a34 34 0 0 1 30 -16" stroke="#ecebe6" strokeWidth="2" opacity="0.8" />
        <ellipse cx="200" cy="178" rx="84" ry="22" transform="rotate(-12 200 178)" />
        <ellipse cx="200" cy="178" rx="66" ry="14" transform="rotate(18 200 178)" opacity="0.7" />
        {/* glass cap */}
        <path d="M200 70 L224 108 L200 146 L176 108 Z" fill="#ecebe6" fillOpacity="0.08" />
        <path d="M176 108 L224 108 M200 70 V146" opacity="0.5" />
      </g>
    </svg>
  );
}
