/**
 * Party details shown on /dj/requests. Edit these before sharing the link.
 */
export const party = {
  title: "Erick's 36th Birthday Party",
  /** Free text, shown as-is (e.g. "Saturday, Nov 14 · 8pm"). */
  date: "Saturday, December 5, 2026",
  blurb:
    "Help build the playlist! Search for a song (or type anything you like), ask for a vibe, add it to the list, and upvote what everyone else has requested.",
  /** Quick-pick chips shown when a guest requests a vibe/genre instead of a song. */
  vibeSuggestions: [
    "90s R&B",
    "Early 2000s hip-hop",
    "Throwbacks",
    "House",
    "Disco & funk",
    "Afrobeats",
    "Latin / reggaeton",
    "Sing-along classics",
    "Slow it down",
  ],
  /**
   * Vertical (9:16) background video, e.g. a Vercel Blob URL. Set to null to hide.
   * Keep it short, muted-friendly and small (aim for under ~10 MB).
   */
  videoUrl: null as string | null,
  /** Optional still image shown while the video loads (and for reduced-motion users). */
  videoPoster: null as string | null,
  /** Set to false after the party to stop new requests and upvotes. */
  requestsOpen: true,
} as const;

export type Party = typeof party;
