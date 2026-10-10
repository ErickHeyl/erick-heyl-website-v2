/**
 * Framework-agnostic request handlers for the song-request API. The Astro route
 * files in src/pages/api/ are thin wrappers so these can be unit tested with
 * plain Request objects and an injected store.
 */
import type { RequestStore } from "./requestStore";
import { isValidId, validateRequestInput } from "./sanitize";
import { searchSongs, type SongResult } from "./songSearch";
import type { SortOrder } from "./songRequestTypes";

export type ApiDeps = {
  store: RequestStore;
  /** Undefined disables admin actions entirely. */
  adminToken?: string;
  /** When false, creates and upvotes are rejected (after the party). */
  requestsOpen?: boolean;
  search?: (q: string) => Promise<SongResult[]>;
  limits?: Partial<typeof DEFAULT_LIMITS>;
};

export const DEFAULT_LIMITS = {
  /** New requests per IP per window. */
  submissions: 10,
  submissionWindowSeconds: 10 * 60,
  /** Upvotes per IP per window (localStorage handles the per-song limit). */
  upvotes: 60,
  upvoteWindowSeconds: 10 * 60,
};

const NO_STORE = { "cache-control": "no-store" };

export function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...NO_STORE, ...headers },
  });
}

/** Constant-time string compare (avoid leaking the token via timing). */
export function safeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i % (a.length || 1)) || 0) ^ (b.charCodeAt(i % (b.length || 1)) || 0);
  }
  return diff === 0;
}

export function checkAdmin(provided: string | null | undefined, expected: string | undefined): boolean {
  if (!expected || !provided) return false;
  return safeEqual(provided, expected);
}

function adminFrom(request: Request): string | null {
  const header = request.headers.get("x-admin-token");
  if (header) return header;
  const auth = request.headers.get("authorization");
  return auth?.startsWith("Bearer ") ? auth.slice(7) : null;
}

/** Best-effort client IP (Vercel sets x-forwarded-for / x-real-ip). */
export function clientIp(request: Request, fallback?: string): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || fallback || "unknown";
}

async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > 4096) throw new Error("too large");
  return text ? JSON.parse(text) : {};
}

// GET /api/song-requests?sort=top|new
export async function handleList(request: Request, deps: ApiDeps): Promise<Response> {
  const url = new URL(request.url);
  const sort: SortOrder = url.searchParams.get("sort") === "new" ? "new" : "top";
  const isAdmin = checkAdmin(adminFrom(request), deps.adminToken);
  const items = await deps.store.list({ sort, includeHidden: isAdmin });
  return json(200, { requests: items, sort, admin: isAdmin });
}

// POST /api/song-requests
export async function handleCreate(request: Request, ip: string, deps: ApiDeps): Promise<Response> {
  if (deps.requestsOpen === false) return json(403, { error: "Requests are closed. Thanks for partying!" });

  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }
  const result = validateRequestInput(body);
  if (!result.ok) return json(400, { error: "Please check your request.", fields: result.errors });

  const limits = { ...DEFAULT_LIMITS, ...deps.limits };
  const rl = await deps.store.rateLimit(`submit:${ip}`, limits.submissions, limits.submissionWindowSeconds);
  if (!rl.allowed) {
    return json(
      429,
      { error: "Whoa, lots of requests! Give it a few minutes and try again." },
      { "retry-after": String(rl.resetSeconds) },
    );
  }

  const { request: created, duplicate } = await deps.store.createOrUpvote(result.value);
  return json(duplicate ? 200 : 201, {
    request: created,
    duplicate,
    message: duplicate ? "Already on the list, we upvoted it for you" : "Added! 🎶",
  });
}

// POST /api/song-requests/:id/upvote
export async function handleUpvote(id: string | undefined, ip: string, deps: ApiDeps): Promise<Response> {
  if (deps.requestsOpen === false) return json(403, { error: "Requests are closed." });
  if (!isValidId(id)) return json(400, { error: "Invalid id." });
  const limits = { ...DEFAULT_LIMITS, ...deps.limits };
  const rl = await deps.store.rateLimit(`upvote:${ip}`, limits.upvotes, limits.upvoteWindowSeconds);
  if (!rl.allowed) return json(429, { error: "Too many upvotes, slow down a bit." }, { "retry-after": String(rl.resetSeconds) });
  const existing = await deps.store.get(id);
  if (!existing || existing.status === "hidden") return json(404, { error: "Request not found." });
  const updated = await deps.store.upvote(id);
  if (!updated) return json(404, { error: "Request not found." });
  return json(200, { request: updated });
}

// PATCH /api/song-requests/:id  { status: "pending" | "played" | "hidden" }  (admin)
export async function handlePatch(request: Request, id: string | undefined, deps: ApiDeps): Promise<Response> {
  if (!checkAdmin(adminFrom(request), deps.adminToken)) return json(401, { error: "Unauthorized." });
  if (!isValidId(id)) return json(400, { error: "Invalid id." });
  let body: unknown;
  try {
    body = await readJson(request);
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }
  const status = (body as { status?: unknown })?.status;
  if (status !== "pending" && status !== "played" && status !== "hidden") {
    return json(400, { error: 'status must be "pending", "played" or "hidden".' });
  }
  const updated = await deps.store.setStatus(id, status);
  if (!updated) return json(404, { error: "Request not found." });
  return json(200, { request: updated });
}

// DELETE /api/song-requests/:id  (admin)
export async function handleDelete(request: Request, id: string | undefined, deps: ApiDeps): Promise<Response> {
  if (!checkAdmin(adminFrom(request), deps.adminToken)) return json(401, { error: "Unauthorized." });
  if (!isValidId(id)) return json(400, { error: "Invalid id." });
  const ok = await deps.store.delete(id);
  if (!ok) return json(404, { error: "Request not found." });
  return json(200, { deleted: id });
}

// GET /api/songs/search?q=
export async function handleSearch(request: Request, deps: Pick<ApiDeps, "search">): Promise<Response> {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return json(200, { results: [] });
  if (q.length > 100) return json(400, { error: "Query too long." });
  const results = await (deps.search ?? searchSongs)(q);
  // Let Vercel's edge cache identical queries for an hour.
  return json(200, { results }, { "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" });
}
