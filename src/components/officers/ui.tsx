import type { EligibilityStatus } from "@/lib/domain/types";

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "good" | "bad" | "warn" | "info"; children: React.ReactNode }) {
  const tones = {
    neutral: "border-rule text-stone",
    good: "border-forest/40 bg-forest/10 text-forest",
    bad: "border-danger/40 bg-danger/10 text-danger",
    warn: "border-amber/40 bg-amber/10 text-amber",
    info: "border-ink/20 bg-ink/5 text-ink",
  };
  return <span className={`inline-flex items-center border px-2 py-0.5 text-[0.78rem] font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

export function EligibilityBadge({ status }: { status: EligibilityStatus }) {
  if (status === "eligible") return <Badge tone="good">Eligible</Badge>;
  if (status === "ineligible") return <Badge tone="bad">Ineligible</Badge>;
  return <Badge tone="warn">Needs review</Badge>;
}

export const flagLabels: Record<string, string> = {
  "video-duration-review": "Check video length",
  "video-link-unrecognized": "Unusual video link",
  "email-unverified": "Email not verified",
  "possible-duplicate-name": "Possible duplicate",
};

export function FlagBadges({ flags }: { flags: string[] }) {
  if (!flags.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {flags.map((f) => (
        <Badge key={f} tone="warn">
          {flagLabels[f] ?? f}
        </Badge>
      ))}
    </span>
  );
}

export function PageTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-rule pb-6">
      <h1 className="t-h2 !text-[clamp(2rem,4vw,3rem)]">{title}</h1>
      {children}
    </div>
  );
}

export function Stat({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <div className="border-t-2 border-ink pt-4">
      <p className="t-small text-stone">{label}</p>
      <p className="mt-1 t-num text-[2.75rem] leading-none">{value}</p>
      {note && <p className="mt-2 t-small text-stone">{note}</p>}
    </div>
  );
}
