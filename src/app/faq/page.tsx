import type { Metadata } from "next";
import Link from "next/link";
import { faq } from "@/content/competition";
import { Accordion } from "@/components/ui/Accordion";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about the EIC Innovation Challenge.",
};

export default function FaqPage() {
  return (
    <main className="grain pt-36 pb-28 md:pt-44 md:pb-36">
      <div className="shell grid gap-14 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h1 className="t-display">Questions, answered.</h1>
          <p className="mt-8 max-w-[32ch] text-stone">
            Still unsure about something? Ask an EIC officer, or read the full{" "}
            <Link href="/guidelines" className="font-semibold text-ink underline decoration-rule underline-offset-4 hover:decoration-forest">
              guidelines
            </Link>
            .
          </p>
        </div>
        <div className="lg:col-span-8">
          <Accordion items={faq} />
        </div>
      </div>
    </main>
  );
}
