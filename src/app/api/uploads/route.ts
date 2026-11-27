import { NextResponse } from "next/server";
import { guarded, jsonError, limit, sameOrigin } from "@/lib/server/request";
import { draftHash, getVerifiedEmail } from "@/lib/server/student";
import { initUpload } from "@/lib/server/submissions";

/** Step 1 of an upload: validate the file and get a one-time upload URL for private storage. */
export const POST = guarded(async (req: Request) => {
  if (!sameOrigin(req)) return jsonError(403, "Request blocked.");
  const ownerHash = draftHash(req);
  if (!ownerHash) return jsonError(400, "Reload the page and try again.");
  if (!(await limit(req, "upload-init", 30, 3600))) return jsonError(429, "Too many uploads. Wait a while and try again.");
  const body = await req.json().catch(() => ({}));
  const result = await initUpload(body ?? {}, { ownerHash, verifiedEmail: await getVerifiedEmail() });
  if (!result.ok) return jsonError(result.status, result.error);
  return NextResponse.json({ ok: true, ...result.data });
});
