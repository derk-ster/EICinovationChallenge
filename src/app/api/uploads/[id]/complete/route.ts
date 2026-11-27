import { NextResponse } from "next/server";
import { guarded, jsonError, sameOrigin } from "@/lib/server/request";
import { draftHash } from "@/lib/server/student";
import { completeUpload } from "@/lib/server/submissions";

/** Step 3 of an upload: the server confirms the object exists in storage with the declared size. */
export const POST = guarded(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  if (!sameOrigin(req)) return jsonError(403, "Request blocked.");
  const ownerHash = draftHash(req);
  if (!ownerHash) return jsonError(400, "Reload the page and try again.");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(404, "Upload not found.");
  const result = await completeUpload(id, ownerHash);
  if (!result.ok) return jsonError(result.status, result.error);
  return NextResponse.json({ ok: true, ...result.data });
});
