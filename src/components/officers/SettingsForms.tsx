"use client";

import { useActionState, useState } from "react";
import {
  deleteAnnouncementAction,
  finalizeResultsAction,
  saveAnnouncementAction,
  saveSettingsAction,
  type ActionState,
} from "@/app/officers/actions";
import type { Announcement, CompetitionSettings } from "@/lib/domain/types";
import { inputBase, Spinner } from "@/components/submit/fields";

/** <input type="datetime-local"> works in the officer's local time; we send ISO (UTC) to the server. */
function DateTimeField({ name, label, value, hint, error }: { name: string; label: string; value: string | null; hint?: string; error?: string }) {
  const toLocal = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
  };
  const [local, setLocal] = useState(() => toLocal(value));
  const iso = local ? new Date(local).toISOString() : "";
  return (
    <div>
      <label htmlFor={`set-${name}`} className="font-semibold">
        {label}
      </label>
      {hint && <p className="t-small text-stone">{hint}</p>}
      <div className="mt-2 flex gap-2">
        <input id={`set-${name}`} type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} className={`${inputBase} py-2.5`} aria-invalid={!!error || undefined} />
        {local && (
          <button type="button" onClick={() => setLocal("")} className="px-3 t-small font-semibold underline underline-offset-4">
            Clear
          </button>
        )}
      </div>
      <input type="hidden" name={name} value={iso} />
      {error && <p className="mt-1 t-small font-medium text-danger">{error}</p>}
    </div>
  );
}

function Toggle({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked: boolean; hint?: string }) {
  return (
    <label className="flex cursor-pointer gap-4 border border-rule p-4 hover:border-stone has-[:checked]:border-forest has-[:checked]:bg-forest/[0.06]">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 size-4 accent-[var(--color-forest)]" />
      <span>
        <span className="block font-semibold">{label}</span>
        {hint && <span className="block t-small text-stone">{hint}</span>}
      </span>
    </label>
  );
}

