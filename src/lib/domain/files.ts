import type { AssetKind } from "./types";

/**
 * Accepted upload formats, keyed by file extension. The server decides the
 * content type from the extension so a mislabeled browser MIME type can't
 * smuggle in an unexpected format.
 */
const prototypeTypes: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  zip: "application/zip",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  glb: "model/gltf-binary",
  stl: "model/stl",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

const videoTypes: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

export const acceptedTypes: Record<AssetKind, Record<string, string>> = {
  prototype: prototypeTypes,
  video: videoTypes,
};

export const allMimeTypes = Array.from(new Set([...Object.values(prototypeTypes), ...Object.values(videoTypes)]));

export function extensionOf(fileName: string): string {
  const m = /\.([a-z0-9]{1,8})$/i.exec(fileName.trim());
  return m ? m[1].toLowerCase() : "";
}

export function mimeFor(kind: AssetKind, fileName: string): string | null {
  return acceptedTypes[kind][extensionOf(fileName)] ?? null;
}

export function acceptAttribute(kind: AssetKind): string {
  return Object.keys(acceptedTypes[kind])
    .map((e) => `.${e}`)
    .join(",");
}

export function humanList(kind: AssetKind): string {
  return Object.keys(acceptedTypes[kind])
    .filter((e) => e !== "jpeg")
    .map((e) => e.toUpperCase())
    .join(", ");
}

export interface UploadLimits {
  prototypeMb: number;
  videoMb: number;
}

export const defaultUploadLimits: UploadLimits = { prototypeMb: 50, videoMb: 50 };

/** Safe storage file name: keeps letters, numbers, dot, dash, underscore. */
export function sanitizeFileName(name: string): string {
  const ext = extensionOf(name);
  const base = name
    .replace(/\.[^.]*$/, "")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "file"}${ext ? `.${ext}` : ""}`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
