/**
 * Seeds the LOCAL development store with fictional test data.
 * Refuses to run against Supabase so test entries never mix with real ones.
 *
 *   npm run seed            # officers + settings + fictional entries
 *   npm run seed -- --empty # officers + settings only
 *
 * Officer passwords are generated and written to .data/dev-credentials.txt.
 */
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const { backend, localDataDir } = await import("../src/lib/server/env");
  if (backend() !== "local") throw new Error("Seeding is only allowed for the local development store.");
  const { hashPassword, pepperedHash } = await import("../src/lib/server/crypto");
  const { resetLocalDb } = await import("../src/lib/server/store/local");
  const { defaultSettings } = await import("../src/lib/domain/status");

  const officers = [
    { email: "admin@eic.test", displayName: "Morgan Admin", role: "admin" as const },
    { email: "judge.one@eic.test", displayName: "Riley Judge", role: "judge" as const },
    { email: "judge.two@eic.test", displayName: "Jordan Judge", role: "judge" as const },
  ];
  const creds: string[] = [];
  const officerRows: { id: string; email: string; displayName: string; role: "admin" | "judge"; active: boolean; passwordHash: string }[] = [];
  for (const o of officers) {
    const password = randomBytes(12).toString("base64url");
    creds.push(`${o.email}\t${o.role}\t${password}`);
    officerRows.push({ ...o, id: randomUUID(), active: true, passwordHash: await hashPassword(password) });
  }

  const now = Date.now();
  const settings = {
    ...defaultSettings,
    submissionsEnabled: true,
    opensAt: null,
    deadlineAt: new Date(now + 21 * 86400_000).toISOString(),
    announcedAt: new Date(now - 2 * 86400_000).toISOString(),
    requireEmailVerification: true,
    updatedAt: new Date().toISOString(),
  };

  const empty = process.argv.includes("--empty");
  const fictional = empty
    ? []
    : [
        { name: "Locker Lift", cat: "physical-product", people: [["Avery Testcase", 10, "avery@example.test"]], ai: false },
        { name: "StudyCircle", cat: "website-app", people: [["Blake Sample", 11, "blake@example.test"], ["Casey Fixture", 11, null]], ai: true },
        { name: "Thread Again", cat: "business-startup", people: [["Devon Placeholder", 12, "devon@example.test"]], ai: true },
        { name: "Tech Buddies", cat: "service", people: [["Emerson Mock", 9, "emerson@example.test"]], ai: false },
        { name: "Sprout Sensor", cat: "software-tool", people: [["Finley Demo", 12, "finley@example.test"], ["Gray Example", 12, "gray@example.test"]], ai: true },
        { name: "Faster Lunch Line", cat: "improvement", people: [["Harper Trial", 10, "harper@example.test"]], ai: false },
      ];

  const submissions = fictional.map((f, i) => {
    const id = randomUUID();
    const flags = i % 2 === 0 ? ["video-duration-review"] : [];
    return {
      id,
      reference: `EIC-${["7KQ4MZ", "H3XP2B", "R9TW6C", "M2VJ8D", "Q5NA3E", "W8KD4F"][i]}`,
      idempotencyKey: randomUUID(),
      ipHash: "seed",
      ownerTokenHash: pepperedHash(`seed-${i}`),
      entryType: f.people.length === 2 ? "team" : "individual",
      leadEmail: f.people[0][2] as string,
      emailVerified: true,
      members: f.people.map((p, j) => ({ position: (j + 1) as 1 | 2, fullName: p[0] as string, grade: p[1] as number, email: (p[2] as string) ?? null })),
      projectName: f.name,
      description: `${f.name} is a fictional test project used to preview the officer dashboard.`,
      problem: "This is placeholder text describing a problem a student noticed at school.",
      solution: "This is placeholder text describing how the fictional project would solve it.",
      targetAudience: "Fictional students and teachers.",
      category: f.cat,
      aiUsed: f.ai,
      aiTools: f.ai ? "ChatGPT" : null,
      aiContribution: f.ai ? "Used for brainstorming names and checking spelling in the script." : null,
      aiNoneConfirmed: !f.ai,
      rulesAgreedAt: new Date(now - (6 - i) * 3600_000).toISOString(),
      rulesVersion: "2026-1",
      publicationPermission: i % 3 === 0,
      eligibility: i < 4 ? "eligible" : "pending",
      eligibilityNote: null,
      eligibilityReviewedBy: i < 4 ? officerRows[0].id : null,
      eligibilityReviewedAt: i < 4 ? new Date().toISOString() : null,
      flags,
      isTest: true,
      submittedAt: new Date(now - (6 - i) * 3600_000).toISOString(),
      assets: [
        { id: randomUUID(), kind: "prototype", source: "link", url: "https://www.figma.com/proto/example", uploadId: null, storagePath: null, fileName: null, mimeType: null, sizeBytes: null, durationSeconds: null, durationStatus: "not_applicable" },
        { id: randomUUID(), kind: "video", source: "link", url: "https://www.youtube.com/watch?v=example", uploadId: null, storagePath: null, fileName: null, mimeType: null, sizeBytes: null, durationSeconds: null, durationStatus: "unverified" },
      ],
    };
  });

  const s = (sub: number, judge: number, v: number[], status: "draft" | "submitted") => ({
    id: randomUUID(),
    submissionId: submissions[sub].id,
    judgeId: officerRows[judge].id,
    scores: { innovation: v[0], problemSolution: v[1], prototypeExecution: v[2], businessPotential: v[3], presentation: v[4], research: v[5] },
    comments: null,
    status,
    updatedAt: new Date().toISOString(),
  });
  const scores = empty
    ? []
    : [
        s(0, 1, [16, 17, 14, 15, 8, 7], "submitted"),
        s(0, 2, [18, 16, 15, 14, 9, 8], "submitted"),
        s(1, 1, [17, 18, 17, 16, 8, 9], "submitted"),
        s(1, 2, [15, 17, 18, 17, 9, 8], "submitted"),
        s(2, 1, [14, 13, 12, 18, 7, 7], "submitted"),
        s(2, 2, [12, 12, 0, 0, 0, 0], "draft"),
      ];

  await resetLocalDb({
    settings,
    officers: officerRows,
    submissions: submissions as never,
    scores: scores as never,
    audit: [],
  });
  const dir = path.resolve(process.cwd(), localDataDir());
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "dev-credentials.txt"), `# Local development officer accounts (fictional)\n${creds.join("\n")}\n`);
  console.log(`Seeded local store with ${officers.length} officers and ${submissions.length} fictional entries.`);
  console.log(`Officer passwords: ${path.join(localDataDir(), "dev-credentials.txt")}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