export function SettingsForm({ settings }: { settings: CompetitionSettings }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSettingsAction, null);
  const e = state?.errors ?? {};
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <form action={action} className="space-y-10">
      <fieldset className="space-y-4">
        <legend className="t-h3 mb-4">Availability</legend>
        <Toggle name="submissionsEnabled" label="Accept submissions" defaultChecked={settings.submissionsEnabled} hint="Master switch. When off, the form is closed no matter what dates are set." />
        <div className="grid gap-6 md:grid-cols-2">
          <DateTimeField name="opensAt" label="Opens" value={settings.opensAt} hint="Optional. Leave empty to open as soon as the switch is on." error={e.opensAt} />
          <DateTimeField name="deadlineAt" label="Deadline" value={settings.deadlineAt} hint="Enforced by the server. A countdown appears only when this is set." error={e.deadlineAt} />
          <DateTimeField name="extensionUntil" label="Announced extension" value={settings.extensionUntil} hint="Only set this if an extension has been officially announced." error={e.extensionUntil} />
          <div>
            <label htmlFor="set-extensionNote" className="font-semibold">
              Extension note
            </label>
            <p className="t-small text-stone">Shown publicly next to the deadline.</p>
            <input id="set-extensionNote" name="extensionNote" maxLength={300} defaultValue={settings.extensionNote ?? ""} className={`${inputBase} mt-2 py-2.5`} />
          </div>
        </div>
        <p className="t-small text-stone">Times are entered in your time zone ({tz}) and shown to visitors in theirs.</p>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="t-h3 mb-4">Public timeline</legend>
        <div className="grid gap-6 md:grid-cols-2">
          <DateTimeField name="announcedAt" label="Competition announced" value={settings.announcedAt} error={e.announcedAt} />
          <DateTimeField name="winnerAnnouncementAt" label="Winner announcement" value={settings.winnerAnnouncementAt} error={e.winnerAnnouncementAt} />
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="t-h3 mb-4">Students and judging</legend>
        <div>
          <label htmlFor="set-domains" className="font-semibold">
            Allowed school email domains
          </label>
          <p className="t-small text-stone">Comma-separated, e.g. students.yourschool.org. Leave empty to accept any address.</p>
          <input id="set-domains" name="allowedEmailDomains" defaultValue={settings.allowedEmailDomains.join(", ")} className={`${inputBase} mt-2 py-2.5`} aria-invalid={!!e.allowedEmailDomains || undefined} />
          {e.allowedEmailDomains && <p className="mt-1 t-small font-medium text-danger">{e.allowedEmailDomains}</p>}
        </div>
        <Toggle name="requireEmailVerification" label="Require email verification" defaultChecked={settings.requireEmailVerification} hint="Students confirm a 6-digit code sent to their school email. Strongly recommended to prevent duplicate or fake entries." />
        <div className="max-w-xs">
          <label htmlFor="set-minJudges" className="font-semibold">
            Score sheets required per entry
          </label>
          <input id="set-minJudges" name="minJudgesPerEntry" type="number" min={1} max={20} defaultValue={settings.minJudgesPerEntry} className={`${inputBase} mt-2 py-2.5`} />
        </div>
      </fieldset>

      <div className="flex items-center gap-4 border-t border-rule pt-6">
        <button type="submit" disabled={pending} className="inline-flex h-12 items-center gap-2 bg-ink px-6 font-semibold text-paper hover:bg-forest disabled:opacity-60">
          {pending && <Spinner />}
          Save settings
        </button>
        {state && (
          <p role="status" className={`t-small font-medium ${state.ok ? "text-forest" : "text-danger"}`}>
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}

export function FinalizeForm({ locked }: { locked: boolean }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(finalizeResultsAction, null);
  return (
    <form
      action={action}
      onSubmit={(ev) => {
        if (!confirm(locked ? "Unlock scores so judges can edit them again?" : "Lock all score sheets? Judges won’t be able to change scores until you unlock.")) ev.preventDefault();
      }}
      className="flex flex-wrap items-center gap-4"
    >
      <input type="hidden" name="lock" value={locked ? "0" : "1"} />
      <button type="submit" disabled={pending} className={`inline-flex h-11 items-center gap-2 px-5 font-semibold ${locked ? "border border-ink hover:bg-ink hover:text-paper" : "bg-ink text-paper hover:bg-forest"}`}>
        {pending && <Spinner />}
        {locked ? "Unlock scoring" : "Finalize and lock scores"}
      </button>
      {state && <p role="status" className={`t-small font-medium ${state.ok ? "text-forest" : "text-danger"}`}>{state.message}</p>}
    </form>
  );
}

export function AnnouncementForm({ announcement }: { announcement?: Announcement }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveAnnouncementAction, null);
  const e = state?.errors ?? {};
  const id = announcement?.id ?? "new";
  return (
    <form action={action} className="space-y-4">
      {announcement && <input type="hidden" name="id" value={announcement.id} />}
      <div>
        <label htmlFor={`ann-title-${id}`} className="t-small font-semibold">Title</label>
        <input id={`ann-title-${id}`} name="title" maxLength={120} defaultValue={announcement?.title} className={`${inputBase} mt-1 py-2.5`} aria-invalid={!!e.title || undefined} />
        {e.title && <p className="mt-1 t-small font-medium text-danger">{e.title}</p>}
      </div>
      <div>
        <label htmlFor={`ann-body-${id}`} className="t-small font-semibold">Text</label>
        <textarea id={`ann-body-${id}`} name="body" rows={3} maxLength={2000} defaultValue={announcement?.body} className={`${inputBase} mt-1`} aria-invalid={!!e.body || undefined} />
        {e.body && <p className="mt-1 t-small font-medium text-danger">{e.body}</p>}
      </div>
      <label className="flex items-center gap-2 t-small font-semibold">
        <input type="checkbox" name="published" defaultChecked={announcement?.published} className="size-4 accent-[var(--color-forest)]" />
        Published on the public site
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="inline-flex h-10 items-center gap-2 bg-ink px-4 t-small font-semibold text-paper hover:bg-forest disabled:opacity-60">
          {pending && <Spinner />}
          {announcement ? "Save" : "Add announcement"}
        </button>
        {announcement && (
          <button
            type="submit"
            formAction={deleteAnnouncementAction}
            onClick={(ev) => {
              if (!confirm("Delete this announcement?")) ev.preventDefault();
            }}
            className="h-10 px-3 t-small font-semibold text-danger underline underline-offset-4"
          >
            Delete
          </button>
        )}
        {state && <p role="status" className={`t-small font-medium ${state.ok ? "text-forest" : "text-danger"}`}>{state.message}</p>}
      </div>
    </form>
  );
}
