import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/server/crypto";
import { backend } from "@/lib/server/env";
import { guarded, jsonError } from "@/lib/server/request";
import { getStore, StoreError } from "@/lib/server/store";
import { writeLocalUpload } from "@/lib/server/store/local";

/** Local development only: receives the raw file body for a signed, single-use upload URL. */
export const PUT = guarded(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  if (backend() !== "local") return jsonError(404, "Not found.");
  const { id } = await params;
  const token = verifyToken<{ id: string }>(new URL(req.url).searchParams.get("t"), "local-upload");
  if (!token || token.id !== id) return jsonError(403, "This upload link has expired. Try again.");
  const upload = await getStore().getUpload(id);
  if (!upload || upload.status !== "pending") return jsonError(409, "This upload was already used.");
  if (!req.body) return jsonError(400, "No file received.");
  try {
    const written = await writeLocalUpload(upload.storagePath, req.body, upload.declaredSize);
    return NextResponse.json({ ok: true, size: written });
  } catch (e) {
    if (e instanceof StoreError) return jsonError(413, e.message);
    throw e;
  }
});
