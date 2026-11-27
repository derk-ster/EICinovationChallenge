"use client";

import { useRef } from "react";
import { competition } from "@/content/competition";
import { acceptAttribute, extensionOf, formatBytes, humanList, mimeFor, type UploadLimits } from "@/lib/domain/files";
import { checkLink, looksLikeVideoHost } from "@/lib/domain/links";
import { durationInRange } from "@/lib/domain/submission-schema";
import type { AssetKind } from "@/lib/domain/types";
import { draftToken, type AssetState, type UploadState } from "./form-state";
import { describedBy, fieldId, inputBase, Spinner } from "./fields";

function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    const done = (d: number | null) => {
      URL.revokeObjectURL(url);
      resolve(d);
    };
    const timer = setTimeout(() => done(null), 8000);
    v.onloadedmetadata = () => {
      clearTimeout(timer);
      done(Number.isFinite(v.duration) && v.duration > 0 ? v.duration : null);
    };
    v.onerror = () => {
      clearTimeout(timer);
      done(null);
    };
    v.src = url;
  });
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

async function api<T>(url: string, body: unknown): Promise<T & { ok: boolean; error?: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-EIC-Draft": draftToken() },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({ ok: false, error: "Unexpected response from the server." }));
  return { ...json, ok: res.ok && json.ok };
}

