"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { rubricKeys, validateScores } from "@/lib/domain/scoring";
import type { CompetitionSettings, EligibilityStatus } from "@/lib/domain/types";
import { requireAdmin, requireOfficer, signIn, signOut } from "@/lib/server/auth";
import { getStore } from "@/lib/server/store";
import { headers } from "next/headers";
import { pepperedHash } from "@/lib/server/crypto";

/**
 * Officer server actions. Each one re-authorizes the caller itself; nothing
 * trusts the page that rendered the form. Next.js also rejects cross-origin
 * action calls.
 */

export type ActionState = { ok: boolean; message: string; errors?: Record<string, string> } | null;

export async function signInAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { ok: false, message: "Enter your email and password." };
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const allowed = await getStore().rateLimit(`officer-login:${pepperedHash(ip).slice(0, 24)}`, 10, 900);
  if (!allowed) return { ok: false, message: "Too many sign-in attempts. Wait 15 minutes and try again." };
  const result = await signIn(email, password);
  if (!result.ok) return { ok: false, message: result.error };
  redirect("/officers");
}

export async function signOutAction() {
  await signOut();
  redirect("/officers/login");
}

const eligibilitySchema = z.object({
  id: z.uuid(),
  status: z.enum(["pending", "eligible", "ineligible"]),
  note: z.string().trim().max(1000).optional(),
});

export async function setEligibilityAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  const parsed = eligibilitySchema.safeParse({ id: form.get("id"), status: form.get("status"), note: form.get("note") ?? undefined });
  if (!parsed.success) return { ok: false, message: "Choose a status." };
  const { id, status, note } = parsed.data;
  if (status === "ineligible" && !note) return { ok: false, message: "Add a short reason when marking an entry ineligible.", errors: { note: "Required for ineligible entries." } };
  await getStore().setEligibility(id, status as EligibilityStatus, note || null, officer.id);
  refresh();
  return { ok: true, message: status === "eligible" ? "Marked eligible." : status === "ineligible" ? "Marked ineligible." : "Moved back to pending." };
}

export async function saveScoreAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const officer = await requireOfficer();
  const submissionId = z.uuid().safeParse(form.get("submissionId"));
  if (!submissionId.success) return { ok: false, message: "Unknown submission." };
  const intent = form.get("intent") === "submit" ? "submitted" : "draft";
  const store = getStore();
  const [submission, settings] = await Promise.all([store.getSubmission(submissionId.data), store.getSettings()]);
  if (!submission) return { ok: false, message: "Submission not found." };
  if (settings.resultsFinalizedAt) return { ok: false, message: "Results have been finalized. Scores are locked." };
  if (submission.eligibility !== "eligible")
    return { ok: false, message: "Only entries marked eligible can be scored. Review eligibility first." };

  const raw = Object.fromEntries(rubricKeys.map((k) => [k, form.get(k)?.toString() ?? ""]));
  const v = validateScores(raw, intent === "submitted");
  if (!v.ok) return { ok: false, message: intent === "submitted" ? "Fill in every category with a valid score." : "Fix the highlighted scores.", errors: v.errors };
  const comments = String(form.get("comments") ?? "").trim().slice(0, 3000) || null;
  await store.saveScore({ submissionId: submission.id, judgeId: officer.id, scores: v.scores, comments, status: intent });
  refresh();
  return { ok: true, message: intent === "submitted" ? "Score sheet submitted." : "Draft saved." };
}

const iso = z
  .string()
  .trim()
  .transform((v) => (v ? v : null))
  .pipe(z.iso.datetime({ offset: true }).nullable());

const settingsSchema = z.object({
  submissionsEnabled: z.boolean(),
  opensAt: iso,
  deadlineAt: iso,
  extensionUntil: iso,
  extensionNote: z.string().trim().max(300).transform((v) => v || null),
  announcedAt: iso,
  winnerAnnouncementAt: iso,
  allowedEmailDomains: z
    .string()
    .transform((v) =>
      v
        .split(/[\s,]+/)
        .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
        .filter(Boolean),
    )
    .pipe(z.array(z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, "Enter domains like school.org")).max(10)),
  requireEmailVerification: z.boolean(),
  minJudgesPerEntry: z.coerce.number().int().min(1).max(20),
});

export async function saveSettingsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = settingsSchema.safeParse({
    submissionsEnabled: form.get("submissionsEnabled") === "on",
    opensAt: form.get("opensAt") ?? "",
    deadlineAt: form.get("deadlineAt") ?? "",
    extensionUntil: form.get("extensionUntil") ?? "",
    extensionNote: form.get("extensionNote") ?? "",
    announcedAt: form.get("announcedAt") ?? "",
    winnerAnnouncementAt: form.get("winnerAnnouncementAt") ?? "",
    allowedEmailDomains: form.get("allowedEmailDomains") ?? "",
    requireEmailVerification: form.get("requireEmailVerification") === "on",
    minJudgesPerEntry: form.get("minJudgesPerEntry"),
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Some settings need attention.", errors };
  }
  const s = parsed.data;
  if (s.opensAt && s.deadlineAt && s.opensAt >= s.deadlineAt)
    return { ok: false, message: "The deadline must be after the opening time.", errors: { deadlineAt: "Must be after opening." } };
  if (s.extensionUntil && s.deadlineAt && s.extensionUntil <= s.deadlineAt)
    return { ok: false, message: "An extension must end after the original deadline.", errors: { extensionUntil: "Must be after the deadline." } };
  await getStore().updateSettings(s as Partial<CompetitionSettings>, admin.id);
  refresh();
  return { ok: true, message: "Settings saved. The public site now reflects them." };
}

export async function finalizeResultsAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const lock = form.get("lock") === "1";
  await getStore().updateSettings({ resultsFinalizedAt: lock ? new Date().toISOString() : null }, admin.id);
  refresh();
  return { ok: true, message: lock ? "Results finalized. Scoring is locked. Nothing has been published." : "Results unlocked. Judges can edit scores again." };
}

const announcementSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(1, "Add a title.").max(120),
  body: z.string().trim().min(1, "Add the announcement text.").max(2000),
  published: z.boolean(),
});

export async function saveAnnouncementAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = announcementSchema.safeParse({
    id: form.get("id") || undefined,
    title: form.get("title"),
    body: form.get("body"),
    published: form.get("published") === "on",
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const i of parsed.error.issues) errors[String(i.path[0])] ??= i.message;
    return { ok: false, message: "Check the announcement.", errors };
  }
  await getStore().saveAnnouncement(parsed.data, admin.id);
  refresh();
  return { ok: true, message: parsed.data.published ? "Announcement published." : "Announcement saved as a draft." };
}

export async function deleteAnnouncementAction(form: FormData) {
  const admin = await requireAdmin();
  const id = z.uuid().safeParse(form.get("id"));
  if (id.success) await getStore().deleteAnnouncement(id.data, admin.id);
  refresh();
}
