# Erick Heyl

Personal site for Erick Heyl: videography, DJ mixes, and a song request page for parties.

Built with [Astro](https://astro.build) 4 and Tailwind, deployed on Vercel. Pages are static except
`/dj/requests` and its API routes, which run as a Vercel serverless function.

## Development

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # production build (.vercel/output)
npm test           # unit tests (Vitest)
npm run test:e2e   # browser tests (Playwright, starts the dev server)
```

## DJ mixes (`/dj`)

SoundCloud/Mixcloud embeds live in `src/pages/dj.astro`. Self-hosted mixes (MP3s on Vercel Blob, played with
a built-in audio player) are listed in `src/data/mixes.ts`. Upload steps: [docs/blob-mix-upload.md](docs/blob-mix-upload.md).

## Song requests (`/dj/requests`)

Guests search for songs (iTunes Search API), type anything in, or request a vibe/genre, then upvote
each other's requests. Spec: [SongRequests.md](SongRequests.md).

- **Party details, vibe chips, background video, flyer:** `src/data/party.ts` (flyer web copies: `node scripts/optimize-flyer.mjs`)
- **Admin view:** `/dj/requests?admin=<SONG_REQUESTS_ADMIN_TOKEN>` (in `npm run dev` the token is `dev-dj-admin`)
- **Local demo data:** `/api/song-requests/dev-seed` (dev only; `?empty=1` clears it)

### Environment variables (Vercel)

| Name | Purpose |
|---|---|
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL` / `KV_REST_API_TOKEN`) | Request storage. Added automatically by the Upstash integration. Without them, requests are kept in memory and lost between requests. |
| `SONG_REQUESTS_ADMIN_TOKEN` | Enables admin controls in production. |

Locally, requests are saved to `.data/song-requests.json` (gitignored).
