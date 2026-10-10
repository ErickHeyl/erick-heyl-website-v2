import type { APIRoute } from "astro";
import { seedLocalStore } from "../../../lib/devSeed";
import { isDev } from "../../../lib/env";
import { getRequestStore, type LocalRequestStore } from "../../../lib/requestStore";
import { json } from "../../../lib/songRequestsApi";

export const prerender = false;

/**
 * DEV ONLY. /api/song-requests/dev-seed        -> replace data with sample requests
 *           /api/song-requests/dev-seed?empty=1 -> clear everything (empty state)
 * Returns 404 in production builds and refuses to touch a Redis store.
 */
const handler: APIRoute = async ({ url }) => {
  if (!isDev()) return json(404, { error: "Not found." });
  // Duck-typed (not instanceof) so it survives dev-server module reloads.
  const store = (await getRequestStore()) as LocalRequestStore;
  if (store.kind === "redis") {
    return json(409, { error: "Seeding is only allowed against the local store (unset UPSTASH_* vars)." });
  }
  store.resetRateLimits();
  if (url.searchParams.has("empty")) {
    await store.clear();
    return json(200, { cleared: true });
  }
  const count = await seedLocalStore(store);
  return json(200, { seeded: count });
};

export const GET = handler;
export const POST = handler;
