import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

// Isolated, throwaway local store for this test file.
const dir = mkdtempSync(path.join(tmpdir(), "eic-test-"));
process.env.EIC_LOCAL_DATA_DIR = dir;
process.env.EIC_DATA_BACKEND = "local";

const { defaultSettings } = await import("@/lib/domain/status");
const { resetLocalDb, writeLocalUpload } = await import("@/lib/server/store/local");
const { getStore } = await import("@/lib/server/store");
const { submitEntry, initUpload, completeUpload } = await import("@/lib/server/submissions");

afterAll(() => rmSync(dir, { recursive: true, force: true }));

const owner = "owner-hash-a";
const other = "owner-hash-b";

function entry(overrides: Record<string, unknown> = {}) {
  return {
    idempotencyKey: crypto.randomUUID(),
    participant: { entryType: "individual", lead: { fullName: "Avery Test", grade: 10, email: "avery@school.test" }, partner: null },
    project: {
      projectName: "Locker Lift",
      description: "A small lift that makes reaching the top shelf of a locker easier.",
      problem: "Short students can’t reach the top shelf of their lockers comfortably.",
      solution: "A spring-loaded tray that slides down when you pull a tab.",
      targetAudience: "High school students",
      category: "physical-product",
    },
    materials: { prototype: { source: "link", url: "https://www.figma.com/file/abc" }, video: { source: "link", url: "https://youtu.be/xyz" } },
    ai: { used: true, tools: "ChatGPT", contribution: "Helped brainstorm names; I designed and built everything else." },
    review: { rulesAgreed: true, publicationPermission: false },
    ...overrides,
  };
}

const ctx = (verifiedEmail: string | null = "avery@school.test", ownerHash = owner) => ({ ownerHash, verifiedEmail, ipHash: "ip" });

async function open(extra: Partial<typeof defaultSettings> = {}) {
  await resetLocalDb({ settings: { ...defaultSettings, submissionsEnabled: true, requireEmailVerification: true, ...extra } });
}

describe("server-side submission rules", () => {
  beforeEach(() => open());

  it("saves a valid entry and returns a reference", async () => {
    const r = await submitEntry(entry(), ctx());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.reference).toMatch(/^EIC-[2-9A-HJKMNP-Z]{6}$/);
    const saved = await getStore().listAllSubmissions(true);
    expect(saved).toHaveLength(1);
    expect(saved[0].flags).toContain("video-duration-review"); // linked video → officer checks length
    expect(saved[0].publicationPermission).toBe(false);
  });

  it("rejects invalid input with field errors", async () => {
    const bad = entry({ project: { projectName: "", description: "short", problem: "", solution: "", targetAudience: "", category: "nope" } });
    const r = await submitEntry(bad, ctx());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.status).toBe(422);
      expect(r.fieldErrors?.["project.projectName"]).toBeTruthy();
      expect(r.fieldErrors?.["project.category"]).toBeTruthy();
    }
    expect(await getStore().listAllSubmissions(true)).toHaveLength(0);
  });

  it("requires a verified email when verification is on", async () => {
    const r = await submitEntry(entry(), ctx(null));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
    const wrong = await submitEntry(entry(), ctx("someone.else@school.test"));
    expect(wrong.ok).toBe(false);
  });

  it("is idempotent for retries of the same request", async () => {
    const e = entry();
    const first = await submitEntry(e, ctx());
    const second = await submitEntry(e, ctx());
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.data.reference).toBe(first.data.reference);
      expect(second.data.replayed).toBe(true);
    }
    expect(await getStore().listAllSubmissions(true)).toHaveLength(1);
  });

  it("blocks a second submission from the same student", async () => {
    await submitEntry(entry(), ctx());
    const r = await submitEntry(entry(), ctx());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
  });

  it("blocks a student who is already someone else's partner", async () => {
    await open({ requireEmailVerification: false });
    await submitEntry(
      entry({
        participant: {
          entryType: "team",
          lead: { fullName: "Blake Sample", grade: 11, email: "blake@school.test" },
          partner: { fullName: "Avery Test", grade: 10, email: "avery@school.test" },
        },
      }),
      ctx(null),
    );
    const r = await submitEntry(entry(), ctx(null));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
  });

  it("enforces the deadline, opening time and master switch on the server", async () => {
    await open({ deadlineAt: new Date(Date.now() - 60_000).toISOString() });
    expect((await submitEntry(entry(), ctx())).ok).toBe(false);
    await open({ opensAt: new Date(Date.now() + 3600_000).toISOString() });
    expect((await submitEntry(entry(), ctx())).ok).toBe(false);
    await open({ submissionsEnabled: false });
    const r = await submitEntry(entry(), ctx());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it("accepts entries during an announced extension", async () => {
    await open({ deadlineAt: new Date(Date.now() - 60_000).toISOString(), extensionUntil: new Date(Date.now() + 3600_000).toISOString() });
    expect((await submitEntry(entry(), ctx())).ok).toBe(true);
  });

  it("enforces configured school email domains", async () => {
    await open({ allowedEmailDomains: ["students.example.org"] });
    const r = await submitEntry(entry(), ctx());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.["participant.lead.email"]).toMatch(/students\.example\.org/);
  });
});

