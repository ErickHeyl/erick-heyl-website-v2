# Uploading mixes to Vercel Blob

How to put the self-hosted mixes on the DJ page (`/dj`). Each mix is one MP3 file, stored as one
blob in the site's existing **public** Blob store (the store that already holds `birthday-bg.mp4`,
`https://pwzn8zm3ydesrveo.public.blob.vercel-storage.com/...`). The page plays the public URL directly,
so the site needs no token at runtime and no upload route.

Checked against the Vercel Blob docs on 2026-10-15 (vercel.com/docs/vercel-blob, `/usage-and-pricing`,
`/public-storage`, `/docs/cli/blob`) and Vercel CLI 64.2.0.

---

## 1. Before you upload: limits that matter

| Limit | Value | Why it matters for mixes |
|---|---|---|
| Max file size | 5 TB | Not a concern. Use multipart for anything over 100 MB (the CLI does by default). |
| **CDN cache limit** | **512 MB per blob** | Bigger blobs are never cached: every play is a cache MISS and costs extra (Simple Operation + Fast Origin Transfer). **Keep each mix under 512 MB.** |
| Hobby storage | 1 GB/month | Shared by everything in the store (the party video is ~7 MB). |
| Hobby Blob data transfer | 10 GB/month | Each full listen of a 300 MB mix uses ~0.3 GB. |
| **Hobby overage** | Blob is **switched off for 30 days** | No surprise bill, but it would also break the party background video. On Pro you pay for usage instead. |
| Default cache | 30 days (CDN + browser) | Fine for mixes. Don't overwrite files; see section 5. |

For reference, the existing local file `public/mixes/E.Heyl-35th-birthday-mix.mp3` is a 320 kbps / 48 kHz
MP3, about 3 h 2 min long and **436 MB**. That is under the cache limit, but two files like it would use
~870 MB of the 1 GB Hobby storage.

## 2. Format and bitrate

Export **MP3, constant bitrate (CBR), 44.1 kHz, stereo**. Every browser plays it, and CBR makes seeking
accurate in long files.

| Bitrate | Size per hour | 2 h mix | 3 h mix |
|---|---|---|---|
| 320 kbps | ~144 MB | ~288 MB | ~432 MB |
| 256 kbps | ~115 MB | ~230 MB | ~346 MB |
| **192 kbps** (recommended) | ~86 MB | ~173 MB | ~259 MB |
| 128 kbps | ~58 MB | ~115 MB | ~173 MB |

- **Recommendation: 192 kbps CBR.** On laptop speakers or phones it sounds the same as 320, both mixes
  fit easily in 1 GB, and listeners use about 40% less data.
- 320 kbps also works if each file stays under 512 MB and you're on Pro, or are fine with fewer full
  listens per month on Hobby.
- Avoid WAV/FLAC (5 to 10 times bigger) and VBR MP3 (seeking in long VBR files can land in the wrong spot).
- Keep the ID3 tags (title/artist), but leave out huge embedded cover art. A cover belongs in `cover` in
  `src/data/mixes.ts` (a small square JPG/WebP, about 600×600, under 150 KB).

## 3. Name the files

- Lowercase, no spaces, date first, `mixes/` folder:
  `mixes/2025-12-05-erick-35th-birthday.mp3`, `mixes/2026-12-05-erick-36th-birthday.mp3`
- The pathname is part of the public URL, so pick names you're happy for people to see.
- **One blob per mix file, all in the same store.** Don't make a store per mix.

## 4. Upload (pick one way)

### Option A: Vercel dashboard (no tools needed)

1. Go to vercel.com → your team → **Storage** → open the Blob store that holds `birthday-bg.mp4`.
   It must be the **public** one, because a store's access mode can't be changed later.
2. Click **Upload**, choose the MP3, and set the pathname to `mixes/<file>.mp3` if it lets you
   (otherwise upload first and keep the file name as-is).
3. When it finishes, open the blob and **copy its URL**. It looks like
   `https://pwzn8zm3ydesrveo.public.blob.vercel-storage.com/mixes/2026-12-05-erick-36th-birthday.mp3`.
4. Repeat for the second mix.

The dashboard is fine for a couple of files. If a 200 to 400 MB upload stalls or fails in the browser,
use Option B, which uploads in resumable chunks (multipart). Each dashboard action (browsing, uploading)
also counts as a Blob operation, but for two files that's negligible.

### Option B: Vercel CLI `vercel blob put`

