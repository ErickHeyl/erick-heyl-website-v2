/**
 * Party details shown on /dj/requests. Edit these before sharing the link.
 */
export const party = {
  title: "Erick's Birthday Party",
  /** Free text, shown as-is (e.g. "Saturday, Nov 14 · 8pm"). */
  date: "TBD",
  blurb:
    "Help build the playlist! Search for a song (or type anything you like), add it to the list, and upvote what everyone else has requested.",
  /** Set to false after the party to stop new requests and upvotes. */
  requestsOpen: true,
} as const;

export type Party = typeof party;
