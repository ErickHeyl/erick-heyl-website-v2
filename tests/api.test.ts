import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocalRequestStore } from "../src/lib/requestStore";
import {
  checkAdmin,
  clientIp,
  handleCreate,
  handleDelete,
  handleList,
  handlePatch,
  handleSearch,
  handleUpvote,
  type ApiDeps,
} from "../src/lib/songRequestsApi";

const BASE = "http://localhost/api/song-requests";
const ADMIN = "s3cret-admin-token";

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request(BASE, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

const adminReq = (method: string, id: string, body?: unknown, token?: string) =>
  new Request(`${BASE}/${id}`, {
    method,
    headers: { "content-type": "application/json", ...(token ? { "x-admin-token": token } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

let deps: ApiDeps;
beforeEach(() => {
  deps = { store: new LocalRequestStore(null), adminToken: ADMIN, requestsOpen: true };
});

describe("POST /api/song-requests", () => {
  it("creates a request (201) and lists it (happy path)", async () => {
    const res = await handleCreate(post({ source: "custom", title: "Levels", artist: "Avicii", requestedBy: "Jo", note: "midnight" }), "1.1.1.1", deps);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.duplicate).toBe(false);
    expect(body.message).toBe("Added! 🎶");
    expect(body.request).toMatchObject({ title: "Levels", artist: "Avicii", requestedBy: "Jo", note: "midnight", upvotes: 1 });
    expect(res.headers.get("cache-control")).toBe("no-store");

    const list = await (await handleList(new Request(BASE), deps)).json();
    expect(list.requests).toHaveLength(1);
    expect(list.admin).toBe(false);
  });

  it("upvotes the existing entry for a duplicate (200)", async () => {
    await handleCreate(post({ source: "search", trackId: "5", title: "Levels", artist: "Avicii" }), "1.1.1.1", deps);
    const res = await handleCreate(post({ source: "custom", title: "levels", artist: "AVICII" }), "2.2.2.2", deps);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.duplicate).toBe(true);
    expect(body.message).toBe("Already on the list, we upvoted it for you");
    expect(body.request.upvotes).toBe(2);
  });

  it("returns 400 on bad input", async () => {
    const tooLong = await handleCreate(post({ source: "custom", title: "x".repeat(101) }), "1.1.1.1", deps);
    expect(tooLong.status).toBe(400);
    expect((await tooLong.json()).fields.title).toMatch(/100/);
    expect((await handleCreate(post({ source: "custom" }), "1.1.1.1", deps)).status).toBe(400);
    expect((await handleCreate(post("{not json"), "1.1.1.1", deps)).status).toBe(400);
    expect((await handleCreate(post({ source: "search", title: "a", artist: "b" }), "1.1.1.1", deps)).status).toBe(400);
  });

  it("trips the per-IP rate limit (429) after 10 submissions", async () => {
    for (let i = 0; i < 10; i++) {
      const res = await handleCreate(post({ source: "custom", title: `Song ${i}` }), "9.9.9.9", deps);
      expect(res.status).toBe(201);
    }
    const blocked = await handleCreate(post({ source: "custom", title: "Song 11" }), "9.9.9.9", deps);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    // A different IP is unaffected.
    expect((await handleCreate(post({ source: "custom", title: "Other" }), "8.8.8.8", deps)).status).toBe(201);
  });

  it("does not count invalid submissions against the rate limit", async () => {
    for (let i = 0; i < 15; i++) await handleCreate(post({ source: "custom" }), "7.7.7.7", deps);
    expect((await handleCreate(post({ source: "custom", title: "ok" }), "7.7.7.7", deps)).status).toBe(201);
  });

  it("returns 403 when requests are closed", async () => {
    deps.requestsOpen = false;
    expect((await handleCreate(post({ source: "custom", title: "x" }), "1.1.1.1", deps)).status).toBe(403);
  });
});

describe("POST /api/song-requests/:id/upvote", () => {
  it("increments the vote count", async () => {
    const { request } = await deps.store.createOrUpvote({ title: "A", artist: "B", source: "custom", requestedBy: "Anonymous" });
    const res = await handleUpvote(request.id, "1.1.1.1", deps);
    expect(res.status).toBe(200);
    expect((await res.json()).request.upvotes).toBe(2);
  });

  it("404s for unknown or hidden ids and 400s for malformed ids", async () => {
    expect((await handleUpvote("doesnotexist", "1.1.1.1", deps)).status).toBe(404);
    expect((await handleUpvote("../../x", "1.1.1.1", deps)).status).toBe(400);
    const { request } = await deps.store.createOrUpvote({ title: "A", artist: "B", source: "custom", requestedBy: "Anonymous" });
    await deps.store.setStatus(request.id, "hidden");
    expect((await handleUpvote(request.id, "1.1.1.1", deps)).status).toBe(404);
  });

  it("rate limits upvotes per IP", async () => {
    deps.limits = { upvotes: 2 };
    const { request } = await deps.store.createOrUpvote({ title: "A", artist: "B", source: "custom", requestedBy: "Anonymous" });
    expect((await handleUpvote(request.id, "3.3.3.3", deps)).status).toBe(200);
    expect((await handleUpvote(request.id, "3.3.3.3", deps)).status).toBe(200);
    expect((await handleUpvote(request.id, "3.3.3.3", deps)).status).toBe(429);
  });
});

describe("admin actions", () => {
  let id: string;
  beforeEach(async () => {
    id = (await deps.store.createOrUpvote({ title: "A", artist: "B", source: "custom", requestedBy: "Anonymous" })).request.id;
  });

  it("401 without (or with a wrong) admin token", async () => {
    expect((await handlePatch(adminReq("PATCH", id, { status: "played" }), id, deps)).status).toBe(401);
    expect((await handlePatch(adminReq("PATCH", id, { status: "played" }, "wrong"), id, deps)).status).toBe(401);
    expect((await handleDelete(adminReq("DELETE", id), id, deps)).status).toBe(401);
    expect((await handleDelete(adminReq("DELETE", id, undefined, ADMIN.slice(0, -1)), id, deps)).status).toBe(401);
    expect((await deps.store.get(id))?.status).toBe("pending");
  });

  it("401 for everyone when no admin token is configured", async () => {
    deps.adminToken = undefined;
    expect((await handlePatch(adminReq("PATCH", id, { status: "played" }, ""), id, deps)).status).toBe(401);
    expect((await handlePatch(adminReq("PATCH", id, { status: "played" }, "undefined"), id, deps)).status).toBe(401);
  });

  it("marks played and hides with a valid token", async () => {
    const played = await handlePatch(adminReq("PATCH", id, { status: "played" }, ADMIN), id, deps);
    expect(played.status).toBe(200);
    expect((await played.json()).request.status).toBe("played");

    const hidden = await handlePatch(adminReq("PATCH", id, { status: "hidden" }, ADMIN), id, deps);
    expect((await hidden.json()).request.status).toBe("hidden");
    // Hidden from guests, visible to admins.
    expect((await (await handleList(new Request(BASE), deps)).json()).requests).toHaveLength(0);
    const adminList = await (await handleList(new Request(BASE, { headers: { "x-admin-token": ADMIN } }), deps)).json();
    expect(adminList.requests).toHaveLength(1);
    expect(adminList.admin).toBe(true);
  });

  it("accepts a Bearer token too", async () => {
    const req = new Request(`${BASE}/${id}`, { method: "DELETE", headers: { authorization: `Bearer ${ADMIN}` } });
    expect((await handleDelete(req, id, deps)).status).toBe(200);
    expect(await deps.store.get(id)).toBeNull();
  });

  it("400 on a bad status, 404 on a missing id", async () => {
    expect((await handlePatch(adminReq("PATCH", id, { status: "banana" }, ADMIN), id, deps)).status).toBe(400);
    expect((await handlePatch(adminReq("PATCH", "missing", { status: "played" }, ADMIN), "missing", deps)).status).toBe(404);
    expect((await handleDelete(adminReq("DELETE", "missing", undefined, ADMIN), "missing", deps)).status).toBe(404);
  });
});

describe("GET /api/song-requests sort", () => {
  it("supports ?sort=new", async () => {
    const body = await (await handleList(new Request(`${BASE}?sort=new`), deps)).json();
    expect(body.sort).toBe("new");
    const def = await (await handleList(new Request(`${BASE}?sort=bogus`), deps)).json();
    expect(def.sort).toBe("top");
  });
});

describe("GET /api/songs/search", () => {
  it("proxies to the search module with cache headers", async () => {
    const search = vi.fn(async () => [{ trackId: "1", title: "September", artist: "EWF" }]);
    const res = await handleSearch(new Request("http://localhost/api/songs/search?q=september"), { search });
    expect(res.status).toBe(200);
    expect(search).toHaveBeenCalledWith("september");
    expect((await res.json()).results).toHaveLength(1);
    expect(res.headers.get("cache-control")).toMatch(/s-maxage/);
  });

  it("short queries return [] without searching; long ones 400", async () => {
    const search = vi.fn(async () => []);
    expect((await (await handleSearch(new Request("http://localhost/api/songs/search?q=a"), { search })).json()).results).toEqual([]);
    expect(search).not.toHaveBeenCalled();
    expect((await handleSearch(new Request(`http://localhost/api/songs/search?q=${"x".repeat(101)}`), { search })).status).toBe(400);
  });
});

describe("helpers", () => {
  it("checkAdmin requires an exact match", () => {
    expect(checkAdmin("abc", "abc")).toBe(true);
    expect(checkAdmin("abcd", "abc")).toBe(false);
    expect(checkAdmin("ab", "abc")).toBe(false);
    expect(checkAdmin(null, "abc")).toBe(false);
    expect(checkAdmin("abc", undefined)).toBe(false);
  });

  it("clientIp prefers x-forwarded-for", () => {
    expect(clientIp(new Request(BASE, { headers: { "x-forwarded-for": "5.5.5.5, 10.0.0.1" } }))).toBe("5.5.5.5");
    expect(clientIp(new Request(BASE, { headers: { "x-real-ip": "6.6.6.6" } }))).toBe("6.6.6.6");
    expect(clientIp(new Request(BASE), "::1")).toBe("::1");
  });
});
