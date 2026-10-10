/**
 * Normalization for duplicate detection. Two requests are duplicates when they
 * share an iTunes trackId, or when their normalized "artist|title" keys match.
 * Vibes get their own key space so "Disco" the vibe never matches a song called "Disco".
 */

const FEAT_PAREN_RE = /[\(\[]\s*(feat\.?|ft\.?|featuring|with)\s[^\)\]]*[\)\]]/gi;
const FEAT_TAIL_RE = /\s(feat\.?|ft\.?|featuring)\s.*$/i;
// "(Remastered 2011)", "- Radio Edit", "(Single Version)" and similar noise.
const VERSION_PAREN_RE = /[\(\[][^\)\]]*\b(remaster(ed)?|radio edit|single version|album version|explicit|clean)\b[^\)\]]*[\)\]]/gi;
const VERSION_DASH_RE = /\s-\s.*\b(remaster(ed)?|radio edit|single version|album version)\b.*$/i;

export function normalizePart(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // diacritics
    .toLowerCase()
    .replace(FEAT_PAREN_RE, " ")
    .replace(VERSION_PAREN_RE, " ")
    .replace(VERSION_DASH_RE, " ")
    .replace(FEAT_TAIL_RE, " ")
    .replace(/&|\+/g, " and ")
    .replace(/[^a-z0-9\s]/g, "") // punctuation, apostrophes
    .replace(/^the\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function textKey(title: string, artist: string): string {
  return `text:${normalizePart(artist)}|${normalizePart(title)}`;
}

export function vibeKey(text: string): string {
  return `vibe:${normalizePart(text)}`;
}

export function trackKey(trackId: string | undefined): string | undefined {
  return trackId ? `track:${trackId}` : undefined;
}

/** All keys a request should be indexed under (trackId first when present). */
export function dedupeKeys(req: { title: string; artist: string; trackId?: string; source?: string }): string[] {
  if (req.source === "vibe") return [vibeKey(req.title)];
  const keys: string[] = [];
  const t = trackKey(req.trackId);
  if (t) keys.push(t);
  keys.push(textKey(req.title, req.artist));
  return keys;
}
