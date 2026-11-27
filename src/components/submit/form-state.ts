import { stepSchemas, issuesToErrors } from "@/lib/domain/submission-schema";

export type StepKey = "participant" | "project" | "materials" | "ai" | "review";

export const steps: { key: StepKey; title: string; short: string }[] = [
  { key: "participant", title: "Participant information", short: "You" },
  { key: "project", title: "Project information", short: "Project" },
  { key: "materials", title: "Submission materials", short: "Materials" },
  { key: "ai", title: "AI disclosure", short: "AI use" },
  { key: "review", title: "Review and confirm", short: "Review" },
];

export interface UploadState {
  status: "idle" | "checking" | "uploading" | "done" | "error";
  progress: number;
  uploadId?: string;
  fileName?: string;
  size?: number;
  durationSeconds?: number | null;
  error?: string;
}

export interface AssetState {
  mode: "file" | "link";
  url: string;
  upload: UploadState;
}

export interface FormState {
  idempotencyKey: string;
  participant: {
    entryType: "" | "individual" | "team";
    lead: { fullName: string; grade: string; email: string };
    partner: { fullName: string; grade: string; email: string };
  };
  project: {
    projectName: string;
    description: string;
    problem: string;
    solution: string;
    targetAudience: string;
    category: string;
  };
  materials: { prototype: AssetState; video: AssetState };
  ai: { used: null | boolean; tools: string; contribution: string; noneConfirmed: boolean };
  review: { rulesAgreed: boolean; publicationPermission: boolean };
}

const emptyAsset = (): AssetState => ({ mode: "file", url: "", upload: { status: "idle", progress: 0 } });

export function initialState(): FormState {
  return {
    idempotencyKey: crypto.randomUUID(),
    participant: {
      entryType: "",
      lead: { fullName: "", grade: "", email: "" },
      partner: { fullName: "", grade: "", email: "" },
    },
    project: { projectName: "", description: "", problem: "", solution: "", targetAudience: "", category: "" },
    materials: { prototype: emptyAsset(), video: emptyAsset() },
    ai: { used: null, tools: "", contribution: "", noneConfirmed: false },
    review: { rulesAgreed: false, publicationPermission: false },
  };
}

function assetPayload(a: AssetState) {
  if (a.mode === "link") return { source: "link", url: a.url };
  return { source: "file", uploadId: a.upload.status === "done" ? (a.upload.uploadId ?? "") : "" };
}

/** Shapes the form state into the API payload (validated again on the server). */
export function toPayload(s: FormState) {
  const p = s.participant;
  return {
    idempotencyKey: s.idempotencyKey,
    participant: {
      entryType: p.entryType || undefined,
      lead: { fullName: p.lead.fullName, grade: p.lead.grade || undefined, email: p.lead.email },
      partner:
        p.entryType === "team"
          ? { fullName: p.partner.fullName, grade: p.partner.grade || undefined, email: p.partner.email || undefined }
          : null,
    },
    project: { ...s.project, category: s.project.category || undefined },
    materials: { prototype: assetPayload(s.materials.prototype), video: assetPayload(s.materials.video) },
    ai: {
      used: s.ai.used ?? undefined,
      tools: s.ai.tools,
      contribution: s.ai.contribution,
      noneConfirmed: s.ai.noneConfirmed,
    },
    review: s.review,
  };
}

/** Validates one step; returns errors keyed by full path, e.g. "participant.lead.email". */
export function validateStep(key: StepKey, s: FormState): Record<string, string> {
  const payload = toPayload(s) as Record<string, unknown>;
  const schema = stepSchemas[key];
  const result = schema.safeParse(payload[key]);
  const errors: Record<string, string> = {};
  if (!result.success) {
    for (const [k, v] of Object.entries(issuesToErrors(result.error))) errors[k === "_form" ? key : `${key}.${k}`] = v;
  }
  if (key === "materials") {
    for (const kind of ["prototype", "video"] as const) {
      const a = s.materials[kind];
      if (a.mode === "file" && a.upload.status === "uploading") errors[`materials.${kind}`] = "Wait for the upload to finish.";
      else if (a.mode === "file" && a.upload.status !== "done")
        errors[`materials.${kind}`] = kind === "video" ? "Upload your video or switch to a link." : "Upload your file or switch to a link.";
    }
    // Collapse nested discriminated-union messages to the asset level.
    for (const k of Object.keys(errors)) {
      const m = /^materials\.(prototype|video)\./.exec(k);
      if (m) {
        errors[`materials.${m[1]}`] ??= errors[k];
        delete errors[k];
      }
    }
  }
  return errors;
}

export function stepOfField(path: string): StepKey {
  const head = path.split(".")[0] as StepKey;
  return steps.some((s) => s.key === head) ? head : "review";
}

const STORAGE_KEY = "eic-submission-draft-v1";

/** Text answers survive a reload in this tab only (sessionStorage); files must be re-uploaded. */
export function saveDraft(s: FormState) {
  try {
    const { materials, ...rest } = s;
    const keepLinks = {
      prototype: { ...materials.prototype, upload: materials.prototype.upload.status === "done" ? materials.prototype.upload : { status: "idle", progress: 0 } },
      video: { ...materials.video, upload: materials.video.upload.status === "done" ? materials.video.upload : { status: "idle", progress: 0 } },
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...rest, materials: keepLinks }));
  } catch {
    /* storage unavailable */
  }
}

export function loadDraft(): FormState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FormState;
    return { ...initialState(), ...parsed };
  } catch {
    return null;
  }
}

export function clearDraft() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Random per-tab id sent with uploads and the submission so uploads can only be attached by their uploader. */
export function draftToken(): string {
  const KEY = "eic-draft-token";
  try {
    const existing = sessionStorage.getItem(KEY);
    if (existing) return existing;
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    sessionStorage.setItem(KEY, token);
    return token;
  } catch {
    const g = globalThis as { __eicDraft?: string };
    g.__eicDraft ??= Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
    return g.__eicDraft;
  }
}

export function resetDraftToken() {
  try {
    sessionStorage.removeItem("eic-draft-token");
  } catch {
    /* ignore */
  }
}
