import "server-only";
import { createHash, createHmac, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { sessionSecret } from "./env";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

function b64url(buf: Buffer | string) {
  return Buffer.from(buf).toString("base64url");
}

function hmac(data: string, purpose: string) {
  return createHmac("sha256", `${sessionSecret()}:${purpose}`).update(data).digest();
}

/** Compact signed token: base64url(json).base64url(hmac). `purpose` separates token types. */
export function signToken(payload: Record<string, unknown>, ttlSeconds: number, purpose: string): string {
  const body = b64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  return `${body}.${b64url(hmac(body, purpose))}`;
}

export function verifyToken<T extends Record<string, unknown>>(token: string | undefined | null, purpose: string): (T & { exp: number }) | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = hmac(body, purpose);
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof data.exp !== "number" || data.exp < Date.now() / 1000) return null;
    return data;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, hashB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64url"), expected.length);
  return timingSafeEqual(actual, expected);
}

/** One-way hash with the server secret, used for IPs and browser draft tokens. */
export function pepperedHash(value: string): string {
  return createHash("sha256").update(`${sessionSecret()}|${value}`).digest("hex");
}

const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Human-friendly submission reference such as EIC-7KQ4MZ (no 0/O/1/I/L). */
export function newReference(): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `EIC-${out}`;
}

export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
