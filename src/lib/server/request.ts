import "server-only";
import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { pepperedHash } from "./crypto";
import { ConfigError } from "./env";
import { getStore } from "./store";

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export function ipHash(req: Request): string {
  return pepperedHash(`ip:${clientIp(req)}`).slice(0, 32);
}

/**
 * Rejects cross-site POSTs to JSON endpoints. Browsers always send Origin on
 * cross-origin requests and on same-origin POST/PUT, so a mismatch means the
 * request didn't come from this site.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function limit(req: Request, bucket: string, max: number, windowSeconds: number, extraKey = "") {
  return getStore().rateLimit(`${bucket}:${ipHash(req)}${extraKey ? `:${extraKey}` : ""}`, max, windowSeconds);
}

/** Wraps a route handler: maps configuration problems to 503 and hides internals on unexpected errors. */
export function guarded<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (e) {
      // Let Next.js handle its own control-flow signals (prerender bailouts, redirects).
      unstable_rethrow(e);
      if (e instanceof ConfigError) {
        console.error("[config]", e.message);
        return jsonError(503, "The submission system isn’t configured yet. Please contact an EIC officer.");
      }
      console.error(e);
      return jsonError(500, "Something went wrong on our side. Your information was not saved — please try again.");
    }
  };
}
