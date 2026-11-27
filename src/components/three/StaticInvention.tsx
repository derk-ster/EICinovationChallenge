/**
 * Lightweight, non-WebGL rendering of the finished drone, drawn as a
 * blueprint. Used on phones, with reduced motion, when effects are off and
 * when WebGL isn't available.
 */
export function StaticInvention({ className = "" }: { className?: string }) {
  const motors = [
    { x: 112, y: 150 },
    { x: 368, y: 150 },
    { x: 142, y: 262 },
    { x: 338, y: 262 },
  ];
  return (
    <svg viewBox="0 0 480 400" className={className} aria-hidden fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* ground ring */}
      <ellipse cx="240" cy="330" rx="170" ry="34" stroke="#52b78b" strokeWidth="0.9" strokeDasharray="4 6" opacity="0.7" />
      <g stroke="#b7babe" strokeWidth="1.3">
        {/* arms */}
        {motors.map((m, i) => (
          <path key={`a${i}`} d={`M240 206 L${m.x} ${m.y}`} strokeWidth="9" stroke="#2c2e32" />
        ))}
        {motors.map((m, i) => (
          <path key={`al${i}`} d={`M240 206 L${m.x} ${m.y}`} opacity="0.6" />
        ))}
        {/* landing gear */}
        <path d="M205 228 L188 296 M188 296 H292 M275 228 L292 296" />
        <path d="M218 232 L206 304 M206 304 H306 M262 232 L306 304" opacity="0.55" />
        {/* body + battery + canopy */}
        <rect x="196" y="176" width="88" height="62" rx="24" fill="#2c2e32" />
        <rect x="200" y="228" width="80" height="18" rx="6" fill="#222326" />
        <rect x="214" y="180" width="52" height="36" rx="16" fill="#1d5c45" stroke="#52b78b" />
        {/* gimbal camera */}
        <circle cx="240" cy="258" r="13" fill="#222326" />
        <circle cx="240" cy="258" r="6" stroke="#52b78b" />
        {/* motors + spinning props */}
        {motors.map((m, i) => (
          <g key={`m${i}`}>
            <ellipse cx={m.x} cy={m.y - 14} rx="72" ry="20" strokeDasharray="2 5" opacity="0.7" />
            <path d={`M${m.x - 62} ${m.y - 20} L${m.x + 62} ${m.y - 8}`} stroke={i < 2 ? "#52b78b" : "#b7babe"} strokeWidth="2.2" />
            <rect x={m.x - 11} y={m.y - 14} width="22" height="16" rx="4" fill="#2c2e32" />
          </g>
        ))}
      </g>
    </svg>
  );
}
