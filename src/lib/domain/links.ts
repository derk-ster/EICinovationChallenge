const providers: { match: RegExp; name: string }[] = [
  { match: /(^|\.)youtube\.com$|(^|\.)youtu\.be$/, name: "YouTube" },
  { match: /(^|\.)vimeo\.com$/, name: "Vimeo" },
  { match: /(^|\.)loom\.com$/, name: "Loom" },
  { match: /(^|\.)drive\.google\.com$|(^|\.)docs\.google\.com$/, name: "Google Drive" },
  { match: /(^|\.)sites\.google\.com$/, name: "Google Sites" },
  { match: /(^|\.)figma\.com$/, name: "Figma" },
  { match: /(^|\.)canva\.com$/, name: "Canva" },
  { match: /(^|\.)github\.com$|(^|\.)github\.io$/, name: "GitHub" },
  { match: /(^|\.)onedrive\.live\.com$|(^|\.)sharepoint\.com$|(^|\.)1drv\.ms$/, name: "OneDrive" },
  { match: /(^|\.)dropbox\.com$/, name: "Dropbox" },
  { match: /(^|\.)tinkercad\.com$/, name: "Tinkercad" },
  { match: /(^|\.)vercel\.app$|(^|\.)netlify\.app$|(^|\.)replit\.app$|(^|\.)glitch\.me$/, name: "Hosted site" },
];

const videoHosts = /youtube|youtu\.be|vimeo|loom|drive\.google|onedrive|sharepoint|1drv|dropbox/;

export type LinkCheck = { ok: true; url: string; provider: string | null; host: string } | { ok: false; error: string };

/**
 * Accepts public https links only. Rejects other schemes, embedded
 * credentials, bare IP addresses and local hostnames.
 */
export function checkLink(raw: string): LinkCheck {
  const value = raw.trim();
  if (!value) return { ok: false, error: "Paste a link." };
  if (value.length > 2048) return { ok: false, error: "That link is too long." };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: "That doesn’t look like a full link. It should start with https://" };
  }
  if (url.protocol !== "https:") return { ok: false, error: "Use a secure link that starts with https://" };
  if (url.username || url.password) return { ok: false, error: "Links can’t contain a username or password." };
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
    host.includes(":") ||
    !host.includes(".")
  ) {
    return { ok: false, error: "Use a public link that anyone with access can open." };
  }
  const provider = providers.find((p) => p.match.test(host))?.name ?? null;
  return { ok: true, url: url.toString(), provider, host };
}

export function looksLikeVideoHost(host: string): boolean {
  return videoHosts.test(host);
}
