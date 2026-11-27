"use client";

import { useState } from "react";
import { fieldId, inputBase, Spinner } from "./fields";

/**
 * Sends a 6-digit code to the student's school email and confirms it. The
 * server then remembers the verified address in an httpOnly cookie for two hours.
 */
export function EmailVerify({
  email,
  verifiedEmail,
  onVerified,
}: {
  email: string;
  verifiedEmail: string | null;
  onVerified: (email: string) => void;
}) {
  const [phase, setPhase] = useState<"idle" | "sending" | "sent" | "checking">("idle");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const normalized = email.trim().toLowerCase();
  const verified = verifiedEmail !== null && verifiedEmail === normalized;
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);

  if (verified)
    return (
      <p className="mt-3 flex items-center gap-2 t-small font-semibold text-forest" role="status">
        <svg aria-hidden viewBox="0 0 16 16" className="size-4">
          <path d="M2 8.5 6 12 14 3.5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        Email verified
      </p>
    );

  async function send() {
    setPhase("sending");
    setMessage(null);
    const res = await fetch("/api/verify/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalized }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPhase("idle");
      setMessage({ tone: "error", text: json.error ?? "We couldn’t send a code. Try again." });
      return;
    }
    setPhase("sent");
    setMessage({ tone: "info", text: `We sent a 6-digit code to ${normalized}. It expires in 10 minutes. Check your spam folder if it doesn’t arrive.` });
  }

  async function confirm() {
    setPhase("checking");
    const res = await fetch("/api/verify/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalized, code }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPhase("sent");
      setMessage({ tone: "error", text: json.error ?? "That code didn’t work." });
      return;
    }
    setMessage(null);
    onVerified(json.email);
  }

  return (
    <div className="mt-4 border border-rule bg-paper-2/60 p-5">
      <p className="t-small text-stone">
        To protect your entry, confirm that this is your email. You’ll only need to do this once.
      </p>
      {phase === "idle" || phase === "sending" ? (
        <button
          type="button"
          onClick={send}
          disabled={!validEmail || phase === "sending"}
          className="mt-4 inline-flex h-11 items-center gap-2 bg-ink px-5 font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-40"
        >
          {phase === "sending" && <Spinner />}
          Send verification code
        </button>
      ) : (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor={fieldId("verify.code")} className="block t-small font-semibold">
              6-digit code
            </label>
            <input
              id={fieldId("verify.code")}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className={`${inputBase} mt-1 w-40 tracking-[0.3em] tabular-nums`}
            />
          </div>
          <button
            type="button"
            onClick={confirm}
            disabled={code.length !== 6 || phase === "checking"}
            className="inline-flex h-[50px] items-center gap-2 bg-ink px-5 font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-40"
          >
            {phase === "checking" && <Spinner />}
            Verify
          </button>
          <button type="button" onClick={send} className="h-[50px] px-2 t-small font-semibold underline underline-offset-4">
            Send a new code
          </button>
        </div>
      )}
      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={`mt-3 t-small ${message.tone === "error" ? "font-medium text-danger" : "text-stone"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
