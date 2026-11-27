/**
 * Original EIC typographic wordmark, built for this challenge site.
 * It is not an official Liberty High School or EIC logo.
 * The "I" carries a square "spark" — an idea sitting on a structure.
 */
export function Wordmark({ className = "", title = "EIC Innovation Challenge" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 92 40" className={className} role="img" aria-label={title} fill="currentColor">
      {/* E */}
      <rect x="0" y="6" width="7" height="34" />
      <rect x="0" y="6" width="24" height="7" />
      <rect x="0" y="19.5" width="19" height="7" />
      <rect x="0" y="33" width="24" height="7" />
      {/* I with spark */}
      <rect x="32" y="12" width="7" height="28" />
      <rect x="32" y="0" width="7" height="7" className="text-emerald" fill="var(--color-emerald)" />
      {/* C as an open, machined bracket */}
      <path d="M92 6H54a7 7 0 0 0-7 7v20a7 7 0 0 0 7 7h38v-7H55V13h37z" />
    </svg>
  );
}
