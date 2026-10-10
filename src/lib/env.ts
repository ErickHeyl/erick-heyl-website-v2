/**
 * Read a server-side env var. Astro/Vite exposes .env files via import.meta.env
 * (dev + build), while the Vercel runtime exposes real env vars via process.env.
 */
export function getEnv(name: string): string | undefined {
  let value: unknown = (import.meta.env as Record<string, unknown>)[name];
  if (typeof value !== "string" || value === "") {
    value = typeof process !== "undefined" ? process.env?.[name] : undefined;
  }
  return typeof value === "string" && value !== "" ? value : undefined;
}

export function isDev(): boolean {
  return Boolean(import.meta.env.DEV);
}

/** Fixed dev-only admin token so the local demo works without any setup. */
export const DEV_ADMIN_TOKEN = "dev-dj-admin";

/** Admin token from SONG_REQUESTS_ADMIN_TOKEN; in `astro dev` falls back to DEV_ADMIN_TOKEN. */
export function getAdminToken(): string | undefined {
  return getEnv("SONG_REQUESTS_ADMIN_TOKEN") ?? (isDev() ? DEV_ADMIN_TOKEN : undefined);
}
