import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { submissionWindow, toPublicSettings, type SubmissionWindow } from "@/lib/domain/status";
import type { Announcement, PublicSettings } from "@/lib/domain/types";
import { ConfigError } from "./env";
import { getStore } from "./store";

export interface PublicState {
  settings: PublicSettings;
  window: SubmissionWindow;
  announcements: Announcement[];
}

/**
 * Public competition state for visitors (deduplicated per request).
 * Returns null if storage isn't configured so public pages still render.
 */
export const getPublicState = cache(async (): Promise<PublicState | null> => {
  // Settings change at any time, so this is always read per request.
  await connection();
  try {
    const store = getStore();
    const [settings, announcements] = await Promise.all([
      store.getSettings(),
      store.listAnnouncements({ publishedOnly: true }),
    ]);
    return { settings: toPublicSettings(settings), window: submissionWindow(settings), announcements };
  } catch (e) {
    if (e instanceof ConfigError) {
      console.error("[config]", e.message);
      return null;
    }
    throw e;
  }
});
