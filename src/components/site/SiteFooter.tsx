import Link from "next/link";
import { competition } from "@/content/competition";
import { Wordmark } from "./Wordmark";
import { EffectsToggle } from "./EffectsToggle";

export function SiteFooter() {
  return (
    <footer className="surface-dark grain border-t border-rule-dark">
      <div className="shell grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Wordmark className="h-9 w-auto text-paper" />
          <p className="mt-6 max-w-sm text-silver">
            The {competition.name} is organized by the {competition.club} at {competition.school}.
          </p>
          <p className="mt-4 max-w-sm t-small text-mist">
            The EIC wordmark on this site was designed for the challenge and is not an official school logo.
          </p>
        </div>
        <nav aria-label="Footer" className="md:col-span-4 grid grid-cols-2 gap-x-8 gap-y-3 text-silver">
          <Link className="focus-light hover:text-paper" href="/#overview">Overview</Link>
          <Link className="focus-light hover:text-paper" href="/guidelines">Requirements</Link>
          <Link className="focus-light hover:text-paper" href="/#categories">Categories</Link>
          <Link className="focus-light hover:text-paper" href="/guidelines#judging">Judging</Link>
          <Link className="focus-light hover:text-paper" href="/#timeline">Timeline</Link>
          <Link className="focus-light hover:text-paper" href="/guidelines#rules">Rules</Link>
          <Link className="focus-light hover:text-paper" href="/faq">FAQ</Link>
          <Link className="focus-light hover:text-paper" href="/submit">Submit</Link>
        </nav>
        <div className="md:col-span-3 space-y-6">
          <EffectsToggle />
          <Link href="/officers" className="focus-light block t-small text-mist hover:text-paper">
            Officer sign-in
          </Link>
        </div>
      </div>
    </footer>
  );
}
