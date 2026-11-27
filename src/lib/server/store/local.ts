import "server-only";
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { appendFile, mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { defaultSettings, submissionWindow } from "@/lib/domain/status";
import type {
  Announcement,
  AuditEvent,
  CompetitionSettings,
  Officer,
  ScoreRecord,
  Submission,
  SubmissionAsset,
  UploadRecord,
} from "@/lib/domain/types";
import { localDataDir } from "../env";
import { newCode, pepperedHash, safeEqual, signToken } from "../crypto";
import { StoreError, type DataStore, type SubmissionSummary } from "./types";

/**
 * Local development store. Everything lives in a single JSON file and an
 * uploads folder under `.data/` (git-ignored). It implements the same rules as
 * the Supabase schema so the app can be built and tested without credentials.
 * It is never selected in production unless explicitly allowed (see env.ts).
 */

type LocalOfficer = Officer & { passwordHash: string };
type LocalSubmission = Submission & { idempotencyKey: string; ipHash: string; ownerTokenHash: string };

interface LocalDb {
  version: 1;
  settings: CompetitionSettings;
  announcements: Announcement[];
  officers: LocalOfficer[];
  submissions: LocalSubmission[];
  uploads: UploadRecord[];
  scores: ScoreRecord[];
  audit: AuditEvent[];
  rateLimits: Record<string, { windowStart: number; count: number }>;
  verifications: Record<string, { codeHash: string; expiresAt: number; attempts: number }>;
}

function emptyDb(): LocalDb {
  return {
    version: 1,
    settings: { ...defaultSettings },
    announcements: [],
    officers: [],
    submissions: [],
    uploads: [],
    scores: [],
    audit: [],
    rateLimits: {},
    verifications: {},
  };
}

// Development-only data folder; excluded from output file tracing.
const dir = () => path.resolve(/*turbopackIgnore: true*/ process.cwd(), localDataDir());
const dbFile = () => path.join(dir(), "dev-db.json");
export const localUploadsDir = () => path.join(dir(), "uploads");

// One in-process queue serializes every read-modify-write so concurrent
// requests can't interleave (the JSON file is the "transaction").
const g = globalThis as unknown as { __eicLocalQueue?: Promise<unknown> };

function serialize<T>(fn: () => Promise<T>): Promise<T> {
  const prev = g.__eicLocalQueue ?? Promise.resolve();
  const next = prev.then(fn, fn);
  g.__eicLocalQueue = next.catch(() => undefined);
  return next;
}

async function load(): Promise<LocalDb> {
  try {
    const raw = await readFile(dbFile(), "utf8");
    const db = JSON.parse(raw) as LocalDb;
    return { ...emptyDb(), ...db, settings: { ...defaultSettings, ...db.settings } };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return emptyDb();
    throw e;
  }
}

async function save(db: LocalDb) {
  await mkdir(dir(), { recursive: true });
  const tmp = `${dbFile()}.${process.pid}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 2));
  await rename(tmp, dbFile());
}

function read<T>(fn: (db: LocalDb) => T): Promise<T> {
  return serialize(async () => fn(await load()));
}

function mutate<T>(fn: (db: LocalDb) => T | Promise<T>): Promise<T> {
  return serialize(async () => {
    const db = await load();
    const result = await fn(db);
    await save(db);
    return result;
  });
}

const now = () => new Date().toISOString();

function publicOfficer(o: LocalOfficer): Officer {
  return { id: o.id, email: o.email, displayName: o.displayName, role: o.role, active: o.active };
}

function stripSubmission(s: LocalSubmission): Submission {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { idempotencyKey, ipHash, ownerTokenHash, ...rest } = s;
  return rest;
}

function allEmails(db: LocalDb, isTest: boolean): Set<string> {
  const set = new Set<string>();
  for (const s of db.submissions) {
    if (s.isTest !== isTest) continue;
    set.add(s.leadEmail);
    for (const m of s.members) if (m.email) set.add(m.email);
  }
  return set;
}

export function createLocalStore(): DataStore {
  return {
    kind: "local",

    getSettings: () => read((db) => db.settings),

    updateSettings: (patch, officerId) =>
      mutate((db) => {
        db.settings = { ...db.settings, ...patch, updatedAt: now() };
        db.audit.push(auditRow(officerId, "settings.update", null, patch));
        return db.settings;
      }),

    listAnnouncements: ({ publishedOnly }) =>
      read((db) =>
        db.announcements
          .filter((a) => !publishedOnly || a.published)
          .toSorted((a, b) => (b.publishedAt ?? b.createdAt).localeCompare(a.publishedAt ?? a.createdAt)),
      ),

    saveAnnouncement: (a, officerId) =>
      mutate((db) => {
        const existing = a.id ? db.announcements.find((x) => x.id === a.id) : undefined;
        if (existing) {
          existing.title = a.title;
          existing.body = a.body;
          if (a.published && !existing.published) existing.publishedAt = now();
          existing.published = a.published;
          db.audit.push(auditRow(officerId, "announcement.update", existing.id, { published: a.published }));
          return existing;
        }
        const row: Announcement = {
          id: randomUUID(),
          title: a.title,
          body: a.body,
          published: a.published,
          publishedAt: a.published ? now() : null,
          createdAt: now(),
        };
        db.announcements.push(row);
        db.audit.push(auditRow(officerId, "announcement.create", row.id, { published: a.published }));
        return row;
      }),

    deleteAnnouncement: (id, officerId) =>
      mutate((db) => {
        db.announcements = db.announcements.filter((a) => a.id !== id);
        db.audit.push(auditRow(officerId, "announcement.delete", id, {}));
      }),

    rateLimit: (key, limit, windowSeconds) =>
      mutate((db) => {
        const t = Date.now();
        const windowStart = Math.floor(t / (windowSeconds * 1000)) * windowSeconds * 1000;
        const entry = db.rateLimits[key];
        if (!entry || entry.windowStart !== windowStart) db.rateLimits[key] = { windowStart, count: 1 };
        else entry.count += 1;
        // Opportunistic cleanup of stale windows.
        for (const [k, v] of Object.entries(db.rateLimits)) if (t - v.windowStart > 86_400_000) delete db.rateLimits[k];
        return db.rateLimits[key].count <= limit;
      }),

    sendVerificationCode: async (email) => {
      const code = newCode();
      await mutate((db) => {
        db.verifications[email] = { codeHash: pepperedHash(`${email}:${code}`), expiresAt: Date.now() + 10 * 60_000, attempts: 0 };
      });
      // Development "outbox": no email is sent. The code is shown in the dev server log.
      const line = `[${now()}] Verification code for ${email}: ${code}\n`;
      await mkdir(dir(), { recursive: true });
      await appendFile(path.join(dir(), "outbox.log"), line);
      console.info(`\n[EIC local outbox] ${line}`);
    },

    checkVerificationCode: (email, code) =>
      mutate((db) => {
        const v = db.verifications[email];
        if (!v || v.expiresAt < Date.now() || v.attempts >= 5) return false;
        v.attempts += 1;
        const ok = safeEqual(v.codeHash, pepperedHash(`${email}:${code}`));
        if (ok) delete db.verifications[email];
        return ok;
      }),

    createUpload: (u) =>
      mutate((db) => {
        const upload: UploadRecord = {
          id: randomUUID(),
          kind: u.kind,
          storagePath: u.storagePath,
          fileName: u.fileName,
          mimeType: u.mimeType,
          declaredSize: u.declaredSize,
          actualSize: null,
          clientDurationSeconds: u.clientDurationSeconds,
          ownerTokenHash: u.ownerTokenHash,
          status: "pending",
          isTest: u.isTest,
          createdAt: now(),
        };
        db.uploads.push(upload);
        const token = signToken({ id: upload.id }, 3600, "local-upload");
        return { upload, target: { mode: "local" as const, url: `/api/uploads/local/${upload.id}?t=${encodeURIComponent(token)}` } };
      }),

    getUpload: (id) => read((db) => db.uploads.find((u) => u.id === id) ?? null),

    confirmUpload: (id) =>
      mutate(async (db) => {
        const u = db.uploads.find((x) => x.id === id);
        if (!u) throw new StoreError("not_found", "Upload not found.");
        let size: number;
        try {
          size = (await stat(path.join(localUploadsDir(), u.storagePath))).size;
        } catch {
          throw new StoreError("invalid_upload", "The file didn’t finish uploading. Try again.");
        }
        if (size !== u.declaredSize) throw new StoreError("invalid_upload", "The uploaded file is incomplete. Try again.");
        u.actualSize = size;
        if (u.status === "pending") u.status = "uploaded";
        return u;
      }),

    createSubmission: (s) =>
      mutate((db) => {
        const window = submissionWindow(db.settings);
        // Idempotent replay: same key from the same person returns the original entry.
        const prior = db.submissions.find((x) => x.idempotencyKey === s.idempotencyKey);
        if (prior) {
          if (prior.leadEmail !== s.leadEmail) throw new StoreError("forbidden", "This submission key was already used.");
          return { id: prior.id, reference: prior.reference, replayed: true };
        }
        if (window.state !== "open") throw new StoreError("closed", "Submissions are not open right now.");

        const taken = allEmails(db, s.isTest);
        const emails = [s.leadEmail, ...s.members.map((m) => m.email).filter((e): e is string => !!e)];
        if (emails.some((e) => taken.has(e)))
          throw new StoreError("duplicate_email", "A submission already exists for this student. Each student can be part of one submission.");
        if (db.submissions.some((x) => x.reference === s.reference))
          throw new StoreError("reference_collision", "Reference collision");

        const id = randomUUID();
        const assets: SubmissionAsset[] = s.assets.map((a) => {
          if (a.source === "link")
            return {
              id: randomUUID(),
              kind: a.kind,
              source: "link",
              url: a.url,
              uploadId: null,
              storagePath: null,
              fileName: null,
              mimeType: null,
              sizeBytes: null,
              durationSeconds: null,
              durationStatus: a.durationStatus,
            };
          const up = db.uploads.find((u) => u.id === a.uploadId);
          if (!up || up.kind !== a.kind || up.status !== "uploaded" || up.ownerTokenHash !== s.ownerTokenHash || up.isTest !== s.isTest)
            throw new StoreError("invalid_upload", `Your ${a.kind === "video" ? "video" : "prototype"} upload couldn’t be found. Upload it again.`);
          return {
            id: randomUUID(),
            kind: a.kind,
            source: "file",
            url: null,
            uploadId: up.id,
            storagePath: up.storagePath,
            fileName: up.fileName,
            mimeType: up.mimeType,
            sizeBytes: up.actualSize,
            durationSeconds: up.clientDurationSeconds,
            durationStatus: a.durationStatus,
          };
        });
        for (const a of assets) {
          const up = a.uploadId ? db.uploads.find((u) => u.id === a.uploadId) : null;
          if (up) up.status = "attached";
        }
        const row: LocalSubmission = {
          id,
          reference: s.reference,
          idempotencyKey: s.idempotencyKey,
          ipHash: s.ipHash,
          ownerTokenHash: s.ownerTokenHash,
          entryType: s.entryType,
          leadEmail: s.leadEmail,
          emailVerified: s.emailVerified,
          members: s.members,
          projectName: s.projectName,
          description: s.description,
          problem: s.problem,
          solution: s.solution,
          targetAudience: s.targetAudience,
          category: s.category,
          aiUsed: s.aiUsed,
          aiTools: s.aiTools,
          aiContribution: s.aiContribution,
          aiNoneConfirmed: s.aiNoneConfirmed,
          rulesAgreedAt: now(),
          rulesVersion: s.rulesVersion,
          publicationPermission: s.publicationPermission,
          eligibility: "pending",
          eligibilityNote: null,
          eligibilityReviewedBy: null,
          eligibilityReviewedAt: null,
          flags: s.flags,
          isTest: s.isTest,
          submittedAt: now(),
          assets,
        };
        db.submissions.push(row);
        return { id, reference: s.reference, replayed: false };
      }),

    listSubmissions: (f) =>
      read((db) => {
        const q = f.q?.trim().toLowerCase();
        return db.submissions
          .filter((s) => (f.includeTest ?? true) || !s.isTest)
          .filter((s) => !f.category || f.category === "all" || s.category === f.category)
          .filter((s) => !f.eligibility || f.eligibility === "all" || s.eligibility === f.eligibility)
          .filter((s) => !f.flagged || s.flags.length > 0)
          .filter(
            (s) =>
              !q ||
              [s.reference, s.projectName, s.leadEmail, ...s.members.map((m) => m.fullName)]
                .join(" ")
                .toLowerCase()
                .includes(q),
          )
          .toSorted((a, b) => b.submittedAt.localeCompare(a.submittedAt))
          .map(
            (s): SubmissionSummary => ({
              id: s.id,
              reference: s.reference,
              projectName: s.projectName,
              category: s.category,
              entryType: s.entryType,
              memberNames: s.members.map((m) => m.fullName),
              eligibility: s.eligibility,
              flags: s.flags,
              isTest: s.isTest,
              submittedAt: s.submittedAt,
            }),
          );
      }),

    getSubmission: (id) =>
      read((db) => {
        const s = db.submissions.find((x) => x.id === id);
        return s ? stripSubmission(s) : null;
      }),

    listAllSubmissions: (includeTest) =>
      read((db) => db.submissions.filter((s) => includeTest || !s.isTest).map(stripSubmission)),

    setEligibility: (id, status, note, officerId) =>
      mutate((db) => {
        const s = db.submissions.find((x) => x.id === id);
        if (!s) throw new StoreError("not_found", "Submission not found.");
        s.eligibility = status;
        s.eligibilityNote = note;
        s.eligibilityReviewedBy = officerId;
        s.eligibilityReviewedAt = now();
        db.audit.push(auditRow(officerId, "submission.eligibility", id, { status }));
      }),

    listScores: (f) =>
      read((db) =>
        db.scores.filter((r) => (!f.submissionId || r.submissionId === f.submissionId) && (!f.judgeId || r.judgeId === f.judgeId)),
      ),

    saveScore: (r) =>
      mutate((db) => {
        if (!db.submissions.some((s) => s.id === r.submissionId)) throw new StoreError("not_found", "Submission not found.");
        let row = db.scores.find((x) => x.submissionId === r.submissionId && x.judgeId === r.judgeId);
        if (row) Object.assign(row, { scores: r.scores, comments: r.comments, status: r.status, updatedAt: now() });
        else {
          row = { id: randomUUID(), ...r, updatedAt: now() };
          db.scores.push(row);
        }
        db.audit.push(auditRow(r.judgeId, `score.${r.status}`, r.submissionId, {}));
        return row;
      }),

    getOfficerById: (id) =>
      read((db) => {
        const o = db.officers.find((x) => x.id === id);
        return o ? publicOfficer(o) : null;
      }),

    listOfficers: () => read((db) => db.officers.map(publicOfficer)),

    signedFileUrl: async (asset, { download, ttlSeconds }) => {
      if (asset.source !== "file" || !asset.storagePath) return null;
      const token = signToken(
        { p: asset.storagePath, n: asset.fileName, m: asset.mimeType, d: download ? 1 : 0 },
        ttlSeconds,
        "local-file",
      );
      return `/api/files/local?t=${encodeURIComponent(token)}`;
    },

    audit: (e) =>
      mutate((db) => {
        db.audit.push(auditRow(e.officerId, e.action, e.target ?? null, e.details ?? {}));
        if (db.audit.length > 5000) db.audit.splice(0, db.audit.length - 5000);
      }),

    listAudit: (limit) => read((db) => db.audit.slice(-limit).reverse()),
  };
}

function auditRow(officerId: string | null, action: string, target: string | null, details: Record<string, unknown>): AuditEvent {
  return { id: randomUUID(), officerId, action, target, details, createdAt: now() };
}

/* ---------- Local-only helpers (officer accounts, upload streaming) ---------- */

export async function findLocalOfficerByEmail(email: string): Promise<LocalOfficer | null> {
  return read((db) => db.officers.find((o) => o.email === email.toLowerCase()) ?? null);
}

export async function upsertLocalOfficer(o: Omit<LocalOfficer, "id"> & { id?: string }): Promise<Officer> {
  return mutate((db) => {
    const existing = db.officers.find((x) => x.email === o.email.toLowerCase());
    if (existing) {
      Object.assign(existing, { ...o, id: existing.id, email: o.email.toLowerCase() });
      return publicOfficer(existing);
    }
    const row: LocalOfficer = { ...o, id: o.id ?? randomUUID(), email: o.email.toLowerCase() };
    db.officers.push(row);
    return publicOfficer(row);
  });
}

/** Streams a request body to disk, aborting once it exceeds `maxBytes`. */
export async function writeLocalUpload(storagePath: string, body: ReadableStream<Uint8Array>, maxBytes: number): Promise<number> {
  const target = path.join(localUploadsDir(), storagePath);
  if (!target.startsWith(localUploadsDir() + path.sep)) throw new StoreError("invalid_upload", "Invalid path");
  await mkdir(path.dirname(target), { recursive: true });
  let written = 0;
  const limiter = new Transform({
    transform(chunk: Buffer, _enc, cb) {
      written += chunk.length;
      if (written > maxBytes) cb(new StoreError("invalid_upload", "File is larger than allowed."));
      else cb(null, chunk);
    },
  });
  await pipeline(Readable.fromWeb(body as import("node:stream/web").ReadableStream), limiter, createWriteStream(target));
  return written;
}

export function resolveLocalUpload(storagePath: string): string | null {
  const target = path.join(localUploadsDir(), storagePath);
  return target.startsWith(localUploadsDir() + path.sep) ? target : null;
}

/** Test helper: replaces the whole local database. */
export async function resetLocalDb(seed?: Partial<LocalDb>) {
  await serialize(() => save({ ...emptyDb(), ...seed }));
}