export function AssetInput({
  kind,
  value,
  onChange,
  error,
  limits,
}: {
  kind: AssetKind;
  value: AssetState;
  onChange: (next: AssetState | ((prev: AssetState) => AssetState)) => void;
  error?: string;
  limits: UploadLimits;
}) {
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const path = `materials.${kind}`;
  const label = kind === "video" ? "Presentation video" : "Mockup or prototype";
  const maxMb = kind === "video" ? limits.videoMb : limits.prototypeMb;
  const setUpload = (u: Partial<UploadState>) => onChange((prev) => ({ ...prev, upload: { ...prev.upload, ...u } }));

  async function handleFile(file: File) {
    const ext = extensionOf(file.name);
    if (!mimeFor(kind, file.name)) {
      setUpload({ status: "error", error: `.${ext || "?"} files aren’t accepted here. Use ${humanList(kind)}.`, fileName: file.name });
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      setUpload({
        status: "error",
        fileName: file.name,
        error: `This file is ${formatBytes(file.size)}. The limit is ${maxMb} MB — share it as a link instead (for example Google Drive or unlisted YouTube).`,
      });
      return;
    }
    if (file.size === 0) {
      setUpload({ status: "error", fileName: file.name, error: "This file is empty." });
      return;
    }

    let duration: number | null = null;
    if (kind === "video") {
      setUpload({ status: "checking", progress: 0, fileName: file.name, error: undefined });
      duration = await readVideoDuration(file);
      if (duration !== null && !durationInRange(duration)) {
        setUpload({
          status: "error",
          fileName: file.name,
          durationSeconds: duration,
          error: `This video is ${mmss(duration)} long. Presentation videos must be between 2 and 3 minutes.`,
        });
        return;
      }
    }

    setUpload({ status: "uploading", progress: 0, fileName: file.name, size: file.size, durationSeconds: duration, error: undefined, uploadId: undefined });
    try {
      const init = await api<{ uploadId: string; target: { mode: "local" | "supabase"; url: string }; mimeType: string }>(
        "/api/uploads",
        { kind, fileName: file.name, size: file.size, durationSeconds: duration },
      );
      if (!init.ok) throw new Error(init.error ?? "The upload couldn’t start.");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;
        xhr.open("PUT", init.target.url);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUpload({ progress: Math.round((e.loaded / e.total) * 100) });
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(uploadErrorText(xhr))));
        xhr.onerror = () => reject(new Error("The connection dropped during the upload. Check your internet and try again."));
        xhr.onabort = () => reject(new Error("Upload cancelled."));
        if (init.target.mode === "supabase") {
          const form = new FormData();
          form.append("cacheControl", "3600");
          form.append("", new Blob([file], { type: init.mimeType }), file.name);
          xhr.setRequestHeader("x-upsert", "false");
          xhr.send(form);
        } else {
          xhr.setRequestHeader("Content-Type", init.mimeType);
          xhr.send(file);
        }
      });

      const done = await api<{ size: number }>(`/api/uploads/${init.uploadId}/complete`, {});
      if (!done.ok) throw new Error(done.error ?? "We couldn’t confirm the upload.");
      setUpload({ status: "done", progress: 100, uploadId: init.uploadId });
    } catch (e) {
      setUpload({ status: "error", error: (e as Error).message, uploadId: undefined });
    } finally {
      xhrRef.current = null;
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const link = value.mode === "link" && value.url ? checkLink(value.url) : null;
  const u = value.upload;
  const errId = describedBy(path, error);

  return (
    <fieldset className="border-t border-ink pt-6" aria-labelledby={`${fieldId(path)}-title`} aria-describedby={errId}>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h3 id={`${fieldId(path)}-title`} className="t-h3">
          {label}
        </h3>
        <div role="radiogroup" aria-label={`How to add your ${label.toLowerCase()}`} className="inline-flex border border-rule">
          {(["file", "link"] as const).map((m) => (
            <label
              key={m}
              className={`cursor-pointer px-4 py-2 t-small font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-forest ${value.mode === m ? "bg-ink text-paper" : "text-stone hover:text-ink"}`}
            >
              <input
                type="radio"
                className="sr-only"
                name={`${kind}-mode`}
                checked={value.mode === m}
                onChange={() => onChange((prev) => ({ ...prev, mode: m }))}
                disabled={u.status === "uploading"}
              />
              {m === "file" ? "Upload a file" : "Share a link"}
            </label>
          ))}
        </div>
      </div>
      <p className="mt-2 t-small text-stone">
        {kind === "video"
          ? `Must be between 2 and 3 minutes. ${humanList("video")} up to ${maxMb} MB, or a link.`
          : `Drawings, screenshots, slides, models or a working site. ${humanList("prototype")} up to ${maxMb} MB, or a link.`}
      </p>

      <div className="mt-5">
        {value.mode === "file" ? (
          <div>
            {u.status === "done" ? (
              <div className="flex flex-wrap items-center justify-between gap-4 border border-forest bg-forest/[0.06] p-5">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{u.fileName}</p>
                  <p className="t-small text-stone">
                    Uploaded{u.size ? `, ${formatBytes(u.size)}` : ""}
                    {kind === "video" &&
                      (u.durationSeconds ? `, ${mmss(u.durationSeconds)} long` : ". Length couldn’t be read automatically — an officer will check it.")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="t-small font-semibold underline underline-offset-4 hover:text-forest"
                >
                  Replace file
                </button>
              </div>
            ) : (
              <label
                htmlFor={fieldId(path)}
                className={`flex cursor-pointer flex-col items-start gap-1 border border-dashed p-6 transition-colors hover:border-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-forest ${error || u.status === "error" ? "border-danger" : "border-stone/60"}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f && u.status !== "uploading") handleFile(f);
                }}
              >
                <span className="font-semibold">{u.status === "uploading" || u.status === "checking" ? u.fileName : "Choose a file or drop it here"}</span>
                <span className="t-small text-stone">{acceptAttribute(kind).replace(/,/g, "  ")}</span>
              </label>
            )}
            <input
              ref={inputRef}
              id={fieldId(path)}
              type="file"
              accept={acceptAttribute(kind)}
              className="sr-only"
              aria-invalid={Boolean(error) || u.status === "error" || undefined}
              disabled={u.status === "uploading" || u.status === "checking"}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {(u.status === "uploading" || u.status === "checking") && (
              <div className="mt-4" aria-live="polite">
                <div className="flex items-center justify-between t-small">
                  <span className="flex items-center gap-2">
                    <Spinner />
                    {u.status === "checking" ? "Checking video length…" : `Uploading… ${u.progress}%`}
                  </span>
                  {u.status === "uploading" && (
                    <button type="button" onClick={() => xhrRef.current?.abort()} className="font-semibold underline underline-offset-4">
                      Cancel
                    </button>
                  )}
                </div>
                <div className="mt-2 h-1.5 w-full bg-paper-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={u.progress} aria-label={`${label} upload progress`}>
                  <div className="h-full origin-left bg-forest transition-transform duration-200" style={{ transform: `scaleX(${u.progress / 100})` }} />
                </div>
              </div>
            )}
            {u.status === "error" && u.error && (
              <p className="mt-3 t-small font-medium text-danger" role="alert">
                {u.fileName ? `${u.fileName}: ` : ""}
                {u.error}
              </p>
            )}
          </div>
        ) : (
          <div>
            <label htmlFor={fieldId(`${path}.url`)} className="sr-only">
              {label} link
            </label>
            <input
              id={fieldId(`${path}.url`)}
              type="url"
              inputMode="url"
              autoComplete="url"
              placeholder="https://"
              value={value.url}
              onChange={(e) => onChange((prev) => ({ ...prev, url: e.target.value }))}
              aria-invalid={Boolean(error) || (link ? !link.ok : undefined)}
              aria-describedby={errId}
              className={inputBase}
            />
            {link && link.ok && (
              <p className="mt-2 t-small text-stone">
                {link.provider ? `${link.provider} link. ` : `Link to ${link.host}. `}
                Make sure anyone with the link can view it — officers need access.
                {kind === "video" && " Officers will confirm the video is 2–3 minutes long."}
                {kind === "video" && !looksLikeVideoHost(link.host) && " This doesn’t look like a video host; double-check the link."}
              </p>
            )}
            {link && !link.ok && <p className="mt-2 t-small font-medium text-danger">{link.error}</p>}
          </div>
        )}
      </div>
      {error && (
        <p id={`${fieldId(path)}-error`} className="mt-3 t-small font-medium text-danger">
          {error}
        </p>
      )}
      {kind === "video" && (
        <p className="mt-4 t-small text-stone">
          Need a reminder of what to cover? See the{" "}
          <a href="/guidelines#video" target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-forest">
            seven-part video roadmap
          </a>{" "}
          (opens in a new tab). Videos must run {competition.videoMinSeconds / 60}–{competition.videoMaxSeconds / 60} minutes.
        </p>
      )}
    </fieldset>
  );
}

function uploadErrorText(xhr: XMLHttpRequest): string {
  try {
    const j = JSON.parse(xhr.responseText);
    if (j?.error && typeof j.error === "string") return j.error;
    if (j?.message && typeof j.message === "string") return `Storage rejected the file: ${j.message}`;
  } catch {
    /* not JSON */
  }
  if (xhr.status === 413) return "The file is larger than allowed.";
  return `The upload failed (status ${xhr.status}). Try again.`;
}
