import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";
import vercel from "@astrojs/vercel/serverless";

// https://astro.build/config
export default defineConfig({
  site: "https://heylproductions.vercel.app",
  // "hybrid": every page stays prerendered (static) unless it opts out with
  // `export const prerender = false` (only the song-request page + its API routes do).
  output: "hybrid",
  adapter: vercel(),
  integrations: [
    tailwind(),
    mdx(),
    sitemap(),
    icon(),
  ],
});
