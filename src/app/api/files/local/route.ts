import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { getOfficer } from "@/lib/server/auth";
import { verifyToken } from "@/lib/server/crypto";
import { backend } from "@/lib/server/env";
import { guarded, jsonError } from "@/lib/server/request";
import { resolveLocalUpload } from "@/lib/server/store/local";

/** Local development only: serves a private file for a signed, expiring link (officers only). */
export const GET = guarded(async (req: Request) => {
  if (backend() !== "local") return jsonError(404, "Not found.");
  if (!(await getOfficer())) return jsonError(401, "Sign in as an officer.");
  const t = verifyToken<{ p: string; n: string; m: string; d: number }>(new URL(req.url).searchParams.get("t"), "local-file");
  if (!t) return jsonError(403, "This link has expired. Reload the entry page.");
  const file = resolveLocalUpload(t.p);
  if (!file) return jsonError(404, "Not found.");
  const info = await stat(file).catch(() => null);
  if (!info) return jsonError(404, "File missing.");
  const name = (t.n || "file").replace(/[^\w.\- ]+/g, "_");
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, {
    headers: {
      "Content-Type": t.m || "application/octet-stream",
      "Content-Length": String(info.size),
      "Content-Disposition": `${t.d ? "attachment" : "inline"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'",
    },
  });
});
