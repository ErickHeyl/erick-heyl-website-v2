import { describe, expect, it } from "vitest";
import { party } from "../src/data/party";
import { isOffensive } from "../src/lib/moderation";

describe("isOffensive", () => {
  it("allows ordinary swearing", () => {
    for (const text of [
      "play this fucking song",
      "Shit Head",
      "Fuck You - CeeLo Green",
      "bad bitch energy",
      "damn, run it back",
      "Bitches Ain't Shit",
      "kiss my ass",
    ]) {
      expect(isOffensive(text), text).toBe(false);
    }
  });

  it("allows innocent words that contain a blocked term", () => {
    for (const text of [
      "Raccoon City",
      "something spicy",
      "Grapevine",
      "Pakistan Zindabad",
      "Tycoon",
      "Cocoon",
      "Fagioli",
      "snickering and sniggering",
      "Dick Van Dyke",
      "Scunthorpe United",
      "drapes",
      "the shed",
      "Niger",
      "Night Fever",
      "7 rings",
      "Blink-182",
    ]) {
      expect(isOffensive(text), text).toBe(false);
    }
  });

  it("blocks slurs and hate phrases", () => {
    for (const text of ["nigger", "my nigga", "faggot", "you fag", "retarded", "spic", "kike", "tranny", "heil hitler", "kill yourself", "kys"]) {
      expect(isOffensive(text), text).toBe(true);
    }
  });

  it("blocks plurals and any capitalization", () => {
    expect(isOffensive("FAGS")).toBe(true);
    expect(isOffensive("Coons")).toBe(true);
    expect(isOffensive("Retards")).toBe(true);
  });

  it("sees through symbol swaps, stretched letters and spacing", () => {
    for (const text of ["n1gg3r", "f@g", "$pic", "niiiiggerrr", "faaaggot", "n i g g e r", "f.a.g.g.o.t", "n-i-g-g-a", "Fag!", "spic$", "sieg-heil", "k i l l your self"]) {
      expect(isOffensive(text), text).toBe(true);
    }
  });

  it("blocks slurs inside longer text", () => {
    expect(isOffensive("play this for the retard in the corner")).toBe(true);
    expect(isOffensive("superniggerxx")).toBe(true);
  });

  it("also blocks the party's extra words (whole words only)", () => {
    const extra = party.blockedWords as string[];
    extra.push("Baby Shark");
    try {
      expect(isOffensive("baby   shark please")).toBe(true);
      expect(isOffensive("BABY SHARKS")).toBe(true);
      expect(isOffensive("Shark Tank theme")).toBe(false);
    } finally {
      extra.length = 0;
    }
  });

  it("ignores empty text", () => {
    expect(isOffensive("")).toBe(false);
  });
});
