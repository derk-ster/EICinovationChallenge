import { NextResponse } from "next/server";
import { guarded } from "@/lib/server/request";
import { getVerifiedEmail } from "@/lib/server/student";

export const GET = guarded(async () => {
  const email = await getVerifiedEmail();
  return NextResponse.json({ ok: true, email }, { headers: { "Cache-Control": "no-store" } });
});
