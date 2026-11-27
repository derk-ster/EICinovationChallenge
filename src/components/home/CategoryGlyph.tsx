import type { CategoryId } from "@/content/competition";

/** Line drawings matching the 3D category objects, for the non-WebGL view. */
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
      return (
        <svg {...common}>
          <path d="M45 70 L100 50 L155 70 L100 90 Z" />
          <path d="M45 70 V112 L100 132 L155 112 V70 M100 90 V132" />
          <path d="M45 88 L100 108 L155 88" stroke="#52b78b" strokeWidth="5" opacity="0.9" />
          <path d="M60 52 L100 38 L140 52 L100 66 Z" opacity="0.7" />
          <circle cx="128" cy="104" r="5" />
        </svg>
      );
    case "website-app":
      return (
        <svg {...common}>
          <rect x="70" y="20" width="96" height="64" opacity="0.4" />
          <rect x="55" y="36" width="96" height="64" opacity="0.65" />
          <rect x="38" y="54" width="96" height="64" fill="#222326" />
          <rect x="48" y="66" width="40" height="8" fill="#1d5c45" stroke="#52b78b" />
          <path d="M48 84 H108 M48 94 H96" />
          <rect x="100" y="102" width="24" height="9" stroke="#52b78b" />
        </svg>
      );
    case "business-startup":
      return (
        <svg {...common}>
          <path d="M30 130 H170" />
          {[22, 38, 54, 76, 100].map((h, i) => (
            <rect key={i} x={40 + i * 26} y={130 - h} width="16" height={h} stroke={i === 4 ? "#52b78b" : undefined} fill={i === 4 ? "#1d5c45" : "none"} />
          ))}
          <path d="M44 100 L74 86 L100 74 L126 52 L152 26" strokeDasharray="3 4" opacity="0.6" />
        </svg>
      );
    case "service":
      return (
        <svg {...common}>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2;
            const x = 100 + Math.cos(a) * 58;
            const y = 80 + Math.sin(a) * 44;
            const a2 = ((i + 1) / 6) * Math.PI * 2;
            return (
              <g key={i}>
                <path d={`M${x.toFixed(1)} ${y.toFixed(1)} L${(100 + Math.cos(a2) * 58).toFixed(1)} ${(80 + Math.sin(a2) * 44).toFixed(1)} M${x.toFixed(1)} ${y.toFixed(1)} L100 80`} opacity="0.55" />
                <circle cx={x.toFixed(1)} cy={y.toFixed(1)} r="7" fill="#222326" />
              </g>
            );
          })}
          <circle cx="100" cy="80" r="13" fill="#1d5c45" stroke="#52b78b" />
        </svg>
      );
    case "software-tool":
      return (
        <svg {...common}>
          <rect x="52" y="32" width="96" height="96" fill="#222326" />
          <rect x="78" y="58" width="44" height="44" />
          <rect x="91" y="71" width="18" height="18" fill="#1d5c45" stroke="#52b78b" />
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={`M${64 + i * 18} 32 V22 M${64 + i * 18} 128 V138 M52 ${44 + i * 18} H42 M148 ${44 + i * 18} H158`} />
          ))}
        </svg>
      );
    case "improvement":
      return (
        <svg {...common}>
          <path d="M30 80 L50 52 L76 60 L82 92 L58 110 L34 100 Z" fill="#222326" />
          <path d="M50 52 L58 80 L82 92 M58 80 L34 100 M58 80 L30 80" opacity="0.6" />
          <path d="M96 80 H120 M114 74 L120 80 L114 86" stroke="#52b78b" />
          <circle cx="152" cy="80" r="28" />
          <path d="M136 68 a20 20 0 0 1 16 -8" opacity="0.8" />
        </svg>
      );
  }
}
