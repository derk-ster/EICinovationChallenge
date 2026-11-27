import "server-only";
import { randomUUID } from "node:crypto";
import { competition, type CategoryId } from "@/content/competition";
import { extensionOf, mimeFor, sanitizeFileName } from "@/lib/domain/files";
import { looksLikeVideoHost } from "@/lib/domain/links";
import { submissionWindow } from "@/lib/domain/status";
import {
  durationInRange,
  emailDomainAllowed,
  issuesToErrors,
  submissionSchema,
} from "@/lib/domain/submission-schema";
import type { AssetKind, TeamMember } from "@/lib/domain/types";
import { newReference } from "./crypto";
import { isTestData, uploadLimits } from "./env";
import { getStore, StoreError } from "./store";
import type { NewAsset } from "./store/types";

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string; fieldErrors?: Record<string, string> };

const closedMessage = (state: string) =>
  state === "not-yet-open"
    ? "Submissions haven’t opened yet. Watch for the official EIC announcement."
    : state === "closed"
      ? "The submission deadline has passed. Late submissions are not accepted unless an extension is announced."
      : "Submissions are not open right now.";

/* ------------------------------------------------------------------ uploads */

export async function initUpload(
  input: { kind?: unknown; fileName?: unknown; size?: unknown; durationSeconds?: unknown },
  ctx: { ownerHash: string; verifiedEmail: string | null },
): Promise<ServiceResult<{ uploadId: string; target: { mode: "local" | "supabase"; url: string }; mimeType: string }>> {
  const store = getStore();
  const settings = await store.getSettings();
  const window = submissionWindow(settings);
  if (window.state !== "open") return { ok: false, status: 403, error: closedMessage(window.state) };
  if (settings.requireEmailVerification && !ctx.verifiedEmail)
    return { ok: false, status: 401, error: "Verify your school email before uploading files." };

  const kind = input.kind === "video" ? "video" : input.kind === "prototype" ? "prototype" : null;
  if (!kind) return { ok: false, status: 400, error: "Unknown upload type." };
  const fileName = typeof input.fileName === "string" ? input.fileName.slice(0, 200) : "";
  const size = typeof input.size === "number" ? input.size : NaN;
  const mimeType = mimeFor(kind, fileName);
  if (!mimeType)
    return {
      ok: false,
      status: 415,
      error: `.${extensionOf(fileName) || "?"} files aren’t accepted for the ${kind === "video" ? "video" : "prototype"}.`,
    };
  const limits = uploadLimits();
  const maxMb = kind === "video" ? limits.videoMb : limits.prototypeMb;
  if (!Number.isInteger(size) || size <= 0) return { ok: false, status: 400, error: "That file is empty." };
  if (size > maxMb * 1024 * 1024)
    return {
      ok: false,
      status: 413,
      error: `Files must be ${maxMb} MB or smaller. For a larger file, upload it to Google Drive or YouTube (unlisted) and paste the link instead.`,
    };

  let duration: number | null = null;
  if (kind === "video" && input.durationSeconds !== null && input.durationSeconds !== undefined) {
    const d = Number(input.durationSeconds);
    if (Number.isFinite(d) && d > 0) {
      if (!durationInRange(d))
        return {
          ok: false,
          status: 422,
          error: `Your video is ${formatDuration(d)}. Presentation videos must be between 2 and 3 minutes.`,
        };
      duration = Math.round(d * 100) / 100;
    }
  }

  const isTest = isTestData();
  const month = new Date().toISOString().slice(0, 7);
  const storagePath = `${isTest ? "test" : "live"}/${month}/${randomUUID()}/${sanitizeFileName(fileName)}`;
  const { upload, target } = await store.createUpload({
    kind,
    fileName,
    storagePath,
    mimeType,
    declaredSize: size,
    clientDurationSeconds: duration,
    ownerTokenHash: ctx.ownerHash,
    isTest,
  });
  return { ok: true, data: { uploadId: upload.id, target, mimeType } };
}

export async function completeUpload(id: string, ownerHash: string): Promise<ServiceResult<{ size: number }>> {
  const store = getStore();
  const upload = await store.getUpload(id);
  if (!upload || upload.ownerTokenHash !== ownerHash) return { ok: false, status: 404, error: "Upload not found." };
  try {
    const confirmed = await store.confirmUpload(id);
    return { ok: true, data: { size: confirmed.actualSize ?? confirmed.declaredSize } };
  } catch (e) {
    if (e instanceof StoreError) return { ok: false, status: 409, error: e.message };
    throw e;
  }
}

/* -------------------------------------------------------------- submission */

