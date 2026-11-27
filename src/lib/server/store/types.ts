import "server-only";
import type {
  Announcement,
  AssetKind,
  AuditEvent,
  CompetitionSettings,
  DurationStatus,
  EligibilityStatus,
  EntryType,
  Officer,
  OfficerRole,
  RubricScores,
  ScoreRecord,
  Submission,
  SubmissionAsset,
  TeamMember,
  UploadRecord,
} from "@/lib/domain/types";
import type { CategoryId } from "@/content/competition";

export type StoreErrorCode =
  | "duplicate_email"
  | "closed"
  | "not_found"
  | "invalid_upload"
  | "reference_collision"
  | "forbidden"
  | "verification_failed";

export class StoreError extends Error {
  constructor(
    public code: StoreErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "StoreError";
  }
}

export type NewAsset =
  | { kind: AssetKind; source: "file"; uploadId: string; durationStatus: DurationStatus }
  | { kind: AssetKind; source: "link"; url: string; durationStatus: DurationStatus };

export interface NewSubmission {
  idempotencyKey: string;
  reference: string;
  entryType: EntryType;
  leadEmail: string;
  emailVerified: boolean;
  members: TeamMember[];
  projectName: string;
  description: string;
  problem: string;
  solution: string;
  targetAudience: string;
  category: CategoryId;
  aiUsed: boolean;
  aiTools: string | null;
  aiContribution: string | null;
  aiNoneConfirmed: boolean;
  rulesVersion: string;
  publicationPermission: boolean;
  flags: string[];
  isTest: boolean;
  ipHash: string;
  ownerTokenHash: string;
  assets: NewAsset[];
}

export interface NewUpload {
  kind: AssetKind;
  fileName: string;
  storagePath: string;
  mimeType: string;
  declaredSize: number;
  clientDurationSeconds: number | null;
  ownerTokenHash: string;
  isTest: boolean;
}

export interface UploadTarget {
  /** "local" PUTs the raw file body; "supabase" PUTs multipart form data to a signed URL. */
  mode: "local" | "supabase";
  url: string;
}

export interface SubmissionFilters {
  q?: string;
  category?: string;
  eligibility?: EligibilityStatus | "all";
  flagged?: boolean;
  includeTest?: boolean;
}

export interface SubmissionSummary {
  id: string;
  reference: string;
  projectName: string;
  category: CategoryId;
  entryType: EntryType;
  memberNames: string[];
  eligibility: EligibilityStatus;
  flags: string[];
  isTest: boolean;
  submittedAt: string;
}

export interface DataStore {
  readonly kind: "local" | "supabase";

  getSettings(): Promise<CompetitionSettings>;
  updateSettings(patch: Partial<CompetitionSettings>, officerId: string): Promise<CompetitionSettings>;

  listAnnouncements(opts: { publishedOnly: boolean }): Promise<Announcement[]>;
  saveAnnouncement(a: { id?: string; title: string; body: string; published: boolean }, officerId: string): Promise<Announcement>;
  deleteAnnouncement(id: string, officerId: string): Promise<void>;

  /** Atomic fixed-window counter. Returns true if the action is allowed. */
  rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean>;

  sendVerificationCode(email: string): Promise<void>;
  checkVerificationCode(email: string, code: string): Promise<boolean>;

  createUpload(u: NewUpload): Promise<{ upload: UploadRecord; target: UploadTarget }>;
  getUpload(id: string): Promise<UploadRecord | null>;
  /** Confirms the object really exists in storage and records its real size. */
  confirmUpload(id: string): Promise<UploadRecord>;

  /**
   * Atomically checks the submission window, idempotency key, duplicate
   * emails and upload ownership, then stores the entry.
   */
  createSubmission(s: NewSubmission): Promise<{ id: string; reference: string; replayed: boolean }>;

  listSubmissions(f: SubmissionFilters): Promise<SubmissionSummary[]>;
  getSubmission(id: string): Promise<Submission | null>;
  listAllSubmissions(includeTest: boolean): Promise<Submission[]>;
  setEligibility(id: string, status: EligibilityStatus, note: string | null, officerId: string): Promise<void>;

  listScores(filter: { submissionId?: string; judgeId?: string }): Promise<ScoreRecord[]>;
  saveScore(r: {
    submissionId: string;
    judgeId: string;
    scores: RubricScores;
    comments: string | null;
    status: "draft" | "submitted";
  }): Promise<ScoreRecord>;

  getOfficerById(id: string): Promise<Officer | null>;
  listOfficers(): Promise<Officer[]>;

  /** Time-limited link for an officer to open a private file. */
  signedFileUrl(asset: SubmissionAsset, opts: { download: boolean; ttlSeconds: number }): Promise<string | null>;

  audit(e: { officerId: string | null; action: string; target?: string | null; details?: Record<string, unknown> }): Promise<void>;
  listAudit(limit: number): Promise<AuditEvent[]>;
}

export type { OfficerRole };
