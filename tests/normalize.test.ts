import { describe, expect, it } from "vitest";
import { dedupeKeys, normalizePart, textKey, vibeKey } from "../src/lib/normalize";

describe("normalizePart", () => {
  it("ignores case, punctuation and extra whitespace", () => {
    expect(normalizePart("Mr. Brightside!")).toBe(normalizePart("mr brightside"));
    expect(normalizePart("  Don't   Stop Believin' ")).toBe("dont stop believin");
  });
  it("strips feat./ft./featuring variants", () => {
    const base = normalizePart("Lose Control");
    expect(normalizePart("Lose Control (feat. Ciara & Fat Man Scoop)")).toBe(base);
    expect(normalizePart("Lose Control [ft. Ciara]")).toBe(base);
    expect(normalizePart("Lose Control featuring Ciara")).toBe(base);
    expect(normalizePart("Lose Control ft Ciara")).toBe(base);
    expect(normalizePart("Lose Control (with Ciara)")).toBe(base);
  });
  it("treats & / and / + the same and drops a leading 'The'", () => {
    expect(normalizePart("Earth, Wind & Fire")).toBe(normalizePart("Earth Wind and Fire"));
    expect(normalizePart("The Killers")).toBe(normalizePart("killers"));
  });
  it("strips diacritics and remaster/edit suffixes", () => {
    expect(normalizePart("Beyoncé")).toBe("beyonce");
    expect(normalizePart("Hey Jude - Remastered 2015")).toBe("hey jude");
    expect(normalizePart("Levels (Radio Edit)")).toBe("levels");
  });
});

describe("dedupe keys", () => {
  it("matches custom entries by normalized title+artist", () => {
    expect(textKey("MR. BRIGHTSIDE", "the killers")).toBe(textKey("Mr Brightside", "The Killers"));
    expect(textKey("September", "Earth Wind & Fire")).not.toBe(textKey("December", "Earth Wind & Fire"));
  });
  it("puts the trackId key first when present", () => {
    expect(dedupeKeys({ title: "Levels", artist: "Avicii", trackId: "123" })).toEqual(["track:123", textKey("Levels", "Avicii")]);
    expect(dedupeKeys({ title: "Levels", artist: "Avicii" })).toEqual([textKey("Levels", "Avicii")]);
  });
  it("matches vibes by normalized text, in their own key space", () => {
    expect(dedupeKeys({ title: "90's R&B", artist: "", source: "vibe" })).toEqual([vibeKey("90s r and b")]);
    expect(vibeKey("Disco & Funk")).toBe(vibeKey("disco and funk"));
    expect(dedupeKeys({ title: "Disco", artist: "", source: "vibe" })).not.toContain(textKey("Disco", ""));
  });
});