export async function submitEntry(
  body: unknown,
  ctx: { ownerHash: string; verifiedEmail: string | null; ipHash: string },
): Promise<ServiceResult<{ reference: string; replayed: boolean }>> {
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success)
    return { ok: false, status: 422, error: "Some fields need attention.", fieldErrors: issuesToErrors(parsed.error) };
  const v = parsed.data;
  const store = getStore();
  const settings = await store.getSettings();

  const window = submissionWindow(settings);
  if (window.state !== "open") return { ok: false, status: 403, error: closedMessage(window.state) };

  const lead = v.participant.lead;
  const partner = v.participant.partner;
  for (const [path, email] of [
    ["participant.lead.email", lead.email],
    ["participant.partner.email", partner?.email],
  ] as const) {
    if (email && !emailDomainAllowed(email, settings.allowedEmailDomains))
      return {
        ok: false,
        status: 422,
        error: "Use a school email address.",
        fieldErrors: { [path]: `Use your school email (${settings.allowedEmailDomains.map((d) => `@${d}`).join(" or ")}).` },
      };
  }

  const emailVerified = ctx.verifiedEmail === lead.email;
  if (settings.requireEmailVerification && !emailVerified)
    return {
      ok: false,
      status: 401,
      error: "Verify your school email before submitting.",
      fieldErrors: { "participant.lead.email": "Verify this email address on step 1." },
    };

  const flags: string[] = [];
  if (!emailVerified) flags.push("email-unverified");

  // Materials: confirm uploads belong to this browser and work out video duration status.
  const assets: NewAsset[] = [];
  for (const kind of ["prototype", "video"] as AssetKind[]) {
    const m = v.materials[kind];
    if (m.source === "link") {
      if (kind === "video") {
        flags.push("video-duration-review");
        // Links can't be measured automatically; officers confirm the 2–3 minute length.
      }
      assets.push({ kind, source: "link", url: m.url, durationStatus: kind === "video" ? "unverified" : "not_applicable" });
      if (kind === "video") {
        const host = new URL(m.url).hostname;
        if (!looksLikeVideoHost(host)) flags.push("video-link-unrecognized");
      }
      continue;
    }
    const up = await store.getUpload(m.uploadId);
    if (!up || up.ownerTokenHash !== ctx.ownerHash || up.kind !== kind || up.status !== "uploaded")
      return {
        ok: false,
        status: 409,
        error: "One of your uploads couldn’t be found. Upload it again.",
        fieldErrors: { [`materials.${kind}`]: "Upload this file again." },
      };
    let durationStatus: NewAsset["durationStatus"] = "not_applicable";
    if (kind === "video") {
      if (up.clientDurationSeconds !== null && durationInRange(up.clientDurationSeconds)) durationStatus = "detected_in_range";
      else {
        durationStatus = "unverified";
        flags.push("video-duration-review");
      }
    }
    assets.push({ kind, source: "file", uploadId: up.id, durationStatus });
  }

  // Same-name check across existing entries: not blocking (names repeat), but worth an officer's look.
  const names = [lead.fullName, partner?.fullName].filter(Boolean).map((n) => normalizeName(n!));
  const existing = await store.listSubmissions({ includeTest: true });
  if (existing.some((s) => s.memberNames.some((n) => names.includes(normalizeName(n))))) flags.push("possible-duplicate-name");

  const members: TeamMember[] = [{ position: 1, fullName: lead.fullName, grade: lead.grade, email: lead.email }];
  if (v.participant.entryType === "team" && partner)
    members.push({ position: 2, fullName: partner.fullName, grade: partner.grade, email: partner.email ?? null });
  if (members.length > competition.maxTeamSize) return { ok: false, status: 422, error: "Teams can have at most two students." };

  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const result = await store.createSubmission({
        idempotencyKey: v.idempotencyKey,
        reference: newReference(),
        entryType: v.participant.entryType,
        leadEmail: lead.email,
        emailVerified,
        members,
        projectName: v.project.projectName,
        description: v.project.description,
        problem: v.project.problem,
        solution: v.project.solution,
        targetAudience: v.project.targetAudience,
        category: v.project.category as CategoryId,
        aiUsed: v.ai.used,
        aiTools: v.ai.tools,
        aiContribution: v.ai.contribution,
        aiNoneConfirmed: v.ai.noneConfirmed,
        rulesVersion: competition.rulesVersion,
        publicationPermission: v.review.publicationPermission,
        flags: Array.from(new Set(flags)),
        isTest: isTestData(),
        ipHash: ctx.ipHash,
        ownerTokenHash: ctx.ownerHash,
        assets,
      });
      return { ok: true, data: { reference: result.reference, replayed: result.replayed } };
    } catch (e) {
      if (e instanceof StoreError) {
        if (e.code === "reference_collision") continue;
        if (e.code === "closed") return { ok: false, status: 403, error: closedMessage("closed") };
        if (e.code === "duplicate_email")
          return {
            ok: false,
            status: 409,
            error: e.message,
            fieldErrors: { "participant.lead.email": "This student is already part of a submission." },
          };
        if (e.code === "invalid_upload") return { ok: false, status: 409, error: e.message };
        if (e.code === "forbidden") return { ok: false, status: 409, error: "Start a new submission and try again." };
      }
      throw e;
    }
  }
  return { ok: false, status: 500, error: "We couldn’t create a reference number. Please try again." };
}

function normalizeName(n: string) {
  return n.toLowerCase().replace(/[^a-z]/g, "");
}

export function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
