import { NextResponse } from "next/server";
import { emailDomainAllowed, emailField } from "@/lib/domain/submission-schema";
import { submissionWindow } from "@/lib/domain/status";
import { guarded, jsonError, limit, sameOrigin } from "@/lib/server/request";
import { getStore, StoreError } from "@/lib/server/store";

export const POST = guarded(async (req: Request) => {
  if (!sameOrigin(req)) return jsonError(403, "Request blocked.");
  const body = await req.json().catch(() => ({}));
  const parsed = emailField.safeParse(body?.email);
  if (!parsed.success) return jsonError(422, "Enter a valid email address.");
  const email = parsed.data;

  const store = getStore();
  const settings = await store.getSettings();
  if (submissionWindow(settings).state !== "open") return jsonError(403, "Submissions are not open right now.");
  if (!settings.requireEmailVerification) return NextResponse.json({ ok: true, required: false });
  if (!emailDomainAllowed(email, settings.allowedEmailDomains))
    return jsonError(422, `Use your school email (${settings.allowedEmailDomains.map((d) => `@${d}`).join(" or ")}).`);

  if (!(await limit(req, "verify-start", 10, 3600)) || !(await store.rateLimit(`verify-email:${email}`, 3, 600)))
    return jsonError(429, "Too many codes requested. Wait a few minutes and try again.");

  try {
    await store.sendVerificationCode(email);
  } catch (e) {
    if (e instanceof StoreError) return jsonError(502, e.message);
    throw e;
  }
  return NextResponse.json({ ok: true, required: true });
});
