import type { CategoryId } from "@/content/competition";

/** Line drawings matching the 3D category products, for the non-WebGL view and while 3D loads. */
export function CategoryGlyph({ id, className = "" }: { id: CategoryId; className?: string }) {
  const common = {
    viewBox: "0 0 200 160",
    className,
    fill: "none",
    stroke: "#b7babe",
    strokeWidth: 1.4,
    strokeLinejoin: "round" as const,
    strokeLinecap: "round" as const,
    "aria-hidden": true,
  };
  switch (id) {
    case "physical-product":
      // over-ear headphones
      return (
        <svg {...common}>
          <path d="M52 92 C52 40 148 40 148 92" strokeWidth="4" />
          <path d="M64 70 C78 50 122 50 136 70" stroke="#5c5f64" strokeWidth="7" />
          {[52, 148].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy="104" rx="20" ry="26" fill="#2c2e32" />
              <ellipse cx={x} cy="104" rx="12" ry="17" fill="#1d5c45" stroke="#52b78b" />
            </g>
          ))}
        </svg>
      );
    case "website-app":
      // laptop + phone
      return (
        <svg {...common}>
          <rect x="30" y="30" width="112" height="72" rx="5" fill="#222326" />
          <rect x="37" y="37" width="98" height="58" fill="#ecebe6" stroke="none" />
          <rect x="42" y="44" width="40" height="8" fill="#1b1c1e" stroke="none" />
          <rect x="42" y="58" width="24" height="7" fill="#1d5c45" stroke="none" />
          <rect x="96" y="44" width="34" height="28" fill="#b9bcc0" stroke="none" />
          <path d="M20 112 H152 L144 120 H28 Z" fill="#2c2e32" />
          <rect x="150" y="62" width="30" height="58" rx="6" fill="#222326" />
          <rect x="154" y="70" width="22" height="16" rx="3" fill="#52b78b" stroke="none" />
        </svg>
      );
    case "business-startup":
      // coin stacks with a rising trend line
      return (
        <svg {...common}>
          <path d="M24 136 H176" />
          {[2, 4, 7, 11].map((n, s) =>
            Array.from({ length: n }, (_, i) => (
              <ellipse
                key={`${s}${i}`}
                cx={52 + s * 32}
                cy={130 - i * 8}
                rx="13"
                ry="4"
                fill={s === 3 && i === n - 1 ? "#1d5c45" : "#2c2e32"}
                stroke={s === 3 && i === n - 1 ? "#52b78b" : undefined}
              />
            )),
          )}
          <path d="M30 118 C70 110 100 84 158 34" stroke="#52b78b" strokeWidth="2.4" />
          <path d="M148 32 L160 32 L158 44" stroke="#52b78b" strokeWidth="2.4" />
        </svg>
      );
    case "service":
      // service bell with a ring wave
      return (
        <svg {...common}>
          <path d="M40 120 H160 L154 130 H46 Z" fill="#2c2e32" />
          <path d="M56 116 C56 72 144 72 144 116 Z" fill="#222326" />
          <path d="M72 96 C78 84 92 80 100 80" opacity="0.7" />
          <path d="M100 66 V58 M90 56 H110" strokeWidth="2.4" />
          <path d="M30 108 C24 96 24 84 32 72 M170 108 C176 96 176 84 168 72" stroke="#52b78b" opacity="0.8" />
        </svg>
      );
    case "software-tool":
      // microcontroller board
      return (
        <svg {...common}>
          <rect x="24" y="30" width="152" height="100" rx="8" fill="#1d5c45" stroke="#52b78b" />
          <rect x="62" y="56" width="44" height="44" fill="#1b1c1e" />
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M${68 + i * 8} 56 V50 M${68 + i * 8} 100 V106 M62 ${62 + i * 8} H56 M106 ${62 + i * 8} H112`} />
          ))}
          <circle cx="132" cy="58" r="8" fill="#2c2e32" />
          <circle cx="152" cy="58" r="8" fill="#2c2e32" />
          <rect x="128" y="88" width="30" height="10" fill="#2c2e32" />
          <path d="M40 120 H160" strokeDasharray="2 4" />
          <circle cx="160" cy="112" r="3" fill="#52b78b" stroke="none" />
        </svg>
      );
    case "improvement":
      // rough bulb refining into a glowing modern bulb
      return (
        <svg {...common}>
          <path d="M42 40 L66 34 L80 52 L76 76 L64 92 L46 92 L36 76 L32 54 Z" fill="#2c2e32" />
          <path d="M46 92 V106 H64 V92" />
          <path d="M92 70 H112 M106 64 L112 70 L106 76" stroke="#52b78b" />
          <path d="M150 28 C176 28 186 54 172 76 C166 84 164 90 164 96 H136 C136 90 134 84 128 76 C114 54 124 28 150 28 Z" stroke="#ecebe6" />
          <path d="M140 66 C144 58 156 58 160 66" stroke="#52b78b" strokeWidth="2.4" />
          <path d="M136 100 H164 M138 106 H162 M141 112 H159" />
        </svg>
      );
  }
}
