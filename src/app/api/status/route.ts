import { NextResponse } from "next/server";
import { submissionWindow, toPublicSettings } from "@/lib/domain/status";
import { guarded } from "@/lib/server/request";
import { getStore } from "@/lib/server/store";

/** Public, non-sensitive competition status. */
export const GET = guarded(async () => {
  const settings = await getStore().getSettings();
  return NextResponse.json(
    { ok: true, settings: toPublicSettings(settings), window: submissionWindow(settings) },
    { headers: { "Cache-Control": "no-store" } },
  );
});
