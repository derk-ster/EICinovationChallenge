import { z } from "zod";
import { categories, competition } from "@/content/competition";
import { checkLink } from "./links";

/**
 * Shared validation for the submission form. The client uses each step's
 * schema for inline feedback; the server re-validates the full payload.
 */

const text = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(min, min <= 1 ? `${label} is required.` : `${label} needs at least ${min} characters.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

const grade = z.coerce
  .number({ error: "Choose a grade." })
  .int()
  .refine((g) => (competition.grades as readonly number[]).includes(g), "Choose grade 9, 10, 11 or 12.");

export const emailField = z
  .string({ error: "School email is required." })
  .trim()
  .toLowerCase()
  .min(1, "School email is required.")
  .max(254, "That email is too long.")
  .pipe(z.email("Enter a valid email address."));

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .optional()
  .transform((v) => (v ? v : undefined))
  .pipe(z.email("Enter a valid email address, or leave it blank.").optional());

export const participantSchema = z
  .object({
    entryType: z.enum(["individual", "team"], { error: "Choose individual or team." }),
    lead: z.object({
      fullName: text(2, 80, "Name"),
      grade,
      email: emailField,
    }),
    partner: z
      .object({
        fullName: text(2, 80, "Partner’s name"),
        grade,
        email: optionalEmail,
      })
      .nullable()
      .optional(),
  })
  .superRefine((v, ctx) => {
    if (v.entryType === "team" && !v.partner) {
      ctx.addIssue({ code: "custom", path: ["partner", "fullName"], message: "Add your partner’s name and grade." });
    }
    if (v.entryType === "team" && v.partner?.email && v.partner.email === v.lead.email) {
      ctx.addIssue({ code: "custom", path: ["partner", "email"], message: "Your partner needs their own email." });
    }
  })
  .transform((v) => ({ ...v, partner: v.entryType === "team" ? (v.partner ?? null) : null }));

const categoryIds = categories.map((c) => c.id) as [string, ...string[]];

export const projectSchema = z.object({
  projectName: text(2, 80, "Project name"),
  description: text(20, 400, "Short description"),
  problem: text(20, 1200, "Problem"),
  solution: text(20, 1200, "Solution"),
  targetAudience: text(5, 600, "Target audience"),
  category: z.enum(categoryIds, { error: "Choose a category." }),
});

const linkField = z
  .string({ error: "Paste a link." })
  .superRefine((v, ctx) => {
    const r = checkLink(v);
    if (!r.ok) ctx.addIssue({ code: "custom", message: r.error });
  })
  .transform((v) => {
    const r = checkLink(v);
    return r.ok ? r.url : v;
  });

const prototypeAsset = z.discriminatedUnion(
  "source",
  [
    z.object({ source: z.literal("file"), uploadId: z.uuid("Upload your file first.") }),
    z.object({ source: z.literal("link"), url: linkField }),
  ],
  { error: "Add your mockup or prototype as a file or a link." },
);

const videoAsset = z.discriminatedUnion(
  "source",
  [
    z.object({ source: z.literal("file"), uploadId: z.uuid("Upload your video first.") }),
    z.object({ source: z.literal("link"), url: linkField }),
  ],
  { error: "Add your presentation video as a file or a link." },
);

export const materialsSchema = z.object({
  prototype: prototypeAsset,
  video: videoAsset,
});

export const aiSchema = z
  .object({
    used: z.boolean({ error: "Tell us whether you used AI tools." }),
    tools: z.string().trim().max(300, "Keep this under 300 characters.").optional(),
    contribution: z.string().trim().max(1500, "Keep this under 1,500 characters.").optional(),
    noneConfirmed: z.boolean().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.used) {
      if (!v.tools || v.tools.length < 2)
        ctx.addIssue({ code: "custom", path: ["tools"], message: "List the AI tools you used." });
      if (!v.contribution || v.contribution.length < 20)
        ctx.addIssue({
          code: "custom",
          path: ["contribution"],
          message: "Explain how the tools contributed (at least 20 characters).",
        });
    } else if (!v.noneConfirmed) {
      ctx.addIssue({ code: "custom", path: ["noneConfirmed"], message: "Confirm that no AI tools were used." });
    }
  })
  .transform((v) =>
    v.used
      ? { used: true as const, tools: v.tools!, contribution: v.contribution!, noneConfirmed: false }
      : { used: false as const, tools: null, contribution: null, noneConfirmed: true },
  );

export const reviewSchema = z.object({
  rulesAgreed: z.literal(true, { error: "You need to agree to the official rules to submit." }),
  publicationPermission: z.boolean().default(false),
});

export const submissionSchema = z.object({
  idempotencyKey: z.uuid(),
  participant: participantSchema,
  project: projectSchema,
  materials: materialsSchema,
  ai: aiSchema,
  review: reviewSchema,
});

export type SubmissionInput = z.input<typeof submissionSchema>;
export type SubmissionPayload = z.output<typeof submissionSchema>;

export const stepSchemas = {
  participant: participantSchema,
  project: projectSchema,
  materials: materialsSchema,
  ai: aiSchema,
  review: reviewSchema,
} as const;

/** Flattens zod issues to { "lead.email": "message" } for inline display. */
export function issuesToErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function emailDomainAllowed(email: string, domains: string[]): boolean {
  if (!domains.length) return true;
  const host = email.split("@")[1]?.toLowerCase() ?? "";
  return domains.some((d) => host === d.toLowerCase().replace(/^@/, ""));
}

/** Containers often report a fraction of a second over the true length, so allow one second of encoder slack. */
const DURATION_SLACK_SECONDS = 1;

export function durationInRange(seconds: number): boolean {
  return (
    seconds >= competition.videoMinSeconds - DURATION_SLACK_SECONDS &&
    seconds <= competition.videoMaxSeconds + DURATION_SLACK_SECONDS
  );
}
