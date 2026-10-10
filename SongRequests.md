# Feature: Birthday Party Song Requests

## Goal
Add a shareable page, an extension of the existing DJ page, where guests at Erick's upcoming birthday party can:
1. Search for a real song (title + artist) **or** type in anything they want.
2. Submit it as a request, with an optional name and note.
3. See the live list of what other guests have requested, and upvote songs that are already on it.

Guests get the link by text or QR code at the party. Expect most visitors on **phones**, with no login.

Deliver: working feature on a branch, tests passing, and a local demo (plus screenshots) for Erick to approve. **Do not merge to `main`, push, or deploy without Erick's approval.**

---

## Project context (read before coding)
- **Framework:** Astro 4 (`package.json`, `astro.config.mjs`) with Tailwind and `astro-icon`. It is deployed on **Vercel** at `https://heylproductions.vercel.app`.
- **The site is currently fully static.** It has no adapter and no `output` setting, so it has no server endpoints yet.
- **Ignore the Next.js leftovers.** `app/`, `components/` (root level), `controllers/`, `models/` and `next.config.ts` come from an old wedding template. The build does not use them, so don't build on them and don't delete them.
- **Live pages** are in `src/pages/*.astro`. Shared layout: `src/layouts/Layout.astro`. Components: `src/components/`.
- **Existing DJ page:** `src/pages/dj.astro`. Copy its visual language:
  - Card background `#353439`, inner card `#26262a`, border `#555`, rounded-lg
  - Text `#F7F7F7` (primary), `#cccccc` (secondary). Accent: orange (`text-orange-600`, SoundCloud `#ff5500`)
  - Use `Container`, `Sectionhead` and `Layout` the same way `dj.astro` does
- **Navbar:** `src/components/navbar/navbar.astro`. Leave the nav alone. The request page is reached by direct link/QR, plus a small link/CTA on the DJ page.
- `.env.local` exists (it holds a `BLOB_READ_WRITE_TOKEN`). Never commit env files, and never print secret values.

---

## Requirements

### Route
- `/dj/requests` (file: `src/pages/dj/requests.astro`). Keep `/dj` working unchanged.
- Put the party details (title, date, short blurb) in one config object, e.g. `src/data/party.ts`, so Erick can edit them. Use obvious placeholders such as `"Erick's Birthday Party"` and `"TBD"`.

### Search + free-text entry (hybrid: support both)
- One input box. As the guest types (debounce ~300ms, min 2 chars), show up to ~8 matching tracks with **artwork thumbnail, song title, artist**.
- **Search provider: iTunes Search API**. It is free, needs no API key, and works from the browser:
  `https://itunes.apple.com/search?term=<q>&media=music&entity=song&limit=8`
  Store `trackName`, `artistName`, `artworkUrl100`, `trackId`, and optionally `previewUrl`.
  - Proxy it through our own API route (`/api/songs/search?q=`) so we can cache results, avoid CORS surprises, and swap providers later. Put the provider in its own module (`src/lib/songSearch.ts`).
  - If the search fails or times out, free-text entry still works and the UI shows no error wall.
- Always offer a **"Can't find it? Request '<what they typed>' anyway"** option. Free-text requests have optional separate Artist/Title fields, or just one line. Mark them `source: "custom"`.
- Optional fields: guest name (default "Anonymous") and a short note (≤140 chars, e.g. "for the birthday dance!").

