import { LocalRequestStore, newId } from "./requestStore";
import { searchSongs } from "./songSearch";
import type { SongRequest } from "./songRequestTypes";

type Seed = {
  title: string;
  artist: string;
  search?: string;
  requestedBy: string;
  note?: string;
  upvotes: number;
  status?: SongRequest["status"];
  minutesAgo: number;
};

const SEEDS: Seed[] = [
  { title: "September", artist: "Earth, Wind & Fire", search: "September Earth Wind Fire", requestedBy: "Maya", note: "for the birthday dance!", upvotes: 9, minutesAgo: 42 },
  { title: "Mr. Brightside", artist: "The Killers", search: "Mr. Brightside The Killers", requestedBy: "Anonymous", upvotes: 7, minutesAgo: 35 },
  { title: "Levels", artist: "Avicii", search: "Levels Avicii", requestedBy: "Jerry", note: "Drop it at midnight", upvotes: 5, minutesAgo: 18 },
  { title: "Erick's 35th Birthday Mix (the whole thing)", artist: "E.Heyl", requestedBy: "Tony", note: "run it back", upvotes: 3, minutesAgo: 12 },
  { title: "That song from the wedding with the saxophone", artist: "", requestedBy: "Sam", upvotes: 1, minutesAgo: 3 },
  { title: "Dancing Queen", artist: "ABBA", search: "Dancing Queen ABBA", requestedBy: "Priya", upvotes: 4, status: "played", minutesAgo: 55 },
];

/** Dev-only: replace the local store contents with ~6 sample requests. */
export async function seedLocalStore(store: LocalRequestStore, now = new Date()): Promise<number> {
  const requests: SongRequest[] = [];
  for (const s of SEEDS) {
    const base: SongRequest = {
      id: newId(),
      title: s.title,
      artist: s.artist,
      source: "custom",
      requestedBy: s.requestedBy,
      upvotes: s.upvotes,
      status: s.status ?? "pending",
      createdAt: new Date(now.getTime() - s.minutesAgo * 60_000).toISOString(),
    };
    if (s.note) base.note = s.note;
    if (s.search) {
      // Pull real artwork/trackIds when online; fall back to a plain search-sourced entry offline.
      const [hit] = await searchSongs(s.search, { limit: 1, timeoutMs: 3000 });
      base.source = "search";
      base.trackId = hit?.trackId ?? String(1_000_000 + requests.length);
      if (hit?.artworkUrl) base.artworkUrl = hit.artworkUrl;
    }
    requests.push(base);
  }
  await store.clear();
  await store.insertRaw(requests);
  return requests.length;
}
