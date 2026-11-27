import Link from "next/link";
import { getPublicState } from "@/lib/server/public";
import { windowLabel } from "./window-label";

export async function NavSubmit() {
  const state = await getPublicState();
  const label = state ? windowLabel(state.window) : { short: "Status unavailable", open: false };
  return (
    <Link
      href="/submit"
      className="focus-light group inline-flex items-center gap-2.5 h-10 pl-3.5 pr-4 bg-paper text-ink text-[0.9rem] font-semibold hover:bg-white transition-colors"
    >
      <span
        aria-hidden
        className={`size-2 rounded-full ${label.open ? "bg-forest" : "bg-stone/50"}`}
      />
      <span>
        Submit<span className="sr-only">: </span>
        <span className="hidden sm:inline font-normal text-stone border-l border-rule ml-2.5 pl-2.5">{label.short}</span>
        <span className="sm:hidden sr-only">{label.short}</span>
      </span>
    </Link>
  );
}

export function NavSubmitFallback() {
  return (
    <Link href="/submit" className="focus-light inline-flex items-center h-10 px-4 bg-paper text-ink text-[0.9rem] font-semibold">
      Submit
    </Link>
  );
}
