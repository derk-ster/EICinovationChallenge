import { NextResponse } from "next/server";
import { emailField } from "@/lib/domain/submission-schema";
import { guarded, jsonError, limit, sameOrigin } from "@/lib/server/request";
import { getStore } from "@/lib/server/store";
import { setVerifiedEmail } from "@/lib/server/student";

export const POST = guarded(async (req: Request) => {
  if (!sameOrigin(req)) return jsonError(403, "Request blocked.");
  const body = await req.json().catch(() => ({}));
  const email = emailField.safeParse(body?.email);
  const code = typeof body?.code === "string" ? body.code.replace(/\s/g, "") : "";
  if (!email.success || !/^\d{6}$/.test(code)) return jsonError(422, "Enter the 6-digit code from your email.");
  if (!(await limit(req, "verify-confirm", 20, 600))) return jsonError(429, "Too many attempts. Wait a few minutes.");
  const ok = await getStore().checkVerificationCode(email.data, code);
  if (!ok) return jsonError(422, "That code is incorrect or has expired. Request a new one.");
  await setVerifiedEmail(email.data);
  return NextResponse.json({ ok: true, email: email.data });
});
