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
   * Extra words to reject, on top of the built-in slur/hate list in src/lib/moderation.ts
   * (e.g. inside jokes you don't want on the list). Whole words, case-insensitive. Curse words are allowed.
   */
  blockedWords: [] as string[],
  /**
   * Vertical (9:16) background video, e.g. a Vercel Blob URL. Set to null to hide.
   * Keep it short, muted-friendly and small (aim for under ~10 MB).
   */
  videoUrl: "https://pwzn8zm3ydesrveo.public.blob.vercel-storage.com/birthday-bg.mp4" as string | null,
  /** Optional still image shown while the video loads (and for reduced-motion users). */
  videoPoster: "/dj/birthday-bg-poster.jpg" as string | null,
  /**
   * Party flyer shown at the top of the page (tap to enlarge). Set to null to hide.
   * The web copies come from scripts/optimize-flyer.mjs (the original PNG is ~4 MB).
   */
  flyer: {
    /** Small/medium/large WebP copies, used as a responsive srcset. */
    webp: {
      480: "/pictures/flyer/erick-36-flyer-480.webp",
      960: "/pictures/flyer/erick-36-flyer-960.webp",
      1400: "/pictures/flyer/erick-36-flyer-1400.webp",
    },
    /** JPEG copy: fallback, link-preview image and the "Save flyer" download. */
    jpg: "/pictures/flyer/erick-36-flyer-1200.jpg",
    /** Intrinsic aspect ratio of the flyer (width / height). */
    width: 1429,
    height: 2000,
    alt:
      "Party flyer in neon purple and pink: DJ EHEYL. Let's party, Erick's 36th. 12/05 at 6:00 PM, Heyl Night Club. " +
      "Wear your best rave/club attire. This is an adults-only event, thank you for getting a babysitter. " +
      "A black-and-white photo of Erick DJing on Pioneer decks glows inside a ring at the top.",
    /** Short facts shown next to the flyer. Keep them in sync with the flyer itself. */
    highlights: ["6:00 PM", "Heyl Night Club", "Dress code: rave / club attire", "Adults only"],
  } as const,
  /** Set to false after the party to stop new requests and upvotes. */
  requestsOpen: true,
} as const;

export type Party = typeof party;
