/**
 * Self-hosted mixes on the DJ page (/dj), streamed straight from a public Vercel Blob URL.
 * No token is needed to play them: public blob URLs are readable by anyone with the link.
 *
 * How to add one: upload the MP3 (see docs/blob-mix-upload.md), then paste its URL into `url`.
 * Newest first. SoundCloud/Mixcloud embeds still live directly in src/pages/dj.astro.
 */
export type BlobMix = {
  /** Shown as the card heading. */
  title: string;
  /**
   * Public Vercel Blob URL, e.g. https://<store-id>.public.blob.vercel-storage.com/mixes/2026-12-05-erick-36th.mp3
   * Entries that still have a TODO placeholder are shown only in `npm run dev`, never on the live site.
   */
  url: string;
  /** Recording date, YYYY-MM-DD. */
  date: string;
  /** e.g. "House & Dance". */
  genre?: string;
  /** Running time as h:mm:ss or m:ss, e.g. "3:02:00". Shown before the file has loaded. */
  duration?: string;
  description?: string;
  /** Optional square cover image (a /public path or a Blob URL). */
  cover?: string;
  /** Show a "Download" link (each full download counts toward Blob data transfer). Default false. */
  downloadable?: boolean;
};

export const blobMixes: BlobMix[] = [
  {
    title: "Blob mix #1 (TODO: title)",
    url: "TODO_PASTE_BLOB_URL_1",
    date: "2026-12-05",
    genre: "TODO: genre",
    duration: "TODO",
    description: "TODO: one-line description.",
  },
  {
    title: "Blob mix #2 (TODO: title)",
    url: "TODO_PASTE_BLOB_URL_2",
    date: "2026-01-01",
    genre: "TODO: genre",
    description: "TODO: one-line description.",
  },
];

/** True until a real https URL has been pasted in. */
export function isPlaceholderMix(mix: Pick<BlobMix, "url">): boolean {
  return !/^https:\/\/\S+$/i.test(mix.url) || /TODO/i.test(mix.url);
}

/** Mixes to render: placeholders only show up in dev so the live page never shows a broken player. */
export function visibleBlobMixes(mixes: BlobMix[], { dev }: { dev: boolean }): BlobMix[] {
  return dev ? mixes : mixes.filter((m) => !isPlaceholderMix(m));
}

/** "2026-12-05" -> "Dec 5, 2026" (falls back to the raw string). */
export function formatMixDate(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** Seconds -> "m:ss" or "h:mm:ss". */
export function formatClock(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "--:--";
  const s = Math.floor(totalSeconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}
