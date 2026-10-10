/**
 * Storage for song requests, behind a small interface with two implementations:
 *
 *  - RedisRequestStore: Upstash Redis (production). Upvotes use atomic HINCRBY,
 *    duplicate detection uses HSETNX on a normalized key index.
 *  - LocalRequestStore: JSON file in .data/ (local dev / demo) or pure memory.
 *
 * getRequestStore() picks Redis when UPSTASH_REDIS_REST_URL/TOKEN are set and
 * falls back to the local store otherwise, so dev needs no accounts.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { dedupeKeys } from "./normalize";
import { getEnv } from "./env";
import type { NewSongRequest, SongRequest, SongRequestStatus, SortOrder } from "./songRequestTypes";

export type ListOptions = { sort?: SortOrder; includeHidden?: boolean };
export type CreateResult = { request: SongRequest; duplicate: boolean };
export type RateLimitResult = { allowed: boolean; remaining: number; resetSeconds: number };

export interface RequestStore {
  readonly kind: "redis" | "file" | "memory";
  list(opts?: ListOptions): Promise<SongRequest[]>;
  get(id: string): Promise<SongRequest | null>;
  /** Create a request, or upvote the existing one if it's a duplicate. */
  createOrUpvote(input: NewSongRequest): Promise<CreateResult>;
  upvote(id: string): Promise<SongRequest | null>;
  setStatus(id: string, status: SongRequestStatus): Promise<SongRequest | null>;
  delete(id: string): Promise<boolean>;
  /** Fixed-window counter: allows `limit` hits per `windowSeconds` per key. */
  rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult>;
  /** Remove every request (dev seeding / tests). */
  clear(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

export function newId(): string {
  return globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

/** Played songs always sink to the bottom; hidden ones are dropped unless requested. */
export function sortRequests(items: SongRequest[], opts: ListOptions = {}): SongRequest[] {
  const sort = opts.sort ?? "top";
  const visible = opts.includeHidden ? items : items.filter((r) => r.status !== "hidden");
  const rank = (r: SongRequest) => (r.status === "pending" ? 0 : r.status === "played" ? 1 : 2);
  const byNew = (a: SongRequest, b: SongRequest) => b.createdAt.localeCompare(a.createdAt);
  return [...visible].sort((a, b) => {
    const s = rank(a) - rank(b);
    if (s) return s;
    if (sort === "top" && b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
    return byNew(a, b);
  });
}

function buildRequest(input: NewSongRequest, now: Date): SongRequest {
  return { ...input, id: newId(), upvotes: 1, status: "pending", createdAt: now.toISOString() };
}

// ---------------------------------------------------------------------------
// Local (file or memory) store
// ---------------------------------------------------------------------------

type LocalData = { requests: SongRequest[] };

export class LocalRequestStore implements RequestStore {
  readonly kind: "file" | "memory";
  private memory: LocalData = { requests: [] };
  private queue: Promise<unknown> = Promise.resolve();
  private buckets = new Map<string, { count: number; resetAt: number }>();

  /** @param filePath JSON file to persist to, or null for in-memory only. */
  constructor(private filePath: string | null = null, private now: () => Date = () => new Date()) {
    this.kind = filePath ? "file" : "memory";
  }

  private async read(): Promise<LocalData> {
    if (!this.filePath) return this.memory;
    try {
      const parsed = JSON.parse(await fs.readFile(this.filePath, "utf8")) as LocalData;
      return Array.isArray(parsed?.requests) ? parsed : { requests: [] };
    } catch {
      return { requests: [] };
    }
  }

  private async write(data: LocalData): Promise<void> {
    if (!this.filePath) {
      this.memory = data;
      return;
    }
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
    await fs.rename(tmp, this.filePath);
  }

  /** Serialize read-modify-write cycles within this process. */
  private mutate<T>(fn: (data: LocalData) => T | Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const data = await this.read();
      const result = await fn(data);
      await this.write(data);
      return result;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  async list(opts?: ListOptions) {
    return sortRequests((await this.read()).requests, opts);
  }

  async get(id: string) {
    return (await this.read()).requests.find((r) => r.id === id) ?? null;
  }

  createOrUpvote(input: NewSongRequest) {
    return this.mutate((data): CreateResult => {
      const keys = new Set(dedupeKeys(input));
      const existing = data.requests.find((r) => dedupeKeys(r).some((k) => keys.has(k)));
      if (existing) {
        existing.upvotes += 1;
        return { request: { ...existing }, duplicate: true };
      }
      const request = buildRequest(input, this.now());
      data.requests.push(request);
      return { request: { ...request }, duplicate: false };
    });
  }

  upvote(id: string) {
    return this.mutate((data) => {
      const r = data.requests.find((x) => x.id === id);
      if (!r) return null;
      r.upvotes += 1;
      return { ...r };
    });
  }

  setStatus(id: string, status: SongRequestStatus) {
    return this.mutate((data) => {
      const r = data.requests.find((x) => x.id === id);
      if (!r) return null;
      r.status = status;
      return { ...r };
    });
  }

  delete(id: string) {
    return this.mutate((data) => {
      const before = data.requests.length;
      data.requests = data.requests.filter((r) => r.id !== id);
      return data.requests.length !== before;
    });
  }

  async rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const nowMs = this.now().getTime();
    let b = this.buckets.get(key);
    if (!b || b.resetAt <= nowMs) {
      b = { count: 0, resetAt: nowMs + windowSeconds * 1000 };
      this.buckets.set(key, b);
    }
    b.count += 1;
    return {
      allowed: b.count <= limit,
      remaining: Math.max(0, limit - b.count),
      resetSeconds: Math.ceil((b.resetAt - nowMs) / 1000),
    };
  }

  clear() {
    return this.mutate((data) => {
      data.requests = [];
    });
  }

  /** Forget all rate-limit counters (dev seeding / e2e only). */
  resetRateLimits() {
    this.buckets.clear();
  }

  /** Insert fully-formed requests (dev seeding only). */
  insertRaw(requests: SongRequest[]) {
    return this.mutate((data) => {
      data.requests.push(...requests);
    });
  }
}

// ---------------------------------------------------------------------------
// Upstash Redis store
// ---------------------------------------------------------------------------

/** The subset of the @upstash/redis client we use (makes it easy to fake in tests). */
export interface RedisLike {
  hget(key: string, field: string): Promise<string | null>;
  hgetall(key: string): Promise<Record<string, unknown> | null>;
  hset(key: string, values: Record<string, string | number>): Promise<number>;
  hsetnx(key: string, field: string, value: string): Promise<number>;
  hexists(key: string, field: string): Promise<number>;
  hincrby(key: string, field: string, increment: number): Promise<number>;
  hdel(key: string, ...fields: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  del(...keys: string[]): Promise<number>;
}

type StoredItem = Omit<SongRequest, "upvotes">;

export class RedisRequestStore implements RequestStore {
  readonly kind = "redis" as const;
  private items: string;
  private votes: string;
  private index: string;

  constructor(private redis: RedisLike, private prefix = "songreq:v1", private now: () => Date = () => new Date()) {
    this.items = `${prefix}:items`;
    this.votes = `${prefix}:votes`;
    this.index = `${prefix}:dedupe`;
  }

  private parse(json: unknown, votes: unknown): SongRequest | null {
    try {
      const item = (typeof json === "string" ? JSON.parse(json) : json) as StoredItem;
      if (!item?.id) return null;
      return { ...item, upvotes: Number(votes ?? 0) || 0 };
    } catch {
      return null;
    }
  }

  async list(opts?: ListOptions) {
    const [items, votes] = await Promise.all([this.redis.hgetall(this.items), this.redis.hgetall(this.votes)]);
    const out: SongRequest[] = [];
    for (const [id, json] of Object.entries(items ?? {})) {
      const r = this.parse(json, votes?.[id]);
      if (r) out.push(r);
    }
    return sortRequests(out, opts);
  }

  async get(id: string) {
    const [json, votes] = await Promise.all([this.redis.hget(this.items, id), this.redis.hget(this.votes, id)]);
    return json ? this.parse(json, votes) : null;
  }

  private async existingFor(key: string): Promise<string | null> {
    const id = await this.redis.hget(this.index, key);
    if (id && (await this.redis.hexists(this.items, id))) return id;
    return null;
  }

  async createOrUpvote(input: NewSongRequest): Promise<CreateResult> {
    const keys = dedupeKeys(input);
    const textKey = keys[keys.length - 1];
    const trackKey = keys.length > 1 ? keys[0] : undefined;

    const dupOf = async (id: string): Promise<CreateResult> => {
      const request = await this.upvote(id);
      if (request) return { request, duplicate: true };
      return this.createOrUpvote(input); // vanished between calls; retry
    };

    if (trackKey) {
      const id = await this.existingFor(trackKey);
      if (id) return dupOf(id);
    }

    // Write the item first, then claim the normalized text key atomically with
    // HSETNX. Only one concurrent creator wins; losers remove their copy and
    // upvote the winner (whose item is guaranteed to exist already).
    const request = buildRequest(input, this.now());
    const { upvotes, ...stored } = request;
    await this.redis.hset(this.items, { [request.id]: JSON.stringify(stored) });
    await this.redis.hset(this.votes, { [request.id]: upvotes });

    const claimed = await this.redis.hsetnx(this.index, textKey, request.id);
    if (!claimed) {
      const id = await this.existingFor(textKey);
      if (id && id !== request.id) {
        await this.redis.hdel(this.items, request.id);
        await this.redis.hdel(this.votes, request.id);
        if (trackKey) await this.redis.hset(this.index, { [trackKey]: id });
        return dupOf(id);
      }
      // Stale index entry (its request no longer exists); take it over.
      await this.redis.hset(this.index, { [textKey]: request.id });
    }
    if (trackKey) await this.redis.hset(this.index, { [trackKey]: request.id });
    return { request, duplicate: false };
  }

  async upvote(id: string) {
    const json = await this.redis.hget(this.items, id);
    if (!json) return null;
    const votes = await this.redis.hincrby(this.votes, id, 1);
    return this.parse(json, votes);
  }

  async setStatus(id: string, status: SongRequestStatus) {
    const current = await this.get(id);
    if (!current) return null;
    const { upvotes, ...stored } = { ...current, status };
    await this.redis.hset(this.items, { [id]: JSON.stringify(stored) });
    return { ...stored, upvotes };
  }

  async delete(id: string) {
    const current = await this.get(id);
    if (!current) return false;
    await this.redis.hdel(this.items, id);
    await this.redis.hdel(this.votes, id);
    for (const key of dedupeKeys(current)) {
      if ((await this.redis.hget(this.index, key)) === id) await this.redis.hdel(this.index, key);
    }
    return true;
  }

  async rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const k = `${this.prefix}:rl:${key}`;
    const count = await this.redis.incr(k);
    if (count === 1) await this.redis.expire(k, windowSeconds);
    let ttl = await this.redis.ttl(k);
    if (ttl < 0) {
      await this.redis.expire(k, windowSeconds); // safety: never leave a counter without TTL
      ttl = windowSeconds;
    }
    return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetSeconds: ttl };
  }

  async clear() {
    await this.redis.del(this.items, this.votes, this.index);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

const GLOBAL_KEY = Symbol.for("songRequests.store");

export async function createStoreFromEnv(): Promise<RequestStore> {
  const url = getEnv("UPSTASH_REDIS_REST_URL");
  const token = getEnv("UPSTASH_REDIS_REST_TOKEN");
  if (url && token) {
    const { Redis } = await import("@upstash/redis");
    const redis = new Redis({ url, token, automaticDeserialization: false });
    return new RedisRequestStore(redis as unknown as RedisLike, getEnv("SONG_REQUESTS_KEY_PREFIX") || "songreq:v1");
  }
  if (getEnv("VERCEL")) {
    // Serverless filesystem is read-only/ephemeral: memory keeps the page usable but
    // data will not persist across instances. Configure Upstash for real use.
    console.warn("[song-requests] UPSTASH_REDIS_REST_URL/TOKEN not set; using in-memory store (data will not persist).");
    return new LocalRequestStore(null);
  }
  const file = getEnv("SONG_REQUESTS_DATA_FILE") || path.join(process.cwd(), ".data", "song-requests.json");
  return new LocalRequestStore(file);
}

export function getRequestStore(): Promise<RequestStore> {
  const g = globalThis as unknown as Record<symbol, Promise<RequestStore> | undefined>;
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = createStoreFromEnv();
  return g[GLOBAL_KEY]!;
}