### Request list
- Shown below the form and visible to everyone: song, artist, artwork (if any), requested by, upvote count, relative time.
- Sort options: **Most upvoted** (default) and **Newest**.
- **Duplicates:** if someone requests a song already on the list (same `trackId`, or the same normalized title+artist for custom entries), upvote the existing entry instead of adding a duplicate, and tell the guest.
- **Upvote** button, limited to one per song per browser (track it in `localStorage`; it doesn't have to be bulletproof).
- **Live-ish updates:** poll every ~10–15s while the tab is visible. No websockets needed.
- Requests marked "played" by the admin show as played/greyed at the bottom.

### Admin / moderation (lightweight)
- `/dj/requests?admin=<ADMIN_TOKEN>` (token from env var `SONG_REQUESTS_ADMIN_TOKEN`) adds per-item controls: **Mark played**, **Hide/Delete**. Check the token on the server for every admin action.
- Basic abuse protection:
  - Server-side validation and length limits (title/artist ≤ 100, name ≤ 40, note ≤ 140)
  - Trim/collapse whitespace, strip HTML, and render everything as escaped text
  - Simple per-IP rate limit (e.g. 10 submissions / 10 min)
  - A small profanity filter on names/notes is a nice-to-have, not required

### Backend & storage
- Add the Vercel adapter (`@astrojs/vercel`) with `output: "hybrid"` (Astro 4), so existing pages stay prerendered. Only the new page and API routes opt out with `export const prerender = false`. **Check that every existing page still builds as static.**
- API routes under `src/pages/api/song-requests/`:
  - `GET /api/song-requests` returns the list
  - `POST /api/song-requests` creates a request, or upvotes the existing one if it's a duplicate
  - `POST /api/song-requests/:id/upvote`
  - `PATCH /api/song-requests/:id` and `DELETE /api/song-requests/:id`, both admin only
  - `GET /api/songs/search?q=`
- **Storage:** hide it behind a small interface (`src/lib/requestStore.ts`) with two implementations:
  1. **Upstash Redis** (Vercel Marketplace integration; env `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, using `@upstash/redis`). Use this in production: it has atomic increments for upvotes and the free tier is plenty.
  2. **Local fallback:** a JSON file in `.data/` (gitignored), or in memory. Use it automatically when the Upstash env vars are missing, so local dev and the demo work with no accounts.
  - Don't use Vercel Blob as the database (concurrent writes would clobber each other), even though a Blob token exists.
  - **Do not create accounts or provision services yourself.** List the steps Erick needs to take in the handoff (see below).
- Data shape (suggested):
  ```ts
  type SongRequest = {
    id: string;
    title: string;
    artist: string;
    artworkUrl?: string;
    trackId?: string;            // from iTunes when source === "search"
    source: "search" | "custom";
    requestedBy: string;         // "Anonymous" default
    note?: string;
    upvotes: number;
    status: "pending" | "played" | "hidden";
    createdAt: string;           // ISO
  };
  ```

### UX details
- Mobile first: large tap targets, a search box that's usable with one thumb, and no horizontal scroll at 375px.
- A friendly success toast after a request ("Added! 🎶" / "Already on the list, we upvoted it for you").
- Empty state: "No requests yet, be the first!"
- The interactive island can be plain `<script>` in the `.astro` file, or a small framework island if you add one. Prefer staying dependency-light (vanilla TS is fine).
- Add a CTA card on `src/pages/dj.astro` linking to `/dj/requests` ("Coming to the party? Request a song →").

---

## Testing
The repo has no test setup yet. Add **Vitest** (dev dependency + `"test"` script) and cover:
- Validation/sanitization (length limits, HTML stripping, whitespace)
- Duplicate detection/normalization (case, punctuation, "feat." variants, the same `trackId`)
- The store: create, list order (upvotes, newest), upvote, mark played, hide. Test against the local fallback store.
- API handlers: a happy path, a 400 on bad input, a 401 on an admin action without the token, and rate limit tripping
- The search module with a mocked `fetch` (success, empty results, failure → empty array, not a throw)

Then do an end-to-end check in a real browser against `npm run dev` (Playwright, if you add it, or drive it manually). Search for a song, submit it, submit a custom entry, submit a duplicate, upvote, use admin mark-played and hide, and check the layout at mobile width.

`npm run build` must succeed, and `npm test` must pass, before you hand off.

---

## Workflow & handoff
1. Create branch `feature/song-requests` off `main`.
2. Make small, logical commits.
3. When done, prepare the **demo**:
   - Run `npm run dev` and leave it running. Give Erick the URL (e.g. `http://localhost:4321/dj/requests`) and the admin URL.
   - Seed ~6 sample requests (mixed search/custom, varied upvotes, one played) using a script or a `?seed` dev-only route that is **disabled in production**.
   - Save screenshots (desktop + mobile width) of: empty state, search dropdown, filled list, admin view. Put them in `docs/song-requests-demo/`, or attach them in your summary.
4. Write a short summary for Erick that covers:
   - What was built and how to try it
   - Test results (paste the actual output)
   - **Setup steps before going live:** add Upstash Redis via the Vercel dashboard (Storage → Marketplace → Upstash), set `SONG_REQUESTS_ADMIN_TOKEN` in Vercel env vars, and fill in `src/data/party.ts`
   - Known limitations / follow-ups (e.g. upvote limits are honor-system, QR code generation, closing requests after the party)
5. **Stop and wait for approval.** If Erick approves, push the branch, which gives a Vercel preview deployment. Merge only when Erick says so.

## Out of scope
- User accounts/logins
- Spotify integration / auto-adding songs to a playlist (possible follow-up: export the list as text or CSV)
- Changes to other pages, the navbar, or the old Next.js files
