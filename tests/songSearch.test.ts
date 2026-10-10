import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildSearchUrl, clearSearchCache, searchSongs } from "../src/lib/songSearch";

const itunesPayload = {
  resultCount: 3,
  results: [
    {
      trackId: 1440758413,
      trackName: "September",
      artistName: "Earth, Wind & Fire",
      artworkUrl100: "https://is1-ssl.mzstatic.com/image/thumb/a/100x100bb.jpg",
      previewUrl: "https://audio-ssl.itunes.apple.com/p.m4a",
      collectionName: "The Best of",
    },
    { trackId: 1440758413, trackName: "September", artistName: "Earth, Wind & Fire" }, // dup trackId
    { trackName: "No id", artistName: "Ignored" }, // invalid
  ],
};

const okResponse = (body: unknown) => ({ ok: true, json: async () => body });

describe("searchSongs", () => {
  beforeEach(() => clearSearchCache());

  it("builds the iTunes search URL", () => {
    const url = new URL(buildSearchUrl("earth wind & fire", 8));
    expect(url.origin + url.pathname).toBe("https://itunes.apple.com/search");
    expect(Object.fromEntries(url.searchParams)).toEqual({ term: "earth wind & fire", media: "music", entity: "song", limit: "8" });
  });

  it("maps results (success)", async () => {
    const fetch = vi.fn(async () => okResponse(itunesPayload));
    const results = await searchSongs("september", { fetch });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      {
        trackId: "1440758413",
        title: "September",
        artist: "Earth, Wind & Fire",
        artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/a/100x100bb.jpg",
        previewUrl: "https://audio-ssl.itunes.apple.com/p.m4a",
      },
    ]);
  });

  it("returns [] for empty results", async () => {
    const fetch = vi.fn(async () => okResponse({ resultCount: 0, results: [] }));
    expect(await searchSongs("zzzzqqq", { fetch })).toEqual([]);
  });

  it("returns [] (no throw) when fetch rejects", async () => {
    const fetch = vi.fn(async () => {
      throw new Error("network down");
    });
    await expect(searchSongs("september", { fetch })).resolves.toEqual([]);
  });

  it("returns [] on a non-OK response or malformed JSON", async () => {
    expect(await searchSongs("september", { fetch: async () => ({ ok: false, json: async () => ({}) }) })).toEqual([]);
    expect(
      await searchSongs("october", {
        fetch: async () => ({
          ok: true,
          json: async () => {
            throw new SyntaxError("bad json");
          },
        }),
      }),
    ).toEqual([]);
    expect(await searchSongs("november", { fetch: async () => okResponse({ results: "nope" }) })).toEqual([]);
  });

  it("returns [] when the request times out", async () => {
    const fetch = vi.fn(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise<never>((_, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))),
    );
    await expect(searchSongs("september", { fetch, timeoutMs: 20 })).resolves.toEqual([]);
  });

  it("skips queries shorter than 2 chars without fetching", async () => {
    const fetch = vi.fn(async () => okResponse(itunesPayload));
    expect(await searchSongs(" a ", { fetch })).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("caches successful lookups", async () => {
    const fetch = vi.fn(async () => okResponse(itunesPayload));
    await searchSongs("September", { fetch });
    await searchSongs("  september ", { fetch });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
