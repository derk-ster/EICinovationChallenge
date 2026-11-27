import Link from "next/link";
import { Suspense } from "react";
import { Wordmark } from "./Wordmark";
import { MobileMenu } from "./MobileMenu";
import { NavSubmit, NavSubmitFallback } from "./NavSubmit";
import { navItems } from "./nav-items";

export function SiteHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 surface-dark border-b border-rule-dark/70">
      <div className="shell flex h-16 items-center gap-6">
        <Link href="/" className="focus-light flex items-center gap-3 shrink-0" aria-label="EIC Innovation Challenge home">
          <Wordmark className="h-[22px] w-auto text-paper" />
          <span className="hidden sm:block text-[0.8rem] leading-[1.05] text-mist font-medium [font-stretch:90%]">
            Innovation
            <br />
            Challenge
          </span>
        </Link>
        <nav aria-label="Main" className="hidden lg:block ml-auto">
          <ul className="flex items-center gap-7 text-[0.92rem]">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="focus-light text-silver hover:text-paper transition-colors duration-200">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto lg:ml-4 flex items-center gap-3">
          <Suspense fallback={<NavSubmitFallback />}>
            <NavSubmit />
          </Suspense>
          <Suspense fallback={<span className="block size-10 lg:hidden" aria-hidden />}>
            <MobileMenu items={navItems} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
