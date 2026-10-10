export type SongRequestStatus = "pending" | "played" | "hidden";
export type SongRequestSource = "search" | "custom";

export type SongRequest = {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  /** From iTunes when source === "search". */
  trackId?: string;
  previewUrl?: string;
  source: SongRequestSource;
  /** "Anonymous" by default. */
  requestedBy: string;
  note?: string;
  upvotes: number;
  status: SongRequestStatus;
  /** ISO timestamp. */
  createdAt: string;
};

/** A validated, sanitized request ready to be stored. */
export type NewSongRequest = Omit<SongRequest, "id" | "upvotes" | "status" | "createdAt">;

export type SortOrder = "top" | "new";

export const LIMITS = {
  title: 100,
  artist: 100,
  name: 40,
  note: 140,
} as const;
