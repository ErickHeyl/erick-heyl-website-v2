/**
 * Blocks slurs and hate speech in guest-typed text. Ordinary swearing is allowed on purpose
 * ("play this fucking song" is fine); the goal is to keep offensive jokes off the shared list.
 *
 * Before matching, text is lowercased, accents are stripped and common character swaps are undone
 * (n1gg3r, $pic, f@g). Each letter of a term may be stretched (niiiigger).
 *
 * - WORD_TERMS match whole words only, plus a plural ending, so terms hiding inside innocent words
 *   don't trip the filter ("raccoon", "spicy", "grape", "Pakistan").
 * - ANYWHERE_TERMS are long, unambiguous terms that also match when spaced or punctuated out
 *   ("n i g g e r", "f.a.g.g.o.t").
 *
 * Extra words can be added per party in `party.blockedWords`.
 */
import { party } from "../data/party";

const WORD_TERMS = [
  // racial and ethnic slurs
  "nigger", "nigga", "niglet", "coon", "chink", "ching chong", "gook", "zipperhead", "spic", "spick",
  "wetback", "beaner", "kike", "raghead", "towelhead", "camel jockey", "paki", "porch monkey",
  "jungle bunny", "darkie", "darky", "redskin", "squaw", "golliwog",
  // homophobic and transphobic slurs
  "fag", "faggot", "faggy", "tranny", "trannie", "shemale", "he she",
  // ableist slurs
  "retard", "retarded", "mongoloid", "spaz", "spastic",
  // hate and violence
  "hitler", "heil hitler", "sieg heil", "white power", "kkk", "rape", "raped", "rapist",
  "kill yourself", "kys",
];

const ANYWHERE_TERMS = ["nigger", "nigga", "faggot", "chingchong", "heilhitler", "siegheil", "killyourself"];

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b",
  "@": "a", "$": "s", "!": "i", "|": "i", "+": "t",
};

const LEET_RE = /[0134578@$!|+]/g;

// Real words that contain a blocked term once spaces are ignored.
const INNOCENT_RE = /(?<![a-z])snigger\w*/g;

function base(text: string): string {
  return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Two readings of the text: swap symbols for the letters they imitate ("f@g", "n1gger"), and treat
 * them as plain punctuation ("slur!"). Text is blocked if either reading matches.
 */
function readings(text: string): string[] {
  const b = base(text);
  return [b.replace(LEET_RE, (c) => LEET[c] ?? c), b.replace(LEET_RE, " ")].map((r) => r.replace(INNOCENT_RE, " "));
}

const escape = (c: string) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "coon" -> c+o+o+n+ (each letter may repeat); spaces in phrases match any run of non-letters. */
function letters(term: string, between: string): string {
  return [...term]
    .map((c) => (c === " " ? "[^a-z]+" : `${escape(c)}+`))
    .join(between);
}

function wordPattern(term: string): RegExp {
  return new RegExp(`(?<![a-z])${letters(term, "")}(?:e?s|z)?(?![a-z])`);
}

function anywherePattern(term: string): RegExp {
  return new RegExp(letters(term, "[^a-z]*"));
}

const BUILT_IN: RegExp[] = [...WORD_TERMS.map(wordPattern), ...ANYWHERE_TERMS.map(anywherePattern)];

function patterns(): RegExp[] {
  const extra = (party.blockedWords as readonly string[])
    .map((w) => base(w).replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map(wordPattern);
  return extra.length ? [...BUILT_IN, ...extra] : BUILT_IN;
}

/** True when the text contains a slur, hate phrase, or one of the party's extra blocked words. */
export function isOffensive(text: string): boolean {
  if (!text) return false;
  const list = patterns();
  return readings(text).some((r) => list.some((re) => re.test(r)));
}

export const OFFENSIVE_MESSAGE = "That wording isn't allowed here. Please keep it friendly.";
