import { describe, expect, it } from "vitest";
import { cleanText, isValidId, validateRequestInput } from "../src/lib/sanitize";

describe("cleanText", () => {
  it("trims and collapses whitespace", () => {
    expect(cleanText("  Mr.   Brightside \n\t ")).toBe("Mr. Brightside");
  });
  it("strips HTML tags and stray angle brackets", () => {
    expect(cleanText('<b>Hey</b> <script>alert("x")</script>Jude')).toBe('Hey alert("x") Jude');
    expect(cleanText("<img src=x onerror=alert(1)>Song")).toBe("Song");
    expect(cleanText("a < b > c")).toBe("a b c");
    expect(cleanText("<script")).toBe("");
    expect(cleanText("I <3 NY")).toBe("I 3 NY");
  });
  it("removes control and zero-width characters", () => {
    expect(cleanText("Le\u0000vels​ Avicii")).toBe("Le vels Avicii");
  });
  it("returns empty string for non-strings", () => {
    expect(cleanText(undefined)).toBe("");
    expect(cleanText(42)).toBe("");
    expect(cleanText({})).toBe("");
  });
});

describe("validateRequestInput", () => {
  const custom = { source: "custom", title: "Levels", artist: "Avicii" };

  it("accepts a minimal custom request and defaults the name", () => {
    const r = validateRequestInput({ source: "custom", title: "Anything by Robyn" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({ source: "custom", title: "Anything by Robyn", artist: "", requestedBy: "Anonymous" });
    }
  });

  it("accepts a search request and keeps only safe iTunes URLs", () => {
    const r = validateRequestInput({
      source: "search",
      trackId: 1440758413,
      title: "September",
      artist: "Earth, Wind & Fire",
      artworkUrl: "https://is1-ssl.mzstatic.com/image/thumb/x/100x100bb.jpg",
      previewUrl: "javascript:alert(1)",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.trackId).toBe("1440758413");
      expect(r.value.artworkUrl).toContain("mzstatic.com");
      expect(r.value.previewUrl).toBeUndefined();
    }
  });

  it("drops artwork from non-iTunes hosts", () => {
    const r = validateRequestInput({ source: "search", trackId: "1", title: "a", artist: "b", artworkUrl: "https://evil.example/x.jpg" });
    expect(r.ok && r.value.artworkUrl).toBeFalsy();
  });

  it("enforces length limits (title/artist 100, name 40, note 140)", () => {
    expect(validateRequestInput({ ...custom, title: "x".repeat(100) }).ok).toBe(true);
    const tooLong = validateRequestInput({
      ...custom,
      title: "x".repeat(101),
      artist: "y".repeat(101),
      requestedBy: "n".repeat(41),
      note: "z".repeat(141),
    });
    expect(tooLong.ok).toBe(false);
    if (!tooLong.ok) expect(Object.keys(tooLong.errors).sort()).toEqual(["artist", "note", "requestedBy", "title"]);
    expect(validateRequestInput({ ...custom, requestedBy: "n".repeat(40), note: "z".repeat(140) }).ok).toBe(true);
  });

  it("measures length after sanitizing", () => {
    const padded = validateRequestInput({ ...custom, requestedBy: `   ${"n".repeat(40)}    ` });
    expect(padded.ok).toBe(true);
  });

  it("accepts a vibe request, drops any artist and enforces the 60-char limit", () => {
    const r = validateRequestInput({ source: "vibe", title: "  90s <b>R&B</b> ", artist: "ignored", requestedBy: "Nina" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual({ source: "vibe", title: "90s R&B", artist: "", requestedBy: "Nina" });
    expect(validateRequestInput({ source: "vibe", title: "x".repeat(60) }).ok).toBe(true);
    const long = validateRequestInput({ source: "vibe", title: "x".repeat(61) });
    expect(long.ok).toBe(false);
    if (!long.ok) expect(long.errors.title).toMatch(/60/);
    expect(validateRequestInput({ source: "vibe", title: "  " }).ok).toBe(false);
  });

  it("allows curse words in vibe text", () => {
    const r = validateRequestInput({ source: "vibe", title: "shit that slaps" });
    expect(r.ok && r.value.title).toBe("shit that slaps");
  });

  it("rejects missing/blank title, bad source and missing trackId", () => {
    expect(validateRequestInput({ source: "custom", title: "   " }).ok).toBe(false);
    expect(validateRequestInput({ source: "custom", title: "<b></b>" }).ok).toBe(false);
    expect(validateRequestInput({ source: "spotify", title: "x" }).ok).toBe(false);
    expect(validateRequestInput({ source: "search", title: "x", artist: "y" }).ok).toBe(false);
    expect(validateRequestInput({ source: "search", title: "x", artist: "y", trackId: "abc" }).ok).toBe(false);
    expect(validateRequestInput(null).ok).toBe(false);
    expect(validateRequestInput("hi").ok).toBe(false);
  });

  it("sanitizes all text fields", () => {
    const r = validateRequestInput({ source: "custom", title: " <i>Hey</i>   Ya! ", artist: "Outkast<br>", requestedBy: "<b>Sam</b>", note: "  for   the\ndance  " });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.title).toBe("Hey Ya!");
      expect(r.value.artist).toBe("Outkast");
      expect(r.value.requestedBy).toBe("Sam");
      expect(r.value.note).toBe("for the dance");
    }
  });

  it("keeps curse words as typed", () => {
    const r = validateRequestInput({ ...custom, requestedBy: "Shit Head", note: "play this fucking song" });
    expect(r.ok && r.value.requestedBy).toBe("Shit Head");
    expect(r.ok && r.value.note).toBe("play this fucking song");
  });

  it("rejects offensive wording in every typed field, with a friendly message", () => {
    const cases: Array<[Record<string, unknown>, string]> = [
      [{ ...custom, requestedBy: "f@ggot" }, "requestedBy"],
      [{ ...custom, note: "for the retard" }, "note"],
      [{ source: "custom", title: "n i g g e r song" }, "title"],
      [{ source: "custom", title: "Levels", artist: "kike" }, "artist"],
      [{ source: "vibe", title: "spic music" }, "title"],
    ];
    for (const [body, field] of cases) {
      const r = validateRequestInput(body);
      expect(r.ok, JSON.stringify(body)).toBe(false);
      if (!r.ok) expect(r.errors[field]).toBe("That wording isn't allowed here. Please keep it friendly.");
    }
  });

  it("doesn't filter title/artist of real iTunes results, but still checks name and note", () => {
    const real = { source: "search", trackId: "1", title: "Rape Me", artist: "Nirvana" };
    expect(validateRequestInput(real).ok).toBe(true);
    expect(validateRequestInput({ ...real, requestedBy: "tranny" }).ok).toBe(false);
  });
});

describe("isValidId", () => {
  it("accepts simple ids only", () => {
    expect(isValidId("abc123_-")).toBe(true);
    expect(isValidId("../etc")).toBe(false);
    expect(isValidId("")).toBe(false);
    expect(isValidId(undefined)).toBe(false);
  });
});
