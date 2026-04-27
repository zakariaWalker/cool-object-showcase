// Device-portable anonymous student ID for guest users.
// Stored in localStorage; surfaced as a short token in the URL so users can
// resume their diagnostic trail across devices (e.g. by sharing a link with
// themselves). Stable across page loads — only regenerated if cleared.

const STORAGE_KEY = "mathkb_anon_id";

/** Generate a URL-safe token (≈ 22 chars, ~128 bits). */
function newAnonId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // base64url
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Returns the persistent anonymous student ID, creating one if needed. */
export function getAnonymousId(): string {
  // SSR / non-browser safety
  if (typeof window === "undefined") return "anon-ssr";

  // Allow URL override (?anon=…) so a student can resume from another device
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("anon");
    if (fromUrl && fromUrl.length >= 8 && fromUrl.length <= 64) {
      localStorage.setItem(STORAGE_KEY, fromUrl);
      return fromUrl;
    }
  } catch {
    /* ignore */
  }

  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = `anon_${newAnonId()}`;
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

/** Build a "resume" link the student can save / send to themselves. */
export function getAnonymousResumeLink(path = "/diagnostic"): string {
  if (typeof window === "undefined") return path;
  const id = getAnonymousId();
  const url = new URL(path, window.location.origin);
  url.searchParams.set("anon", id);
  return url.toString();
}

/** Clear the anonymous trail (e.g. after migration to authenticated user). */
export function clearAnonymousId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