Run from the repo folder. The CLI reads `BLOB_READ_WRITE_TOKEN` from `.env.local` (that file already has
it), so the token never needs to be typed or pasted.

```bash
cd c:\Users\erick\Code\erick-heyl-website-v2
npx vercel@latest blob put "C:\path\to\mix1.mp3" \
  --access public \
  --pathname mixes/2026-12-05-erick-36th-birthday.mp3 \
  --content-type audio/mpeg \
  --cache-control-max-age 31536000
```

- `--access public` is required. It must match the store, or the upload fails.
- Multipart is on by default, so large files are fine.
- `--cache-control-max-age 31536000` (1 year) suits files you never change. Leave it out to keep the
  30-day default.
- The command prints the blob URL. Copy it.
- Check what's there: `npx vercel@latest blob list --prefix mixes/`
- If the CLI says it can't find credentials, run `npx vercel@latest link` once to link this folder to the
  Vercel project, or pull env vars with `npx vercel@latest env pull .env.local`. Note that `env pull`
  **overwrites `.env.local`**.

### Option C: tiny Node script with `@vercel/blob` `put()`

Use this if you'd rather script it. The SDK isn't a project dependency, so install it temporarily:

```bash
npm install --no-save @vercel/blob
node --env-file=.env.local upload-mix.mjs "C:\path\to\mix1.mp3" mixes/2026-12-05-erick-36th-birthday.mp3
```

```js
// upload-mix.mjs (keep it outside src/; it's a one-off tool, not part of the site)
import { createReadStream } from "node:fs";
import { put } from "@vercel/blob";

const [file, pathname] = process.argv.slice(2);
const blob = await put(pathname, createReadStream(file), {
  access: "public",
  contentType: "audio/mpeg",
  multipart: true,                 // chunked + retried; recommended over 100 MB
  addRandomSuffix: false,          // keep the clean pathname you chose
  cacheControlMaxAge: 31536000,    // 1 year; files are never overwritten
  token: process.env.BLOB_READ_WRITE_TOKEN, // from .env.local, never hard-code it
});
console.log(blob.url);
```

## 5. Paste the URLs into the site

Open **`src/data/mixes.ts`** and edit the two placeholder entries in `blobMixes`:

```ts
{
  title: "36th Birthday Mix",                       // was "Blob mix #1 (TODO: title)"
  url: "https://pwzn8zm3ydesrveo.public.blob.vercel-storage.com/mixes/2026-12-05-erick-36th-birthday.mp3",
  date: "2026-12-05",                               // YYYY-MM-DD
  genre: "House & Dance",
  duration: "2:58:10",                              // optional; shown before the file loads
  description: "Recorded live at Heyl Night Club.", // optional
  // cover: "/pictures/mixes/36th-cover.jpg",       // optional square image
  // downloadable: true,                            // optional "Download MP3" link (uses more data)
},
```

- Order = display order (newest first). They appear at the top of **Recent Mixes** on `/dj`, above the
  SoundCloud/Mixcloud embeds, which are unchanged.
- An entry whose `url` still contains `TODO` (or isn't `https://`) shows as a dashed "TODO" card in
  `npm run dev` and is **left off the live site automatically**. A half-finished entry can't break the
  page.
- Check it with `npm run dev`, open http://localhost:4321/dj, press play, and drag the seek bar. Then run
  `npm run build && npm test`.

## 6. Caching and updating tips

- **Treat uploads as permanent.** To fix a mix, upload it under a new pathname (for example
  `...-v2.mp3`) and change the URL in `mixes.ts`. Overwriting needs `--allow-overwrite`, takes up to 60 s
  to reach the CDN, and browsers that already cached the old file can keep it for up to the max-age.
- If you do overwrite, add `?v=2` to the URL in `mixes.ts` to bust browser caches.
- The player uses `preload="none"`, so nothing downloads until someone presses play. The browser then
  streams with range requests (the Blob CDN supports `Accept-Ranges: bytes`), so a listener who plays
  5 minutes downloads only about 5 minutes of audio.
- Delete old versions you no longer use (`npx vercel@latest blob del <url>`). Deletes are free and storage
  is billed on the monthly average.
- Watch usage under **Observability → Blob** in the dashboard, especially in the weeks after you share
  the link.
- Optional: in the store's **Settings → Firewall**, you can add rate limiting if someone hotlinks the
  files.
- Don't commit MP3s to git. `public/mixes/*.mp3` is already gitignored, and Blob is where they live now.
