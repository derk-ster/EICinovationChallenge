import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { Officer, OfficerRole } from "@/lib/domain/types";
import { signToken, verifyPassword, verifyToken } from "./crypto";
import { backend, isProduction, supabaseConfig } from "./env";
import { getStore } from "./store";
import { findLocalOfficerByEmail } from "./store/local";
import { officerForAuthUser } from "./store/supabase";

/**
 * Officer authentication (data access layer).
 *  - Supabase backend: Supabase Auth email + password; the officer row decides access.
 *  - Local backend: seeded officer accounts with scrypt-hashed passwords and a signed session cookie.
 * Every officer page, action and route calls requireOfficer()/requireAdmin().
 */

const LOCAL_COOKIE = "eic_officer";
const SESSION_HOURS = 8;

async function supabaseAuthClient() {
  const cfg = supabaseConfig()!;
  const store = await cookies();
  return createServerClient(cfg.url, cfg.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Called from a Server Component render, where cookies are read-only. Safe to ignore.
        }
      },
    },
  });
}

export const getOfficer = cache(async (): Promise<Officer | null> => {
  // Sessions are checked against the current time, so this always runs per request.
  await connection();
  if (backend() === "supabase") {
    const sb = await supabaseAuthClient();
    const { data } = await sb.auth.getUser();
    if (!data.user) return null;
    return officerForAuthUser(data.user);
  }
  const jar = await cookies();
  const session = verifyToken<{ oid: string }>(jar.get(LOCAL_COOKIE)?.value, "officer-session");
  if (!session) return null;
  const officer = await getStore().getOfficerById(session.oid);
  return officer?.active ? officer : null;
});

export async function requireOfficer(): Promise<Officer> {
  const officer = await getOfficer();
  if (!officer) redirect("/officers/login");
  return officer;
}

export async function requireAdmin(): Promise<Officer> {
  const officer = await requireOfficer();
  if (officer.role !== "admin") redirect("/officers?denied=admin");
  return officer;
}

export function hasRole(officer: Officer, role: OfficerRole) {
  return role === "judge" ? true : officer.role === "admin";
}

export type SignInResult = { ok: true } | { ok: false; error: string };

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const generic = { ok: false as const, error: "That email and password don’t match an active officer account." };
  if (backend() === "supabase") {
    const sb = await supabaseAuthClient();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.user) return generic;
    const officer = await officerForAuthUser(data.user);
    if (!officer) {
      await sb.auth.signOut();
      return generic;
    }
    await getStore().audit({ officerId: officer.id, action: "officer.sign_in" });
    return { ok: true };
  }
  const row = await findLocalOfficerByEmail(email);
  // Always run a hash comparison so timing doesn't reveal which emails exist.
  const valid = await verifyPassword(password, row?.passwordHash ?? "scrypt$AAAAAAAAAAAAAAAAAAAAAA$" + "A".repeat(86));
  if (!row || !row.active || !valid) return generic;
  const jar = await cookies();
  jar.set(LOCAL_COOKIE, signToken({ oid: row.id }, SESSION_HOURS * 3600, "officer-session"), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  await getStore().audit({ officerId: row.id, action: "officer.sign_in" });
  return { ok: true };
}

export async function signOut() {
  if (backend() === "supabase") {
    const sb = await supabaseAuthClient();
    await sb.auth.signOut();
    return;
  }
  (await cookies()).delete(LOCAL_COOKIE);
}