describe("uploads", () => {
  beforeEach(() => open());

  it("rejects disallowed types, oversized files and out-of-range videos", async () => {
    const c = { ownerHash: owner, verifiedEmail: "avery@school.test" };
    expect((await initUpload({ kind: "prototype", fileName: "virus.exe", size: 10 }, c)).ok).toBe(false);
    expect((await initUpload({ kind: "video", fileName: "pitch.pdf", size: 10 }, c)).ok).toBe(false);
    expect((await initUpload({ kind: "video", fileName: "pitch.mp4", size: 999 * 1024 * 1024 }, c)).ok).toBe(false);
    const short = await initUpload({ kind: "video", fileName: "pitch.mp4", size: 1000, durationSeconds: 45 }, c);
    expect(short.ok).toBe(false);
    if (!short.ok) expect(short.status).toBe(422);
  });

  it("requires verification before uploading", async () => {
    const r = await initUpload({ kind: "prototype", fileName: "a.png", size: 10 }, { ownerHash: owner, verifiedEmail: null });
    expect(r.ok).toBe(false);
  });

  it("stores a file privately, confirms its size, and binds it to its uploader", async () => {
    const c = { ownerHash: owner, verifiedEmail: "avery@school.test" };
    const bytes = new TextEncoder().encode("fake-mp4-bytes-for-test");
    const init = await initUpload({ kind: "video", fileName: "pitch.mp4", size: bytes.length, durationSeconds: 150 }, c);
    expect(init.ok).toBe(true);
    if (!init.ok) return;

    // Not yet written → completion fails.
    expect((await completeUpload(init.data.uploadId, owner)).ok).toBe(false);
    const upload = await getStore().getUpload(init.data.uploadId);
    await writeLocalUpload(upload!.storagePath, new Blob([bytes]).stream(), upload!.declaredSize);
    // Someone else can't confirm or use it.
    expect((await completeUpload(init.data.uploadId, other)).ok).toBe(false);
    expect((await completeUpload(init.data.uploadId, owner)).ok).toBe(true);

    const withFile = (key: string) =>
      entry({ idempotencyKey: key, materials: { prototype: { source: "link", url: "https://example.org/demo" }, video: { source: "file", uploadId: init.data.uploadId } } });
    const stolen = await submitEntry(withFile(crypto.randomUUID()), ctx("avery@school.test", other));
    expect(stolen.ok).toBe(false);

    const ok = await submitEntry(withFile(crypto.randomUUID()), ctx());
    expect(ok.ok).toBe(true);
    const [saved] = await getStore().listAllSubmissions(true);
    const video = saved.assets.find((a) => a.kind === "video")!;
    expect(video.durationStatus).toBe("detected_in_range");
    expect(saved.flags).not.toContain("video-duration-review");
    expect((await getStore().signedFileUrl(video, { download: false, ttlSeconds: 60 }))?.startsWith("/api/files/local?t=")).toBe(true);
  });

  it("refuses to write more bytes than declared", async () => {
    const c = { ownerHash: owner, verifiedEmail: "avery@school.test" };
    const init = await initUpload({ kind: "prototype", fileName: "a.png", size: 4 }, c);
    if (!init.ok) throw new Error(init.error);
    const upload = await getStore().getUpload(init.data.uploadId);
    await expect(writeLocalUpload(upload!.storagePath, new Blob([new Uint8Array(64)]).stream(), 4)).rejects.toThrow();
  });
});

describe("judging storage", () => {
  it("keeps one independent sheet per judge per entry", async () => {
    await open({ requireEmailVerification: false });
    await submitEntry(entry(), ctx(null));
    const [s] = await getStore().listAllSubmissions(true);
    const scores = { innovation: 10, problemSolution: 10, prototypeExecution: 10, businessPotential: 10, presentation: 5, research: 5 };
    await getStore().saveScore({ submissionId: s.id, judgeId: "j1", scores, comments: null, status: "draft" });
    await getStore().saveScore({ submissionId: s.id, judgeId: "j1", scores: { ...scores, innovation: 18 }, comments: null, status: "submitted" });
    await getStore().saveScore({ submissionId: s.id, judgeId: "j2", scores, comments: null, status: "submitted" });
    const all = await getStore().listScores({ submissionId: s.id });
    expect(all).toHaveLength(2);
    expect(all.find((r) => r.judgeId === "j1")?.scores.innovation).toBe(18);
    expect(await getStore().listScores({ judgeId: "j2" })).toHaveLength(1);
  });
});
