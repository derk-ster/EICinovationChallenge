import { NextResponse } from "next/server";
import { guarded, ipHash, jsonError, limit, sameOrigin } from "@/lib/server/request";
import { clearVerifiedEmail, draftHash, getVerifiedEmail } from "@/lib/server/student";
import { submitEntry } from "@/lib/server/submissions";

export const POST = guarded(async (req: Request) => {
  if (!sameOrigin(req)) return jsonError(403, "Request blocked.");
  const ownerHash = draftHash(req);
  if (!ownerHash) return jsonError(400, "Reload the page and try again.");
  if (!(await limit(req, "submit", 8, 3600))) return jsonError(429, "Too many attempts. Wait a while and try again.");
  const body = await req.json().catch(() => null);
  if (!body) return jsonError(400, "We couldn’t read your submission. Try again.");
  const result = await submitEntry(body, { ownerHash, verifiedEmail: await getVerifiedEmail(), ipHash: ipHash(req) });
  if (!result.ok) return jsonError(result.status, result.error, result.fieldErrors ? { fieldErrors: result.fieldErrors } : undefined);
  await clearVerifiedEmail();
  return NextResponse.json({ ok: true, ...result.data }, { status: result.data.replayed ? 200 : 201 });
});
