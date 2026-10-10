/**
 * Song search provider (iTunes Search API: free, no key). Kept behind a small
 * function so the provider can be swapped later. Never throws: on any failure
 * it returns an empty array so the free-text flow keeps working.
 */

export type SongResult = {
  trackId: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  previewUrl?: string;
};

type FetchLike = (input: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<{
  ok: boolean;
  json(): Promise<unknown>;
}>;

export type SearchOptions = {
  fetch?: FetchLike;
  timeoutMs?: number;
  limit?: number;
  /** Set false to bypass the in-memory cache (tests). */
  useCache?: boolean;
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 300;
const cache = new Map<string, { at: number; results: SongResult[] }>();

export function clearSearchCache() {
  cache.clear();
}

export function buildSearchUrl(q: string, limit = 8): string {
  const params = new URLSearchParams({ term: q, media: "music", entity: "song", limit: String(limit) });
  return `https://itunes.apple.com/search?${params.toString()}`;
}

export async function searchSongs(rawQuery: string, opts: SearchOptions = {}): Promise<SongResult[]> {
  const q = (rawQuery ?? "").replace(/\s+/g, " ").trim().slice(0, 100);
  if (q.length < 2) return [];
  const limit = Math.min(Math.max(opts.limit ?? 8, 1), 25);
  const useCache = opts.useCache ?? true;
  const cacheKey = `${limit}:${q.toLowerCase()}`;

  if (useCache) {
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.results;
  }

  const doFetch = opts.fetch ?? (globalThis.fetch as unknown as FetchLike);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 4000);
  try {
    const res = await doFetch(buildSearchUrl(q, limit), {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: unknown[] } | null;
    const results = parseResults(data?.results).slice(0, limit);
    if (useCache) {
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
      cache.set(cacheKey, { at: Date.now(), results });
    }
    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

function parseResults(raw: unknown): SongResult[] {
  if (!Array.isArray(raw)) return [];
  const out: SongResult[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const trackId = r.trackId != null ? String(r.trackId) : "";
    const title = typeof r.trackName === "string" ? r.trackName : "";
    const artist = typeof r.artistName === "string" ? r.artistName : "";
    if (!/^\d+$/.test(trackId) || !title || !artist || seen.has(trackId)) continue;
    seen.add(trackId);
    const result: SongResult = { trackId, title, artist };
    if (typeof r.artworkUrl100 === "string") result.artworkUrl = r.artworkUrl100;
    if (typeof r.previewUrl === "string") result.previewUrl = r.previewUrl;
    out.push(result);
  }
  return out;
}
