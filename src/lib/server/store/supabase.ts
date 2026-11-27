import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { CategoryId } from "@/content/competition";
import { defaultSettings } from "@/lib/domain/status";
import type {
  Announcement,
  AuditEvent,
  CompetitionSettings,
  Officer,
  RubricScores,
  ScoreRecord,
  Submission,
  SubmissionAsset,
  TeamMember,
  UploadRecord,
} from "@/lib/domain/types";
import { supabaseConfig } from "../env";
import { StoreError, type DataStore, type SubmissionSummary } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from PostgREST JSON */

/**
 * Production store backed by Supabase Postgres + private Storage.
 * Uses the service-role key on the server only. Every caller is authorized by
 * the application (see src/lib/server/auth.ts) before reaching this layer.
 */

let cached: { admin: SupabaseClient; anon: SupabaseClient; bucket: string } | null = null;

function clients() {
  if (cached) return cached;
  const cfg = supabaseConfig();
  if (!cfg) throw new Error("Supabase is not configured");
  const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  cached = {
    admin: createClient(cfg.url, cfg.serviceRoleKey, opts),
    anon: createClient(cfg.url, cfg.anonKey, opts),
    bucket: cfg.bucket,
  };
  return cached;
}

function fail(error: { message: string; code?: string } | null, context: string): never {
  throw new Error(`${context}: ${error?.message ?? "unknown error"}`);
}

const settingsColumns: Record<keyof Omit<CompetitionSettings, "updatedAt">, string> = {
  submissionsEnabled: "submissions_enabled",
  opensAt: "opens_at",
  deadlineAt: "deadline_at",
  extensionUntil: "extension_until",
  extensionNote: "extension_note",
  announcedAt: "announced_at",
  winnerAnnouncementAt: "winner_announcement_at",
  allowedEmailDomains: "allowed_email_domains",
  requireEmailVerification: "require_email_verification",
  minJudgesPerEntry: "min_judges_per_entry",
  resultsFinalizedAt: "results_finalized_at",
};

function rowToSettings(r: any): CompetitionSettings {
  if (!r) return { ...defaultSettings };
  return {
    submissionsEnabled: r.submissions_enabled,
    opensAt: r.opens_at,
    deadlineAt: r.deadline_at,
    extensionUntil: r.extension_until,
    extensionNote: r.extension_note,
    announcedAt: r.announced_at,
    winnerAnnouncementAt: r.winner_announcement_at,
    allowedEmailDomains: r.allowed_email_domains ?? [],
    requireEmailVerification: r.require_email_verification,
    minJudgesPerEntry: r.min_judges_per_entry,
    resultsFinalizedAt: r.results_finalized_at,
    updatedAt: r.updated_at,
  };
}

function rowToAnnouncement(r: any): Announcement {
  return { id: r.id, title: r.title, body: r.body, published: r.published, publishedAt: r.published_at, createdAt: r.created_at };
}

function rowToOfficer(r: any): Officer {
  return { id: r.id, email: r.email, displayName: r.display_name, role: r.role, active: r.active };
}

function rowToUpload(r: any): UploadRecord {
  return {
    id: r.id,
    kind: r.kind,
    storagePath: r.storage_path,
    fileName: r.file_name,
    mimeType: r.mime_type,
    declaredSize: Number(r.declared_size),
    actualSize: r.actual_size === null ? null : Number(r.actual_size),
    clientDurationSeconds: r.client_duration_seconds === null ? null : Number(r.client_duration_seconds),
    ownerTokenHash: r.owner_token_hash,
    status: r.status,
    isTest: r.is_test,
    createdAt: r.created_at,
  };
}

function rowToAsset(r: any): SubmissionAsset {
  const up = r.uploads;
  return {
    id: r.id,
    kind: r.kind,
    source: r.source,
    url: r.url,
    uploadId: r.upload_id,
    storagePath: up?.storage_path ?? null,
    fileName: up?.file_name ?? null,
    mimeType: up?.mime_type ?? null,
    sizeBytes: up?.actual_size != null ? Number(up.actual_size) : null,
    durationSeconds: up?.client_duration_seconds != null ? Number(up.client_duration_seconds) : null,
    durationStatus: r.duration_status,
  };
}

