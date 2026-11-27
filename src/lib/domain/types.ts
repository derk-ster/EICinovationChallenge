import type { CategoryId, RubricKey } from "@/content/competition";

export type OfficerRole = "judge" | "admin";
export type EntryType = "individual" | "team";
export type EligibilityStatus = "pending" | "eligible" | "ineligible";
export type AssetKind = "prototype" | "video";
export type DurationStatus = "detected_in_range" | "unverified" | "not_applicable";

export interface Announcement {
  id: string;
  title: string;
  body: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
}

/** Officer-editable competition configuration. All timestamps are ISO-8601 UTC. */
export interface CompetitionSettings {
  submissionsEnabled: boolean;
  opensAt: string | null;
  deadlineAt: string | null;
  extensionUntil: string | null;
  extensionNote: string | null;
  announcedAt: string | null;
  winnerAnnouncementAt: string | null;
  allowedEmailDomains: string[];
  requireEmailVerification: boolean;
  minJudgesPerEntry: number;
  resultsFinalizedAt: string | null;
  updatedAt: string | null;
}

/** The subset of settings that is safe to send to any visitor. */
export interface PublicSettings {
  submissionsEnabled: boolean;
  opensAt: string | null;
  deadlineAt: string | null;
  extensionUntil: string | null;
  extensionNote: string | null;
  announcedAt: string | null;
  winnerAnnouncementAt: string | null;
  allowedEmailDomains: string[];
  requireEmailVerification: boolean;
}

export interface Officer {
  id: string;
  email: string;
  displayName: string;
  role: OfficerRole;
  active: boolean;
}

export interface TeamMember {
  position: 1 | 2;
  fullName: string;
  grade: number;
  email: string | null;
}

export interface SubmissionAsset {
  id: string;
  kind: AssetKind;
  source: "file" | "link";
  url: string | null;
  uploadId: string | null;
  storagePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
  durationStatus: DurationStatus;
}

export interface Submission {
  id: string;
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
  rulesAgreedAt: string;
  rulesVersion: string;
  publicationPermission: boolean;
  eligibility: EligibilityStatus;
  eligibilityNote: string | null;
  eligibilityReviewedBy: string | null;
  eligibilityReviewedAt: string | null;
  flags: string[];
  isTest: boolean;
  submittedAt: string;
  assets: SubmissionAsset[];
}

export type RubricScores = Record<RubricKey, number | null>;

export interface ScoreRecord {
  id: string;
  submissionId: string;
  judgeId: string;
  scores: RubricScores;
  comments: string | null;
  status: "draft" | "submitted";
  updatedAt: string;
}

export interface UploadRecord {
  id: string;
  kind: AssetKind;
  storagePath: string;
  fileName: string;
  mimeType: string;
  declaredSize: number;
  actualSize: number | null;
  clientDurationSeconds: number | null;
  ownerTokenHash: string;
  status: "pending" | "uploaded" | "attached";
  isTest: boolean;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  officerId: string | null;
  action: string;
  target: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}
