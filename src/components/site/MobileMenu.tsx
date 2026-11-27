"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

export function MobileMenu({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const [lastPath, setLastPath] = useState(pathname);

  // Close when the route changes (derived during render, not in an effect).
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    firstLinkRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="focus-light relative z-[60] grid size-10 place-items-center text-paper"
      >
        <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
        <span aria-hidden className="relative block h-3 w-6">
          <span
            className={`absolute left-0 top-0 h-[2px] w-6 bg-current transition-transform duration-300 ${open ? "translate-y-[5px] rotate-45" : ""}`}
          />
          <span
            className={`absolute left-0 bottom-0 h-[2px] w-6 bg-current transition-transform duration-300 ${open ? "-translate-y-[5px] -rotate-45" : ""}`}
          />
        </span>
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="fixed inset-0 top-16 z-50 surface-dark grain overflow-y-auto"
      >
        <nav aria-label="Mobile" className="shell py-10">
          <ul className="space-y-1">
            {items.map((item, i) => (
              <li key={item.href} className="border-b border-rule-dark">
                <Link
                  ref={i === 0 ? firstLinkRef : undefined}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="focus-light flex items-baseline justify-between py-4 t-h3 text-paper"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href="/submit"
            onClick={() => setOpen(false)}
            className="focus-light mt-10 inline-flex h-14 items-center bg-paper px-6 font-semibold text-ink"
          >
            Submit your idea
          </Link>
        </nav>
      </div>
    </div>
  );
}
