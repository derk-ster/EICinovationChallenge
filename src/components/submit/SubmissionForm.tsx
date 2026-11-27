"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { categories, competition } from "@/content/competition";
import type { UploadLimits } from "@/lib/domain/files";
import { emailDomainAllowed } from "@/lib/domain/submission-schema";
import type { PublicSettings } from "@/lib/domain/types";
import { AssetInput } from "./AssetInput";
import { EmailVerify } from "./EmailVerify";
import { ChoiceCard, Checkbox, describedBy, Field, fieldId, inputBase, Spinner } from "./fields";
import {
  clearDraft,
  draftToken,
  initialState,
  loadDraft,
  resetDraftToken,
  saveDraft,
  stepOfField,
  steps,
  toPayload,
  validateStep,
  type FormState,
  type StepKey,
} from "./form-state";

type Errors = Record<string, string>;

export function SubmissionForm({ settings, limits, intro }: { settings: PublicSettings; limits: UploadLimits; intro?: ReactNode }) {
  const [state, setState] = useState<FormState>(initialState);
  const [stepIndex, setStepIndex] = useState(0);
  const [visited, setVisited] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [verifiedEmail, setVerifiedEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reference: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();
  const step = steps[stepIndex];

  // Restore a draft from this tab and check whether the email was verified earlier.
  useEffect(() => {
    const draft = loadDraft();
    // Restoring from sessionStorage can only happen after hydration (the server has no access to it).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (draft) setState(draft);
    draftToken();
    fetch("/api/verify/status")
      .then((r) => r.json())
      .then((j) => setVerifiedEmail(j?.email ?? null))
      .catch(() => undefined);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !done) saveDraft(state);
  }, [state, hydrated, done]);

  // Warn before leaving with unsent work.
  useEffect(() => {
    const dirty = state.participant.lead.fullName || state.project.projectName;
    if (!dirty || done) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [state, done]);

  const goTo = (i: number) => {
    setStepIndex(i);
    setVisited((v) => Math.max(v, i));
    setSubmitError(null);
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
  };

  const extraChecks = (key: StepKey): Errors => {
    const e: Errors = {};
    if (key === "participant") {
      const lead = state.participant.lead.email.trim().toLowerCase();
      if (lead && !emailDomainAllowed(lead, settings.allowedEmailDomains))
        e["participant.lead.email"] = `Use your school email (${settings.allowedEmailDomains.map((d) => `@${d}`).join(" or ")}).`;
      const pe = state.participant.partner.email.trim().toLowerCase();
      if (state.participant.entryType === "team" && pe && !emailDomainAllowed(pe, settings.allowedEmailDomains))
        e["participant.partner.email"] = "Use your partner’s school email, or leave it blank.";
      if (settings.requireEmailVerification && lead && verifiedEmail !== lead && !e["participant.lead.email"])
        e["participant.lead.email"] = "Verify your email to continue.";
    }
    return e;
  };

  const next = () => {
    const e = { ...validateStep(step.key, state), ...extraChecks(step.key) };
    setErrors(e);
    if (Object.keys(e).length) {
      requestAnimationFrame(() => document.getElementById("step-errors")?.focus());
      return;
    }
    goTo(stepIndex + 1);
  };

  const back = () => {
    setErrors({});
    goTo(stepIndex - 1);
  };

  async function submit() {
    // Re-check everything before sending.
    const all: Errors = {};
    for (const s of steps) Object.assign(all, validateStep(s.key, state), extraChecks(s.key));
    setErrors(all);
    const keys = Object.keys(all);
    if (keys.length) {
      const first = steps.findIndex((s) => s.key === stepOfField(keys[0]));
      if (first !== stepIndex) goTo(first);
      else requestAnimationFrame(() => document.getElementById("step-errors")?.focus());
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-EIC-Draft": draftToken() },
        body: JSON.stringify(toPayload(state)),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok && typeof json.reference === "string") {
        clearDraft();
        resetDraftToken();
        setDone({ reference: json.reference });
        requestAnimationFrame(() => {
          window.scrollTo({ top: 0 });
          document.getElementById("confirmation-title")?.focus();
        });
        return;
      }
      const fieldErrors: Errors = json?.fieldErrors ?? {};
      setErrors(fieldErrors);
      setSubmitError(json?.error ?? "Your submission couldn’t be saved. Nothing was submitted — try again.");
      const firstKey = Object.keys(fieldErrors)[0];
      if (firstKey) {
        const idx = steps.findIndex((s) => s.key === stepOfField(firstKey));
        if (idx !== -1 && idx !== stepIndex) goTo(idx);
      }
    } catch {
      setSubmitError("We couldn’t reach the server. Check your connection — nothing was submitted yet.");
    } finally {
      setSubmitting(false);
    }
  }

  const set = <K extends keyof FormState>(key: K, patch: Partial<FormState[K]>) =>
    setState((s) => ({ ...s, [key]: { ...(s[key] as object), ...patch } }));

  if (done) return <Confirmation reference={done.reference} />;

  const stepErrors = Object.entries(errors).filter(([k]) => stepOfField(k) === step.key);

  return (
    <>
    {intro}
    <div className="grid gap-12 lg:grid-cols-12">
      <aside className="lg:col-span-3">
        <nav aria-label="Submission steps" className="lg:sticky lg:top-28">
          <ol className="flex gap-1 lg:flex-col lg:gap-0">
            {steps.map((s, i) => {
              const status = i === stepIndex ? "current" : i <= visited ? "visited" : "upcoming";
              return (
                <li key={s.key} className="flex-1 lg:flex-none">
                  <button
                    type="button"
                    disabled={status === "upcoming" || submitting}
                    onClick={() => goTo(i)}
                    aria-current={status === "current" ? "step" : undefined}
                    className="group flex w-full flex-col gap-2 text-left disabled:cursor-default lg:flex-row lg:items-center lg:gap-4 lg:py-3"
                  >
                    <span
                      className={`h-1 w-full transition-colors duration-300 lg:h-9 lg:w-1 ${status === "current" ? "bg-forest" : status === "visited" ? "bg-ink" : "bg-rule"}`}
                    />
                    <span className="hidden lg:block">
                      <span className="block t-small tabular-nums text-stone">Step {i + 1}</span>
                      <span className={`block font-semibold ${status === "upcoming" ? "text-stone" : ""} ${status === "visited" ? "group-hover:text-forest" : ""}`}>
                        {s.short}
                      </span>
                    </span>
                    <span className="sr-only lg:hidden">
                      Step {i + 1}: {s.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 t-small text-stone lg:hidden" aria-hidden>
            Step {stepIndex + 1} of {steps.length}: {step.title}
          </p>
        </nav>
      </aside>

      <div className="lg:col-span-8 lg:col-start-5">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (step.key === "review") submit();
            else next();
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step.key}
              initial={reduce ? false : { opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -12 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              <p className="t-small font-semibold text-forest">
                Step {stepIndex + 1} of {steps.length}
              </p>
              <h2 ref={headingRef} tabIndex={-1} className="t-h2 mt-2 !text-[clamp(2rem,4vw,3.25rem)] outline-none">
                {step.title}
              </h2>

              {stepErrors.length > 0 && (
                <div id="step-errors" tabIndex={-1} role="alert" className="mt-8 border-l-4 border-danger bg-danger/[0.06] p-5 outline-none">
                  <p className="font-semibold">
                    {stepErrors.length === 1 ? "One thing needs attention" : `${stepErrors.length} things need attention`}
                  </p>
                  <ul className="mt-2 space-y-1 t-small">
                    {stepErrors.map(([k, v]) => (
                      <li key={k}>
                        <a href={`#${fieldId(k)}`} className="underline underline-offset-4">
                          {v}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-10 space-y-10">
                {step.key === "participant" && (
                  <ParticipantStep state={state} set={set} errors={errors} settings={settings} verifiedEmail={verifiedEmail} onVerified={setVerifiedEmail} />
                )}
                {step.key === "project" && <ProjectStep state={state} set={set} errors={errors} />}
                {step.key === "materials" && (
                  <>
                    <AssetInput
                      kind="prototype"
                      value={state.materials.prototype}
                      limits={limits}
                      error={errors["materials.prototype"]}
                      onChange={(v) => setState((s) => ({ ...s, materials: { ...s.materials, prototype: typeof v === "function" ? v(s.materials.prototype) : v } }))}
                    />
                    <AssetInput
                      kind="video"
                      value={state.materials.video}
                      limits={limits}
                      error={errors["materials.video"]}
                      onChange={(v) => setState((s) => ({ ...s, materials: { ...s.materials, video: typeof v === "function" ? v(s.materials.video) : v } }))}
                    />
                  </>
                )}
                {step.key === "ai" && <AiStep state={state} set={set} errors={errors} />}
                {step.key === "review" && <ReviewStep state={state} set={set} errors={errors} goTo={goTo} />}
              </div>
            </motion.div>
          </AnimatePresence>

          {submitError && (
            <div role="alert" className="mt-10 border-l-4 border-danger bg-danger/[0.06] p-5">
              <p className="font-semibold">Not submitted</p>
              <p className="mt-1">{submitError}</p>
            </div>
          )}

          <div className="mt-12 flex items-center justify-between gap-4 border-t border-rule pt-8">
            {stepIndex > 0 ? (
              <button type="button" onClick={back} disabled={submitting} className="h-12 px-2 font-semibold underline-offset-4 hover:underline disabled:opacity-40">
                Back
              </button>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-14 items-center gap-3 bg-ink px-8 font-semibold text-paper transition-colors hover:bg-forest disabled:cursor-wait disabled:opacity-70"
            >
              {submitting && <Spinner />}
              {step.key === "review" ? (submitting ? "Submitting…" : "Submit entry") : "Continue"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}

/* ------------------------------------------------------------------ steps */

type SetFn = <K extends keyof FormState>(key: K, patch: Partial<FormState[K]>) => void;

function ParticipantStep({
  state,
  set,
  errors,
  settings,
  verifiedEmail,
  onVerified,
}: {
  state: FormState;
  set: SetFn;
  errors: Errors;
  settings: PublicSettings;
  verifiedEmail: string | null;
  onVerified: (e: string) => void;
}) {
  const p = state.participant;
  const setLead = (patch: Partial<FormState["participant"]["lead"]>) => set("participant", { lead: { ...p.lead, ...patch } });
  const setPartner = (patch: Partial<FormState["participant"]["partner"]>) => set("participant", { partner: { ...p.partner, ...patch } });
  const domains = settings.allowedEmailDomains;
  return (
    <>
      <fieldset>
        <legend className="font-semibold">Are you entering on your own or as a team?</legend>
        <p className="mt-1 t-small text-stone">Teams can have at most two students. Each student can be part of one submission.</p>
        <div id={fieldId("participant.entryType")} className="mt-4 grid gap-3 sm:grid-cols-2">
          <ChoiceCard name="entryType" value="individual" checked={p.entryType === "individual"} onChange={() => set("participant", { entryType: "individual" })} title="Individual" body="Just me" invalid={!!errors["participant.entryType"]} />
          <ChoiceCard name="entryType" value="team" checked={p.entryType === "team"} onChange={() => set("participant", { entryType: "team" })} title="Team of two" body="Me and one partner" invalid={!!errors["participant.entryType"]} />
        </div>
        {errors["participant.entryType"] && <p className="mt-2 t-small font-medium text-danger">{errors["participant.entryType"]}</p>}
      </fieldset>

      <fieldset className="space-y-6 border-t border-rule pt-8">
        <legend className="t-h3 float-left mb-6 w-full">{p.entryType === "team" ? "You (team lead)" : "You"}</legend>
        <div className="clear-both grid gap-6 sm:grid-cols-[1fr_10rem]">
          <Field path="participant.lead.fullName" label="Full name" error={errors["participant.lead.fullName"]}>
            <input id={fieldId("participant.lead.fullName")} autoComplete="name" value={p.lead.fullName} onChange={(e) => setLead({ fullName: e.target.value })} aria-invalid={!!errors["participant.lead.fullName"] || undefined} aria-describedby={describedBy("participant.lead.fullName", errors["participant.lead.fullName"])} className={inputBase} />
          </Field>
          <GradeSelect path="participant.lead.grade" value={p.lead.grade} onChange={(grade) => setLead({ grade })} error={errors["participant.lead.grade"]} />
        </div>
        <Field
          path="participant.lead.email"
          label="School email address"
          hint={domains.length ? `Use your ${domains.map((d) => `@${d}`).join(" or ")} address.` : "Use the email address your school gave you."}
          error={errors["participant.lead.email"]}
        >
          <input
            id={fieldId("participant.lead.email")}
            type="email"
            autoComplete="email"
            inputMode="email"
            value={p.lead.email}
            onChange={(e) => setLead({ email: e.target.value })}
            aria-invalid={!!errors["participant.lead.email"] || undefined}
            aria-describedby={describedBy("participant.lead.email", errors["participant.lead.email"], true)}
            className={inputBase}
          />
          {settings.requireEmailVerification && <EmailVerify email={p.lead.email} verifiedEmail={verifiedEmail} onVerified={onVerified} />}
        </Field>
      </fieldset>

      {p.entryType === "team" && (
        <fieldset className="space-y-6 border-t border-rule pt-8">
          <legend className="t-h3 float-left mb-6 w-full">Your partner</legend>
          <div className="clear-both grid gap-6 sm:grid-cols-[1fr_10rem]">
            <Field path="participant.partner.fullName" label="Partner’s full name" error={errors["participant.partner.fullName"]}>
              <input id={fieldId("participant.partner.fullName")} value={p.partner.fullName} onChange={(e) => setPartner({ fullName: e.target.value })} aria-invalid={!!errors["participant.partner.fullName"] || undefined} aria-describedby={describedBy("participant.partner.fullName", errors["participant.partner.fullName"])} className={inputBase} />
            </Field>
            <GradeSelect path="participant.partner.grade" value={p.partner.grade} onChange={(grade) => setPartner({ grade })} error={errors["participant.partner.grade"]} />
          </div>
          <Field path="participant.partner.email" label="Partner’s school email" optional hint="Helps officers contact your partner and prevents duplicate entries." error={errors["participant.partner.email"]}>
            <input id={fieldId("participant.partner.email")} type="email" inputMode="email" value={p.partner.email} onChange={(e) => setPartner({ email: e.target.value })} aria-invalid={!!errors["participant.partner.email"] || undefined} aria-describedby={describedBy("participant.partner.email", errors["participant.partner.email"], true)} className={inputBase} />
          </Field>
          <p className="t-small text-stone">Teams are limited to two students, so there’s no option to add a third.</p>
        </fieldset>
      )}
    </>
  );
}

function GradeSelect({ path, value, onChange, error }: { path: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <Field path={path} label="Grade" error={error}>
      <select id={fieldId(path)} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error || undefined} aria-describedby={describedBy(path, error)} className={`${inputBase} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%23595c61' stroke-width='1.6'/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10`}>
        <option value="">Choose</option>
        {competition.grades.map((g) => (
          <option key={g} value={g}>
            Grade {g}
          </option>
        ))}
      </select>
    </Field>
  );
}

function TextBlock({
  path,
  label,
  hint,
  value,
  onChange,
  error,
  max,
  rows = 4,
  single,
}: {
  path: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  max: number;
  rows?: number;
  single?: boolean;
}) {
  const common = {
    id: fieldId(path),
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
    "aria-invalid": !!error || undefined,
    "aria-describedby": describedBy(path, error, !!hint),
    className: inputBase,
  };
  return (
    <Field path={path} label={label} hint={hint} error={error} count={{ value: value.trim().length, max }}>
      {single ? <input {...common} /> : <textarea {...common} rows={rows} className={`${inputBase} resize-y leading-relaxed`} />}
    </Field>
  );
}

function ProjectStep({ state, set, errors }: { state: FormState; set: SetFn; errors: Errors }) {
  const p = state.project;
  return (
    <>
      <TextBlock single path="project.projectName" label="Project or business name" value={p.projectName} onChange={(v) => set("project", { projectName: v })} error={errors["project.projectName"]} max={80} />
      <TextBlock path="project.description" label="Short description" hint="In a few sentences, what is it?" value={p.description} onChange={(v) => set("project", { description: v })} error={errors["project.description"]} max={400} rows={3} />
      <TextBlock path="project.problem" label="Problem being solved" hint="Who has this problem, and why does it matter?" value={p.problem} onChange={(v) => set("project", { problem: v })} error={errors["project.problem"]} max={1200} />
      <TextBlock path="project.solution" label="Proposed solution" hint="How does your idea solve it?" value={p.solution} onChange={(v) => set("project", { solution: v })} error={errors["project.solution"]} max={1200} />
      <TextBlock path="project.targetAudience" label="Target audience" hint="Who would use or buy it?" value={p.targetAudience} onChange={(v) => set("project", { targetAudience: v })} error={errors["project.targetAudience"]} max={600} rows={3} />
      <fieldset>
        <legend className="font-semibold">Project category</legend>
        <div id={fieldId("project.category")} className="mt-4 grid gap-3 sm:grid-cols-2">
          {categories.map((c) => (
            <ChoiceCard key={c.id} name="category" value={c.id} checked={p.category === c.id} onChange={() => set("project", { category: c.id })} title={c.title} body={c.short} invalid={!!errors["project.category"]} />
          ))}
        </div>
        {errors["project.category"] && <p className="mt-2 t-small font-medium text-danger">{errors["project.category"]}</p>}
      </fieldset>
    </>
  );
}

function AiStep({ state, set, errors }: { state: FormState; set: SetFn; errors: Errors }) {
  const a = state.ai;
  return (
    <>
      <div className="border-l-2 border-forest pl-5 text-stone">
        <p>
          AI tools may assist with brainstorming, research, design, coding and development. The core idea, decisions and
          work must be yours. Submitting an entirely AI-generated project is not allowed.{" "}
          <a href="/guidelines#ai-policy" target="_blank" rel="noreferrer" className="font-semibold text-ink underline underline-offset-4">
            Read the AI policy
          </a>
          .
        </p>
      </div>
      <fieldset>
        <legend className="font-semibold">Did you use any AI tools for this project?</legend>
        <div id={fieldId("ai.used")} className="mt-4 grid gap-3 sm:grid-cols-2">
          <ChoiceCard name="aiUsed" value="yes" checked={a.used === true} onChange={() => set("ai", { used: true })} title="Yes" body="I’ll list the tools and how they helped" invalid={!!errors["ai.used"]} />
          <ChoiceCard name="aiUsed" value="no" checked={a.used === false} onChange={() => set("ai", { used: false })} title="No" body="I didn’t use any AI tools" invalid={!!errors["ai.used"]} />
        </div>
        {errors["ai.used"] && <p className="mt-2 t-small font-medium text-danger">{errors["ai.used"]}</p>}
      </fieldset>
      {a.used === true && (
        <>
          <TextBlock single path="ai.tools" label="Which AI tools did you use?" hint="For example: ChatGPT, Claude, Gemini, GitHub Copilot, Canva Magic Design" value={a.tools} onChange={(v) => set("ai", { tools: v })} error={errors["ai.tools"]} max={300} />
          <TextBlock path="ai.contribution" label="How did they contribute?" hint="Be specific: what did the tool do, and what did you do yourself?" value={a.contribution} onChange={(v) => set("ai", { contribution: v })} error={errors["ai.contribution"]} max={1500} rows={5} />
        </>
      )}
      {a.used === false && (
        <div id={fieldId("ai.noneConfirmed")}>
          <Checkbox id="ai-none" checked={a.noneConfirmed} onChange={(v) => set("ai", { noneConfirmed: v })} invalid={!!errors["ai.noneConfirmed"]}>
            I confirm that no AI tools were used to create this project.
          </Checkbox>
          {errors["ai.noneConfirmed"] && <p className="mt-2 t-small font-medium text-danger">{errors["ai.noneConfirmed"]}</p>}
        </div>
      )}
    </>
  );
}

function ReviewStep({ state, set, errors, goTo }: { state: FormState; set: SetFn; errors: Errors; goTo: (i: number) => void }) {
  const p = state.participant;
  const cat = categories.find((c) => c.id === state.project.category)?.title;
  const asset = (a: FormState["materials"]["prototype"]) =>
    a.mode === "link" ? a.url || "—" : a.upload.status === "done" ? `${a.upload.fileName} (uploaded)` : "Not uploaded";
  return (
    <>
      <ReviewGroup title="Participant information" onEdit={() => goTo(0)}>
        <Row label="Entry type" value={p.entryType === "team" ? "Team of two" : "Individual"} />
        <Row label={p.entryType === "team" ? "Team lead" : "Student"} value={`${p.lead.fullName}, grade ${p.lead.grade}`} />
        <Row label="School email" value={p.lead.email} />
        {p.entryType === "team" && (
          <>
            <Row label="Partner" value={`${p.partner.fullName}, grade ${p.partner.grade}`} />
            {p.partner.email && <Row label="Partner’s email" value={p.partner.email} />}
          </>
        )}
      </ReviewGroup>
      <ReviewGroup title="Project information" onEdit={() => goTo(1)}>
        <Row label="Name" value={state.project.projectName} />
        <Row label="Category" value={cat ?? "—"} />
        <Row label="Description" value={state.project.description} long />
        <Row label="Problem" value={state.project.problem} long />
        <Row label="Solution" value={state.project.solution} long />
        <Row label="Target audience" value={state.project.targetAudience} long />
      </ReviewGroup>
      <ReviewGroup title="Submission materials" onEdit={() => goTo(2)}>
        <Row label="Mockup or prototype" value={asset(state.materials.prototype)} />
        <Row label="Presentation video" value={asset(state.materials.video)} />
      </ReviewGroup>
      <ReviewGroup title="AI disclosure" onEdit={() => goTo(3)}>
        {state.ai.used ? (
          <>
            <Row label="Tools used" value={state.ai.tools} />
            <Row label="How they contributed" value={state.ai.contribution} long />
          </>
        ) : (
          <Row label="AI tools" value="None used (confirmed)" />
        )}
      </ReviewGroup>

      <div className="space-y-4 border-t border-ink pt-8">
        <div id={fieldId("review.rulesAgreed")}>
          <Checkbox id="rules" checked={state.review.rulesAgreed} onChange={(v) => set("review", { rulesAgreed: v })} invalid={!!errors["review.rulesAgreed"]}>
            <span className="font-semibold">I have read and agree to the official competition rules.</span>{" "}
            <a href="/guidelines#rules" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-forest">
              Read the rules
            </a>{" "}
            <span className="text-stone">(opens in a new tab). Required.</span>
          </Checkbox>
          {errors["review.rulesAgreed"] && <p className="mt-2 t-small font-medium text-danger">{errors["review.rulesAgreed"]}</p>}
        </div>
        <Checkbox id="publication" checked={state.review.publicationPermission} onChange={(v) => set("review", { publicationPermission: v })}>
          <span className="font-semibold">Optional: EIC may publicly display my project.</span>{" "}
          <span className="text-stone">
            For example, on this site or at a club showcase. You keep ownership of your idea either way, and leaving this
            unchecked does not affect judging.
          </span>
        </Checkbox>
      </div>
    </>
  );
}

function ReviewGroup({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="border-t border-rule pt-6">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="t-h3">{title}</h3>
        <button type="button" onClick={onEdit} className="t-small font-semibold underline underline-offset-4 hover:text-forest">
          Edit<span className="sr-only"> {title.toLowerCase()}</span>
        </button>
      </div>
      <dl className="mt-4 space-y-3">{children}</dl>
    </section>
  );
}

function Row({ label, value, long }: { label: string; value: string; long?: boolean }) {
  return (
    <div className={`grid gap-1 ${long ? "" : "sm:grid-cols-[12rem_1fr]"}`}>
      <dt className="t-small text-stone">{label}</dt>
      <dd className="break-words whitespace-pre-line">{value || "—"}</dd>
    </div>
  );
}

function Confirmation({ reference }: { reference: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mx-auto max-w-3xl">
      <p className="t-small font-semibold text-forest">Submission received</p>
      <h2 id="confirmation-title" tabIndex={-1} className="t-display mt-4 outline-none !text-[clamp(3rem,8vw,6.5rem)]">
        You’re in.
      </h2>
      <p className="t-lead mt-8 text-stone">
        Your entry has been saved. Keep this reference number — you’ll need it if you contact an EIC officer about your
        submission.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-6 border-y border-ink py-8">
        <p className="t-num text-[clamp(2.5rem,7vw,4.5rem)] leading-none" aria-label={`Reference number ${reference.split("").join(" ")}`}>
          {reference}
        </p>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(reference);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
          className="inline-flex h-11 items-center border border-ink px-5 font-semibold hover:bg-ink hover:text-paper"
        >
          {copied ? "Copied" : "Copy reference"}
        </button>
      </div>
      <h3 className="t-h3 mt-12">What happens next</h3>
      <ol className="mt-4 space-y-3">
        <li>1. EIC officers review every entry for eligibility.</li>
        <li>2. Each eligible entry is scored independently by officers using the official rubric.</li>
        <li>3. The winner is announced through official EIC channels.</li>
      </ol>
      <p className="mt-8 t-small text-stone">
        You can submit only once. If you need to correct something, contact an EIC officer with your reference number.
      </p>
      <Link href="/" className="mt-10 inline-flex h-12 items-center border-b border-ink font-semibold hover:text-forest">
        Back to the challenge
      </Link>
    </div>
  );
}
