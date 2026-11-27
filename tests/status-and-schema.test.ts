import { describe, expect, it } from "vitest";
import { defaultSettings, effectiveDeadline, submissionWindow } from "@/lib/domain/status";
import { checkLink } from "@/lib/domain/links";
import { durationInRange, emailDomainAllowed, issuesToErrors, submissionSchema } from "@/lib/domain/submission-schema";
import { mimeFor, sanitizeFileName } from "@/lib/domain/files";

const base = { ...defaultSettings, submissionsEnabled: true };
const at = (iso: string) => new Date(iso);

describe("submission window", () => {
  it("is closed by default until officers open it", () => {
    expect(submissionWindow(defaultSettings).state).toBe("disabled");
  });
  it("respects open and deadline times", () => {
    const s = { ...base, opensAt: "2026-12-01T00:00:00Z", deadlineAt: "2026-12-20T23:59:00Z" };
    expect(submissionWindow(s, at("2026-11-30T12:00:00Z")).state).toBe("not-yet-open");
    expect(submissionWindow(s, at("2026-12-10T12:00:00Z")).state).toBe("open");
    expect(submissionWindow(s, at("2026-12-21T00:00:00Z")).state).toBe("closed");
  });
  it("applies an announced extension", () => {
    const s = { ...base, deadlineAt: "2026-12-20T23:59:00Z", extensionUntil: "2026-12-22T23:59:00Z" };
    expect(effectiveDeadline(s)).toBe("2026-12-22T23:59:00Z");
    const w = submissionWindow(s, at("2026-12-21T10:00:00Z"));
    expect(w.state).toBe("open");
    if (w.state === "open") expect(w.extended).toBe(true);
  });
  it("is open without a deadline when enabled (deadline to be announced)", () => {
    expect(submissionWindow(base).state).toBe("open");
  });
});

const valid = {
  idempotencyKey: "4d1c8a3e-7f0b-4a5c-9d2e-1b3f5a7c9e11",
  participant: { entryType: "individual", lead: { fullName: "Avery Test", grade: "10", email: "Avery@Example.test" }, partner: null },
  project: {
    projectName: "Locker Lift",
    description: "A small lift that makes reaching the top shelf of a locker easier.",
    problem: "Short students can’t reach the top shelf of their lockers comfortably.",
    solution: "A spring-loaded tray that slides down when you pull a tab.",
    targetAudience: "Middle and high school students",
    category: "physical-product",
  },
  materials: {
    prototype: { source: "link", url: "https://www.figma.com/file/abc" },
    video: { source: "link", url: "https://youtu.be/xyz" },
  },
  ai: { used: false, noneConfirmed: true },
  review: { rulesAgreed: true, publicationPermission: false },
};

describe("submission schema", () => {
  it("accepts a valid individual entry and normalizes email", () => {
    const r = submissionSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.participant.lead.email).toBe("avery@example.test");
      expect(r.data.participant.lead.grade).toBe(10);
    }
  });
  it("requires a partner for team entries", () => {
    const r = submissionSchema.safeParse({ ...valid, participant: { ...valid.participant, entryType: "team", partner: null } });
    expect(r.success).toBe(false);
    if (!r.success) expect(Object.keys(issuesToErrors(r.error))).toContain("participant.partner.fullName");
  });
  it("only supports teams of up to two (no third member field exists)", () => {
    const r = submissionSchema.safeParse({
      ...valid,
      participant: { ...valid.participant, entryType: "team", partner: { fullName: "Blake", grade: 11 }, third: { fullName: "X" } },
    });
    expect(r.success).toBe(true);
    if (r.success) expect(Object.keys(r.data.participant)).not.toContain("third");
  });
  it("rejects grades outside 9–12", () => {
    expect(submissionSchema.safeParse({ ...valid, participant: { ...valid.participant, lead: { ...valid.participant.lead, grade: "8" } } }).success).toBe(false);
  });
  it("requires AI tools and explanation when AI was used", () => {
    const r = submissionSchema.safeParse({ ...valid, ai: { used: true, tools: "", contribution: "" } });
    expect(r.success).toBe(false);
    if (!r.success) {
      const e = issuesToErrors(r.error);
      expect(e["ai.tools"]).toBeTruthy();
      expect(e["ai.contribution"]).toBeTruthy();
    }
  });
  it("requires confirmation when no AI was used", () => {
    expect(submissionSchema.safeParse({ ...valid, ai: { used: false, noneConfirmed: false } }).success).toBe(false);
  });
  it("requires rules agreement; publication permission is separate and optional", () => {
    expect(submissionSchema.safeParse({ ...valid, review: { rulesAgreed: false, publicationPermission: true } }).success).toBe(false);
    const ok = submissionSchema.safeParse({ ...valid, review: { rulesAgreed: true } });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.review.publicationPermission).toBe(false);
  });
  it("rejects unsafe links", () => {
    for (const url of ["http://example.com", "javascript:alert(1)", "https://localhost/x", "https://192.168.0.1/v", "https://user:pw@site.com"]) {
      expect(checkLink(url).ok, url).toBe(false);
    }
    expect(checkLink("https://drive.google.com/file/d/1").ok).toBe(true);
  });
});

describe("helpers", () => {
  it("checks configurable school email domains", () => {
    expect(emailDomainAllowed("a@school.org", [])).toBe(true);
    expect(emailDomainAllowed("a@school.org", ["school.org"])).toBe(true);
    expect(emailDomainAllowed("a@gmail.com", ["school.org"])).toBe(false);
  });
  it("enforces 2–3 minute videos with one second of encoder slack", () => {
    expect(durationInRange(119.5)).toBe(true);
    expect(durationInRange(110)).toBe(false);
    expect(durationInRange(180.6)).toBe(true);
    expect(durationInRange(200)).toBe(false);
  });
  it("derives content types from extensions and sanitizes names", () => {
    expect(mimeFor("video", "pitch.MP4")).toBe("video/mp4");
    expect(mimeFor("video", "pitch.pdf")).toBeNull();
    expect(mimeFor("prototype", "evil.exe")).toBeNull();
    expect(sanitizeFileName("../../My Pitch (final).mp4")).toBe("My-Pitch-final.mp4");
  });
});
