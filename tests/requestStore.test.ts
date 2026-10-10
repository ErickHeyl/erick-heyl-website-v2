import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { LocalRequestStore, RedisRequestStore, sortRequests, type RequestStore } from "../src/lib/requestStore";
import type { NewSongRequest, SongRequest } from "../src/lib/songRequestTypes";
import { FakeRedis } from "./fakeRedis";

const tmp = mkdtempSync(path.join(tmpdir(), "song-requests-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

/** A controllable clock so createdAt ordering is deterministic. */
function clock() {
  let t = Date.parse("2026-10-10T20:00:00Z");
  return { now: () => new Date(t), tick: (ms = 60_000) => (t += ms) };
}

const song = (title: string, artist: string, extra: Partial<NewSongRequest> = {}): NewSongRequest => ({
  title,
  artist,
  source: "custom",
  requestedBy: "Anonymous",
  ...extra,
});

let fileCounter = 0;
const factories: Array<[string, (now: () => Date) => RequestStore]> = [
  ["LocalRequestStore (memory)", (now) => new LocalRequestStore(null, now)],
  ["LocalRequestStore (file)", (now) => new LocalRequestStore(path.join(tmp, `store-${++fileCounter}.json`), now)],
  ["RedisRequestStore (fake redis)", (now) => new RedisRequestStore(new FakeRedis(), "test", now)],
];

describe.each(factories)("%s", (_name, make) => {
  let store: RequestStore;
  let c: ReturnType<typeof clock>;

  beforeEach(() => {
    c = clock();
    store = make(c.now);
  });

  it("starts empty", async () => {
    expect(await store.list()).toEqual([]);
  });

  it("creates requests with defaults", async () => {
    const { request, duplicate } = await store.createOrUpvote(song("Levels", "Avicii", { note: "midnight!" }));
    expect(duplicate).toBe(false);
    expect(request).toMatchObject({ title: "Levels", artist: "Avicii", upvotes: 1, status: "pending", note: "midnight!" });
    expect(request.id).toMatch(/^[a-z0-9]{16}$/);
    expect(request.createdAt).toBe("2026-10-10T20:00:00.000Z");
    expect(await store.get(request.id)).toEqual(request);
  });

  it("lists by most upvoted (default), ties broken by newest", async () => {
    const a = (await store.createOrUpvote(song("A", "x"))).request;
    c.tick();
    const b = (await store.createOrUpvote(song("B", "x"))).request;
    c.tick();
    const d = (await store.createOrUpvote(song("D", "x"))).request;
    await store.upvote(a.id);
    await store.upvote(a.id);
    expect((await store.list()).map((r) => r.title)).toEqual(["A", "D", "B"]);
    expect((await store.list({ sort: "top" })).map((r) => r.upvotes)).toEqual([3, 1, 1]);
    expect((await store.list({ sort: "new" })).map((r) => r.id)).toEqual([d.id, b.id, a.id]);
  });

  it("upvotes and returns null for unknown ids", async () => {
    const { request } = await store.createOrUpvote(song("Levels", "Avicii"));
    expect((await store.upvote(request.id))?.upvotes).toBe(2);
    expect((await store.upvote(request.id))?.upvotes).toBe(3);
    expect(await store.upvote("nope")).toBeNull();
  });

  it("upvotes instead of duplicating (same trackId)", async () => {
    const first = await store.createOrUpvote(song("Levels", "Avicii", { source: "search", trackId: "42" }));
    const again = await store.createOrUpvote(song("Levels - Radio Edit", "Avicii", { source: "search", trackId: "42" }));
    expect(again.duplicate).toBe(true);
    expect(again.request.id).toBe(first.request.id);
    expect(again.request.upvotes).toBe(2);
    expect(await store.list()).toHaveLength(1);
  });

  it("upvotes instead of duplicating (normalized custom title+artist, incl. against search entries)", async () => {
    const first = await store.createOrUpvote(song("Mr. Brightside", "The Killers", { source: "search", trackId: "7" }));
    const custom = await store.createOrUpvote(song("mr brightside", "killers"));
    expect(custom.duplicate).toBe(true);
    expect(custom.request.id).toBe(first.request.id);
    const feat = await store.createOrUpvote(song("MR BRIGHTSIDE (feat. Nobody)", "THE KILLERS"));
    expect(feat.duplicate).toBe(true);
    expect((await store.get(first.request.id))?.upvotes).toBe(3);
    const different = await store.createOrUpvote(song("Somebody Told Me", "The Killers"));
    expect(different.duplicate).toBe(false);
  });

  it("marks played (sorted to the bottom) and back to pending", async () => {
    const a = (await store.createOrUpvote(song("A", "x"))).request;
    await store.upvote(a.id);
    await store.createOrUpvote(song("B", "x"));
    const played = await store.setStatus(a.id, "played");
    expect(played?.status).toBe("played");
    expect(played?.upvotes).toBe(2);
    expect((await store.list()).map((r) => r.title)).toEqual(["B", "A"]);
    expect((await store.setStatus(a.id, "pending"))?.status).toBe("pending");
    expect((await store.list())[0].title).toBe("A");
    expect(await store.setStatus("missing", "played")).toBeNull();
  });

  it("hides requests from the public list but keeps them for admins", async () => {
    const a = (await store.createOrUpvote(song("A", "x"))).request;
    await store.createOrUpvote(song("B", "x"));
    await store.setStatus(a.id, "hidden");
    expect((await store.list()).map((r) => r.title)).toEqual(["B"]);
    expect((await store.list({ includeHidden: true })).map((r) => r.title)).toEqual(["B", "A"]);
  });

  it("deletes requests and frees their duplicate keys", async () => {
    const a = (await store.createOrUpvote(song("Levels", "Avicii", { source: "search", trackId: "9" }))).request;
    expect(await store.delete(a.id)).toBe(true);
    expect(await store.delete(a.id)).toBe(false);
    expect(await store.list()).toEqual([]);
    const again = await store.createOrUpvote(song("Levels", "Avicii", { source: "search", trackId: "9" }));
    expect(again.duplicate).toBe(false);
    expect(again.request.id).not.toBe(a.id);
  });

  it("rate limits per key within a window", async () => {
    for (let i = 0; i < 3; i++) expect((await store.rateLimit("ip:1", 3, 600)).allowed).toBe(true);
    const blocked = await store.rateLimit("ip:1", 3, 600);
    expect(blocked.allowed).toBe(false);
    expect(blocked.resetSeconds).toBeGreaterThan(0);
    expect((await store.rateLimit("ip:2", 3, 600)).allowed).toBe(true);
  });

  it("clear() removes everything", async () => {
    await store.createOrUpvote(song("A", "x"));
    await store.clear();
    expect(await store.list()).toEqual([]);
  });

  it("handles concurrent duplicate submissions without double entries", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => store.createOrUpvote(song("Same", "Song"))));
    expect(results.filter((r) => !r.duplicate)).toHaveLength(1);
    const list = await store.list();
    expect(list).toHaveLength(1);
    expect(list[0].upvotes).toBe(5);
  });
});

describe("LocalRequestStore file persistence", () => {
  it("persists to and reloads from the JSON file", async () => {
    const file = path.join(tmp, "persist.json");
    const a = new LocalRequestStore(file);
    const { request } = await a.createOrUpvote(song("Levels", "Avicii"));
    const b = new LocalRequestStore(file);
    expect(await b.get(request.id)).toEqual(request);
    expect(JSON.parse(readFileSync(file, "utf8")).requests).toHaveLength(1);
  });
});

describe("sortRequests", () => {
  const base = (over: Partial<SongRequest>): SongRequest => ({
    id: Math.random().toString(36).slice(2),
    title: "t",
    artist: "a",
    source: "custom",
    requestedBy: "Anonymous",
    upvotes: 1,
    status: "pending",
    createdAt: "2026-01-01T00:00:00.000Z",
    ...over,
  });
  it("keeps played at the bottom regardless of votes", () => {
    const out = sortRequests([base({ title: "played", upvotes: 99, status: "played" }), base({ title: "pending", upvotes: 1 })]);
    expect(out.map((r) => r.title)).toEqual(["pending", "played"]);
  });
});
