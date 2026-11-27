import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getOfficer } from "@/lib/server/auth";
import { LoginForm } from "@/components/officers/LoginForm";

export const metadata: Metadata = { title: "Officer sign-in", robots: { index: false, follow: false } };

export default function OfficerLogin() {
  return (
    <main className="grain min-h-svh pt-36 pb-24">
      <div className="shell grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h1 className="t-h2">Officer sign-in</h1>
          <p className="mt-6 max-w-[36ch] text-stone">
            For authorized EIC officers only. Student entries, scores and rankings are private and never shown on the
            public site.
          </p>
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <Suspense>
            <AlreadySignedIn />
          </Suspense>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}

async function AlreadySignedIn() {
  if (await getOfficer()) redirect("/officers");
  return null;
}
