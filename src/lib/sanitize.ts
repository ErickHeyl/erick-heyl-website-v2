import { LIMITS, type NewSongRequest } from "./songRequestTypes";

/**
 * Strip HTML tags/entities-looking markup and control characters, collapse
 * whitespace and trim. Output is still rendered as escaped text on the client;
 * this just keeps stored data clean.
 */
export function cleanText(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .normalize("NFC")
    .replace(/<\/?[a-z!][^>]*(>|$)/gi, " ") // tags, comments, and unterminated "<script..."
    .replace(/[<>]/g, "") // stray angle brackets
    .replace(/[\u0000-\u001F\u007F\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Deliberately tiny; nice-to-have only. Matches whole words, case-insensitive.
const PROFANITY = ["fuck", "fucking", "shit", "bitch", "cunt", "asshole", "dick", "pussy", "nigger", "faggot", "retard"];
const PROFANITY_RE = new RegExp(`\\b(${PROFANITY.join("|")})\\b`, "gi");

export function maskProfanity(text: string): string {
  return text.replace(PROFANITY_RE, (w) => w[0] + "*".repeat(w.length - 1));
}

const ARTWORK_HOST_RE = /^is\d*-ssl\.mzstatic\.com$|\.mzstatic\.com$/i;
const PREVIEW_HOST_RE = /\.(itunes\.apple\.com|apple\.com|mzstatic\.com)$/i;

function safeUrl(input: unknown, hostRe: RegExp): string | undefined {
  if (typeof input !== "string" || input.length > 500) return undefined;
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || !hostRe.test(url.hostname)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

export type ValidationResult =
  | { ok: true; value: NewSongRequest }
  | { ok: false; errors: Record<string, string> };

/** Validate + sanitize a request body coming from the client. */
export function validateRequestInput(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, errors: { body: "Expected a JSON object." } };
  }
  const b = body as Record<string, unknown>;
  const errors: Record<string, string> = {};

  const source = b.source === "search" || b.source === "custom" || b.source === "vibe" ? b.source : null;
  if (!source) errors.source = 'source must be "search", "custom" or "vibe".';

  const title = cleanText(b.title);
  // Vibes have no artist; ignore anything sent.
  const artist = source === "vibe" ? "" : cleanText(b.artist);
  const name = cleanText(b.requestedBy);
  const note = cleanText(b.note);

  if (source === "vibe") {
    if (!title) errors.title = "Tell us the vibe you want.";
    else if (title.length > LIMITS.vibe) errors.title = `Vibe must be ${LIMITS.vibe} characters or fewer.`;
  } else if (!title) errors.title = "Song title is required.";
  else if (title.length > LIMITS.title) errors.title = `Title must be ${LIMITS.title} characters or fewer.`;
  if (artist.length > LIMITS.artist) errors.artist = `Artist must be ${LIMITS.artist} characters or fewer.`;
  if (name.length > LIMITS.name) errors.requestedBy = `Name must be ${LIMITS.name} characters or fewer.`;
  if (note.length > LIMITS.note) errors.note = `Note must be ${LIMITS.note} characters or fewer.`;

  let trackId: string | undefined;
  if (source === "search") {
    const raw = typeof b.trackId === "number" ? String(b.trackId) : b.trackId;
    if (typeof raw !== "string" || !/^\d{1,20}$/.test(raw)) errors.trackId = "trackId is required for search results.";
    else trackId = raw;
    if (!artist) errors.artist = "Artist is required for search results.";
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  const value: NewSongRequest = {
    title: source === "vibe" ? maskProfanity(title) : title,
    artist,
    source: source!,
    requestedBy: maskProfanity(name) || "Anonymous",
  };
  if (note) value.note = maskProfanity(note);
  if (source === "search") {
    value.trackId = trackId;
    const artworkUrl = safeUrl(b.artworkUrl, ARTWORK_HOST_RE);
    if (artworkUrl) value.artworkUrl = artworkUrl;
    const previewUrl = safeUrl(b.previewUrl, PREVIEW_HOST_RE);
    if (previewUrl) value.previewUrl = previewUrl;
  }
  return { ok: true, value };
}

export function isValidId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(id);
}
