import type { CompetitionSettings, PublicSettings } from "./types";

export type SubmissionWindow =
  | { state: "open"; closesAt: string | null; extended: boolean }
  | { state: "not-yet-open"; opensAt: string | null }
  | { state: "closed"; closedAt: string | null }
  | { state: "disabled" };

/** The deadline currently in force: an announced extension replaces the original deadline. */
export function effectiveDeadline(s: Pick<PublicSettings, "deadlineAt" | "extensionUntil">): string | null {
  if (s.extensionUntil && (!s.deadlineAt || s.extensionUntil > s.deadlineAt)) return s.extensionUntil;
  return s.deadlineAt;
}

/**
 * Single source of truth for "can a student submit right now?".
 * Used on the server to enforce availability and on the client to describe it.
 */
export function submissionWindow(
  s: Pick<PublicSettings, "submissionsEnabled" | "opensAt" | "deadlineAt" | "extensionUntil">,
  now: Date = new Date(),
): SubmissionWindow {
  if (!s.submissionsEnabled) return { state: "disabled" };
  const t = now.getTime();
  if (s.opensAt && t < Date.parse(s.opensAt)) return { state: "not-yet-open", opensAt: s.opensAt };
  const deadline = effectiveDeadline(s);
  if (deadline && t > Date.parse(deadline)) return { state: "closed", closedAt: deadline };
  return {
    state: "open",
    closesAt: deadline,
    extended: Boolean(s.extensionUntil && deadline === s.extensionUntil),
  };
}

export function toPublicSettings(s: CompetitionSettings): PublicSettings {
  return {
    submissionsEnabled: s.submissionsEnabled,
    opensAt: s.opensAt,
    deadlineAt: s.deadlineAt,
    extensionUntil: s.extensionUntil,
    extensionNote: s.extensionNote,
    announcedAt: s.announcedAt,
    winnerAnnouncementAt: s.winnerAnnouncementAt,
    allowedEmailDomains: s.allowedEmailDomains,
    requireEmailVerification: s.requireEmailVerification,
  };
}

export const defaultSettings: CompetitionSettings = {
  // Submissions stay closed until an officer opens them from the dashboard.
  submissionsEnabled: false,
  opensAt: null,
  deadlineAt: null,
  extensionUntil: null,
  extensionNote: null,
  announcedAt: null,
  winnerAnnouncementAt: null,
  // No school domain has been confirmed, so none is enforced by default.
  allowedEmailDomains: [],
  requireEmailVerification: true,
  minJudgesPerEntry: 2,
  resultsFinalizedAt: null,
  updatedAt: null,
};
