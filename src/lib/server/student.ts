import "server-only";
import { cookies } from "next/headers";
import { pepperedHash, signToken, verifyToken } from "./crypto";
import { isProduction } from "./env";

/**
 * Student-side proofs, kept in httpOnly cookies:
 *  - eic_verified: the school email this browser proved it controls (2 hours).
 *  - draft token: a random id the browser sends with uploads and the final
 *    submission, so one person's upload can't be attached to someone else's entry.
 */

const VERIFIED_COOKIE = "eic_verified";
const VERIFIED_TTL = 2 * 3600;

export async function setVerifiedEmail(email: string) {
  (await cookies()).set(VERIFIED_COOKIE, signToken({ email }, VERIFIED_TTL, "email-verified"), {
    httpOnly: true,
    sameSite: "strict",
    secure: isProduction,
    path: "/",
    maxAge: VERIFIED_TTL,
  });
}

export async function getVerifiedEmail(): Promise<string | null> {
  const data = verifyToken<{ email: string }>((await cookies()).get(VERIFIED_COOKIE)?.value, "email-verified");
  return data?.email ?? null;
}

export async function clearVerifiedEmail() {
  (await cookies()).delete(VERIFIED_COOKIE);
}

const DRAFT_RE = /^[a-zA-Z0-9_-]{20,64}$/;

/** Reads the browser's draft id from the X-EIC-Draft header and returns its hash, or null if malformed. */
export function draftHash(req: Request): string | null {
  const v = req.headers.get("x-eic-draft");
  return v && DRAFT_RE.test(v) ? pepperedHash(`draft:${v}`) : null;
}