function rowToSubmission(r: any): Submission {
  const members: TeamMember[] = (r.team_members ?? [])
    .map((m: any) => ({ position: m.position, fullName: m.full_name, grade: m.grade, email: m.email }))
    .sort((a: TeamMember, b: TeamMember) => a.position - b.position);
  return {
    id: r.id,
    reference: r.reference,
    entryType: r.entry_type,
    leadEmail: r.lead_email,
    emailVerified: r.email_verified,
    members,
    projectName: r.project_name,
    description: r.description,
    problem: r.problem,
    solution: r.solution,
    targetAudience: r.target_audience,
    category: r.category as CategoryId,
    aiUsed: r.ai_used,
    aiTools: r.ai_tools,
    aiContribution: r.ai_contribution,
    aiNoneConfirmed: r.ai_none_confirmed,
    rulesAgreedAt: r.rules_agreed_at,
    rulesVersion: r.rules_version,
    publicationPermission: r.publication_permission,
    eligibility: r.eligibility,
    eligibilityNote: r.eligibility_note,
    eligibilityReviewedBy: r.eligibility_reviewed_by,
    eligibilityReviewedAt: r.eligibility_reviewed_at,
    flags: r.flags ?? [],
    isTest: r.is_test,
    submittedAt: r.submitted_at,
    assets: (r.submission_assets ?? []).map(rowToAsset),
  };
}

const scoreColumns: Record<keyof RubricScores, string> = {
  innovation: "innovation",
  problemSolution: "problem_solution",
  prototypeExecution: "prototype_execution",
  businessPotential: "business_potential",
  presentation: "presentation",
  research: "research",
};

function rowToScore(r: any): ScoreRecord {
  const scores = Object.fromEntries(
    Object.entries(scoreColumns).map(([k, col]) => [k, r[col] ?? null]),
  ) as RubricScores;
  return {
    id: r.id,
    submissionId: r.submission_id,
    judgeId: r.judge_id,
    scores,
    comments: r.comments,
    status: r.status,
    updatedAt: r.updated_at,
  };
}

const SUBMISSION_SELECT = "*, team_members(*), submission_assets(*, uploads(*))";

