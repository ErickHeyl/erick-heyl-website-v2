import { describe, expect, it } from "vitest";
import { blobMixes, formatClock, formatMixDate, isPlaceholderMix, visibleBlobMixes } from "../src/data/mixes";

const real = { title: "Real", url: "https://abc123.public.blob.vercel-storage.com/mixes/real.mp3", date: "2026-12-05" };

describe("blob mixes", () => {
  it("treats TODO / non-https URLs as placeholders", () => {
    expect(isPlaceholderMix({ url: "TODO_PASTE_BLOB_URL_1" })).toBe(true);
    expect(isPlaceholderMix({ url: "" })).toBe(true);
    expect(isPlaceholderMix({ url: "http://example.com/a.mp3" })).toBe(true);
    expect(isPlaceholderMix({ url: "https://x.public.blob.vercel-storage.com/TODO.mp3" })).toBe(true);
    expect(isPlaceholderMix(real)).toBe(false);
  });

  it("hides placeholders outside dev", () => {
    const all = [...blobMixes, real];
    expect(visibleBlobMixes(all, { dev: true })).toHaveLength(all.length);
    expect(visibleBlobMixes(all, { dev: false })).toEqual(all.filter((m) => !isPlaceholderMix(m)));
  });

  it("every configured mix has a title and a YYYY-MM-DD date", () => {
    for (const mix of blobMixes) {
      expect(mix.title.trim()).not.toBe("");
      expect(mix.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("formats dates and clock times", () => {
    expect(formatMixDate("2026-12-05")).toBe("Dec 5, 2026");
    expect(formatMixDate("someday")).toBe("someday");
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(3 * 3600 + 2 * 60 + 9.7)).toBe("3:02:09");
    expect(formatClock(NaN)).toBe("--:--");
  });
});
