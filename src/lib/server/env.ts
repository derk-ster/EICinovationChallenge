import "server-only";
import { defaultUploadLimits, type UploadLimits } from "@/lib/domain/files";

export type Backend = "local" | "supabase";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const isProduction = process.env.NODE_ENV === "production";

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "submission-files";
  return url && anonKey && serviceRoleKey ? { url, anonKey, serviceRoleKey, bucket } : null;
}

/**
 * Picks the storage backend. Production never falls back to local storage
 * silently: it uses Supabase, or refuses to run, unless local storage was
 * explicitly allowed for a local production-build test.
 */
export function backend(): Backend {
  const explicit = process.env.EIC_DATA_BACKEND;
  const hasSupabase = supabaseConfig() !== null;
  if (explicit === "supabase") {
    if (!hasSupabase)
      throw new ConfigError(
        "EIC_DATA_BACKEND=supabase but SUPABASE_URL, SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY is missing.",
      );
    return "supabase";
  }
  if (explicit === "local") {
    if (isProduction && process.env.EIC_ALLOW_LOCAL_STORE !== "true")
      throw new ConfigError(
        "Local storage is disabled in production. Configure Supabase, or set EIC_ALLOW_LOCAL_STORE=true only for a local production-build test.",
      );
    return "local";
  }
  if (hasSupabase) return "supabase";
  if (!isProduction) return "local";
  throw new ConfigError("No production storage is configured. Set the Supabase environment variables.");
}

/** Local storage always holds test data. A Supabase staging project can opt in with EIC_TEST_DATA=true. */
export function isTestData(): boolean {
  return backend() === "local" || process.env.EIC_TEST_DATA === "true";
}

const DEV_SECRET = "eic-local-development-secret-do-not-use-in-production-0001";

export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (isProduction) throw new ConfigError("SESSION_SECRET must be set to at least 32 random characters in production.");
  return DEV_SECRET;
}

export function uploadLimits(): UploadLimits {
  const p = Number(process.env.MAX_PROTOTYPE_MB);
  const v = Number(process.env.MAX_VIDEO_MB);
  return {
    prototypeMb: Number.isFinite(p) && p > 0 ? p : defaultUploadLimits.prototypeMb,
    videoMb: Number.isFinite(v) && v > 0 ? v : defaultUploadLimits.videoMb,
  };
}

export function localDataDir(): string {
  return process.env.EIC_LOCAL_DATA_DIR || ".data";
}

export { isProduction };
