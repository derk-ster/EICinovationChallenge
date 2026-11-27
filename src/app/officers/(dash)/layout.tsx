import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireOfficer } from "@/lib/server/auth";
import { getStore } from "@/lib/server/store";
import { signOutAction } from "../actions";

export const metadata: Metadata = { title: "Officer dashboard", robots: { index: false, follow: false } };

export default function DashLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-paper pt-16">
      <Suspense fallback={<div className="shell py-24 text-stone">Checking your officer session…</div>}>
        <Chrome>{children}</Chrome>
      </Suspense>
    </div>
  );
}

async function Chrome({ children }: { children: React.ReactNode }) {
  const officer = await requireOfficer();
  const local = getStore().kind === "local";
  const links = [
    { href: "/officers", label: "Overview" },
    { href: "/officers/entries", label: "Entries" },
    ...(officer.role === "admin"
      ? [
          { href: "/officers/rankings", label: "Rankings" },
          { href: "/officers/settings", label: "Settings" },
        ]
      : []),
  ];
  return (
    <>
      {local && (
        <div className="bg-amber/15 text-amber">
          <p className="shell py-2 t-small font-semibold">
            Local development storage — fictional test data only. Configure Supabase before real entries are accepted.
          </p>
        </div>
      )}
      <div className="border-b border-rule bg-paper-2">
        <div className="shell flex flex-wrap items-center gap-x-8 gap-y-2 py-3">
          <nav aria-label="Officer" className="flex flex-wrap gap-6">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="font-semibold text-stone hover:text-ink">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4 t-small">
            <span className="text-stone">
              {officer.displayName} ({officer.role === "admin" ? "Administrator" : "Judge"})
            </span>
            <form action={signOutAction}>
              <button type="submit" className="font-semibold underline underline-offset-4">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
      <main className="shell py-12">{children}</main>
    </>
  );
}