export function createSupabaseStore(): DataStore {
  const { admin, anon, bucket } = clients();

  async function audit(officerId: string | null, action: string, target: string | null, details: Record<string, unknown>) {
    const { error } = await admin.from("audit_log").insert({ officer_id: officerId, action, target, details });
    if (error) console.error("audit_log insert failed", error.message);
  }

  return {
    kind: "supabase",

    async getSettings() {
      const { data, error } = await admin.from("competition_settings").select("*").eq("id", 1).maybeSingle();
      if (error) fail(error, "Loading settings");
      return rowToSettings(data);
    },

    async updateSettings(patch, officerId) {
      const row: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: officerId };
      for (const [k, v] of Object.entries(patch)) {
        const col = settingsColumns[k as keyof typeof settingsColumns];
        if (col) row[col] = v;
      }
      const { data, error } = await admin.from("competition_settings").update(row).eq("id", 1).select("*").single();
      if (error) fail(error, "Saving settings");
      await audit(officerId, "settings.update", null, patch as Record<string, unknown>);
      return rowToSettings(data);
    },

    async listAnnouncements({ publishedOnly }) {
      let q = admin.from("announcements").select("*").order("created_at", { ascending: false });
      if (publishedOnly) q = q.eq("published", true);
      const { data, error } = await q;
      if (error) fail(error, "Loading announcements");
      return (data ?? []).map(rowToAnnouncement);
    },

    async saveAnnouncement(a, officerId) {
      if (a.id) {
        const { data: existing } = await admin.from("announcements").select("published, published_at").eq("id", a.id).maybeSingle();
        const publishedAt = a.published ? (existing?.published_at ?? new Date().toISOString()) : (existing?.published_at ?? null);
        const { data, error } = await admin
          .from("announcements")
          .update({ title: a.title, body: a.body, published: a.published, published_at: publishedAt })
          .eq("id", a.id)
          .select("*")
          .single();
        if (error) fail(error, "Saving announcement");
        await audit(officerId, "announcement.update", a.id, { published: a.published });
        return rowToAnnouncement(data);
      }
      const { data, error } = await admin
        .from("announcements")
        .insert({
          title: a.title,
          body: a.body,
          published: a.published,
          published_at: a.published ? new Date().toISOString() : null,
          created_by: officerId,
        })
        .select("*")
        .single();
      if (error) fail(error, "Creating announcement");
      await audit(officerId, "announcement.create", data.id, { published: a.published });
      return rowToAnnouncement(data);
    },

    async deleteAnnouncement(id, officerId) {
      const { error } = await admin.from("announcements").delete().eq("id", id);
      if (error) fail(error, "Deleting announcement");
      await audit(officerId, "announcement.delete", id, {});
    },

    async rateLimit(key, limit, windowSeconds) {
      const { data, error } = await admin.rpc("check_rate_limit", {
        p_key: key,
        p_limit: limit,
        p_window_seconds: windowSeconds,
      });
      if (error) {
        // Fail closed: if the limiter is unavailable, refuse the action.
        console.error("rate limit check failed", error.message);
        return false;
      }
      return data === true;
    },

    async sendVerificationCode(email) {
      // Requires the Supabase "Magic Link" email template to include {{ .Token }} (see README).
      const { error } = await anon.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) throw new StoreError("verification_failed", "We couldn’t send a code to that address. Try again in a minute.");
    },

    async checkVerificationCode(email, code) {
      const { data, error } = await anon.auth.verifyOtp({ email, token: code, type: "email" });
      if (error || !data.user) return false;
      // The student's Supabase session is discarded; the site issues its own short-lived proof instead.
      return data.user.email?.toLowerCase() === email;
    },

    async createUpload(u) {
      const { data, error } = await admin
        .from("uploads")
        .insert({
          kind: u.kind,
          storage_path: u.storagePath,
          file_name: u.fileName,
          mime_type: u.mimeType,
          declared_size: u.declaredSize,
          client_duration_seconds: u.clientDurationSeconds,
          owner_token_hash: u.ownerTokenHash,
          is_test: u.isTest,
        })
        .select("*")
        .single();
      if (error) fail(error, "Creating upload");
      const signed = await admin.storage.from(bucket).createSignedUploadUrl(u.storagePath);
      if (signed.error) fail(signed.error, "Signing upload URL");
      return { upload: rowToUpload(data), target: { mode: "supabase", url: signed.data.signedUrl } };
    },

    async getUpload(id) {
      const { data, error } = await admin.from("uploads").select("*").eq("id", id).maybeSingle();
      if (error) fail(error, "Loading upload");
      return data ? rowToUpload(data) : null;
    },

    async confirmUpload(id) {
      const { data: row, error } = await admin.from("uploads").select("*").eq("id", id).maybeSingle();
      if (error) fail(error, "Loading upload");
      if (!row) throw new StoreError("not_found", "Upload not found.");
      const upload = rowToUpload(row);
      const slash = upload.storagePath.lastIndexOf("/");
      const folder = upload.storagePath.slice(0, slash);
      const name = upload.storagePath.slice(slash + 1);
      const listed = await admin.storage.from(bucket).list(folder, { search: name, limit: 5 });
      const obj = listed.data?.find((o) => o.name === name);
      const size = Number((obj?.metadata as { size?: number } | undefined)?.size ?? NaN);
      if (!obj || !Number.isFinite(size)) throw new StoreError("invalid_upload", "The file didn’t finish uploading. Try again.");
      if (size !== upload.declaredSize) throw new StoreError("invalid_upload", "The uploaded file is incomplete. Try again.");
      const { data: updated, error: upErr } = await admin
        .from("uploads")
        .update({ actual_size: size, status: upload.status === "pending" ? "uploaded" : upload.status })
        .eq("id", id)
        .select("*")
        .single();
      if (upErr) fail(upErr, "Confirming upload");
      return rowToUpload(updated);
    },

    async createSubmission(s) {
      const { data, error } = await admin.rpc("create_submission", { p: s });
      if (error) {
        switch (error.code) {
          case "EIC01":
            throw new StoreError("closed", "Submissions are not open right now.");
          case "EIC02":
            throw new StoreError(
              "duplicate_email",
              "A submission already exists for this student. Each student can be part of one submission.",
            );
          case "EIC03":
            throw new StoreError("invalid_upload", "One of your uploads couldn’t be found. Upload it again.");
          case "EIC04":
            throw new StoreError("forbidden", "This submission key was already used.");
          case "EIC05":
            throw new StoreError("reference_collision", "Reference collision");
          default:
            fail(error, "Saving submission");
        }
      }
      const row = Array.isArray(data) ? data[0] : data;
      return { id: row.submission_id, reference: row.reference, replayed: row.replayed };
    },

    async listSubmissions(f) {
      let q = admin
        .from("submissions")
        .select("id, reference, project_name, category, entry_type, eligibility, flags, is_test, submitted_at, lead_email, team_members(full_name, position)")
        .order("submitted_at", { ascending: false })
        .limit(1000);
      if (!f.includeTest) q = q.eq("is_test", false);
      if (f.category && f.category !== "all") q = q.eq("category", f.category);
      if (f.eligibility && f.eligibility !== "all") q = q.eq("eligibility", f.eligibility);
      if (f.flagged) q = q.neq("flags", "{}");
      const { data, error } = await q;
      if (error) fail(error, "Loading submissions");
      const needle = f.q?.trim().toLowerCase();
      return (data ?? [])
        .map(
          (r: any): SubmissionSummary & { _haystack: string } => {
            const names = (r.team_members ?? [])
              .sort((a: any, b: any) => a.position - b.position)
              .map((m: any) => m.full_name as string);
            return {
              id: r.id,
              reference: r.reference,
              projectName: r.project_name,
              category: r.category,
              entryType: r.entry_type,
              memberNames: names,
              eligibility: r.eligibility,
              flags: r.flags ?? [],
              isTest: r.is_test,
              submittedAt: r.submitted_at,
              _haystack: [r.reference, r.project_name, r.lead_email, ...names].join(" ").toLowerCase(),
            };
          },
        )
        .filter((r) => !needle || r._haystack.includes(needle))
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({ _haystack, ...rest }) => rest);
    },

    async getSubmission(id) {
      const { data, error } = await admin.from("submissions").select(SUBMISSION_SELECT).eq("id", id).maybeSingle();
      if (error) fail(error, "Loading submission");
      return data ? rowToSubmission(data) : null;
    },

    async listAllSubmissions(includeTest) {
      let q = admin.from("submissions").select(SUBMISSION_SELECT).order("submitted_at", { ascending: true });
      if (!includeTest) q = q.eq("is_test", false);
      const { data, error } = await q;
      if (error) fail(error, "Loading submissions");
      return (data ?? []).map(rowToSubmission);
    },

    async setEligibility(id, status, note, officerId) {
      const { error, count } = await admin
        .from("submissions")
        .update(
          {
            eligibility: status,
            eligibility_note: note,
            eligibility_reviewed_by: officerId,
            eligibility_reviewed_at: new Date().toISOString(),
          },
          { count: "exact" },
        )
        .eq("id", id);
      if (error) fail(error, "Updating eligibility");
      if (!count) throw new StoreError("not_found", "Submission not found.");
      await audit(officerId, "submission.eligibility", id, { status });
    },

    async listScores(f) {
      let q = admin.from("scores").select("*");
      if (f.submissionId) q = q.eq("submission_id", f.submissionId);
      if (f.judgeId) q = q.eq("judge_id", f.judgeId);
      const { data, error } = await q;
      if (error) fail(error, "Loading scores");
      return (data ?? []).map(rowToScore);
    },

    async saveScore(r) {
      const row: Record<string, unknown> = {
        submission_id: r.submissionId,
        judge_id: r.judgeId,
        comments: r.comments,
        status: r.status,
        updated_at: new Date().toISOString(),
      };
      for (const [k, col] of Object.entries(scoreColumns)) row[col] = r.scores[k as keyof RubricScores];
      const { data, error } = await admin
        .from("scores")
        .upsert(row, { onConflict: "submission_id,judge_id" })
        .select("*")
        .single();
      if (error) fail(error, "Saving score");
      await audit(r.judgeId, `score.${r.status}`, r.submissionId, {});
      return rowToScore(data);
    },

    async getOfficerById(id) {
      const { data, error } = await admin.from("officers").select("*").eq("id", id).maybeSingle();
      if (error) fail(error, "Loading officer");
      return data ? rowToOfficer(data) : null;
    },

    async listOfficers() {
      const { data, error } = await admin.from("officers").select("*").order("display_name");
      if (error) fail(error, "Loading officers");
      return (data ?? []).map(rowToOfficer);
    },

    async signedFileUrl(asset, { download, ttlSeconds }) {
      if (asset.source !== "file" || !asset.storagePath) return null;
      const { data, error } = await admin.storage
        .from(bucket)
        .createSignedUrl(asset.storagePath, ttlSeconds, download ? { download: asset.fileName ?? true } : undefined);
      if (error) {
        console.error("signed URL failed", error.message);
        return null;
      }
      return data.signedUrl;
    },

    async audit(e) {
      await audit(e.officerId, e.action, e.target ?? null, e.details ?? {});
    },

    async listAudit(limit) {
      const { data, error } = await admin.from("audit_log").select("*").order("created_at", { ascending: false }).limit(limit);
      if (error) fail(error, "Loading audit log");
      return (data ?? []).map(
        (r: any): AuditEvent => ({
          id: r.id,
          officerId: r.officer_id,
          action: r.action,
          target: r.target,
          details: r.details,
          createdAt: r.created_at,
        }),
      );
    },
  };
}

/** Used by officer sign-in: find (and on first sign-in, link) the officer row for an auth user. */
export async function officerForAuthUser(user: { id: string; email?: string | null; email_confirmed_at?: string | null }): Promise<Officer | null> {
  const { admin } = clients();
  const byId = await admin.from("officers").select("*").eq("user_id", user.id).eq("active", true).maybeSingle();
  if (byId.data) return rowToOfficer(byId.data);
  if (!user.email || !user.email_confirmed_at) return null;
  const byEmail = await admin
    .from("officers")
    .select("*")
    .eq("email", user.email.toLowerCase())
    .is("user_id", null)
    .eq("active", true)
    .maybeSingle();
  if (!byEmail.data) return null;
  const linked = await admin.from("officers").update({ user_id: user.id }).eq("id", byEmail.data.id).select("*").single();
  return linked.data ? rowToOfficer(linked.data) : null;
}

export function supabaseAdmin() {
  return clients().admin;
}
