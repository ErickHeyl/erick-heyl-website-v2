// @astrojs/vercel v7 (the last line supporting Astro 4) only knows Node 18/20 and
// falls back to the "nodejs18.x" runtime when building on newer Node. Vercel no
// longer accepts Node 18 functions, so after `astro build` we set the function
// runtime to match the Node major used for the build (20, 22 or 24).
import { promises as fs } from "node:fs";
import path from "node:path";

const SUPPORTED = new Set([20, 22, 24]);
const major = Number(process.versions.node.split(".")[0]);
const functionsDir = path.join(process.cwd(), ".vercel", "output", "functions");

async function main() {
  let entries;
  try {
    entries = await fs.readdir(functionsDir);
  } catch {
    return; // no server functions (fully static build)
  }
  const runtime = `nodejs${SUPPORTED.has(major) ? major : 20}.x`;
  for (const dir of entries) {
    const file = path.join(functionsDir, dir, ".vc-config.json");
    let config;
    try {
      config = JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
      continue;
    }
    if (typeof config.runtime === "string" && config.runtime.startsWith("nodejs") && config.runtime !== runtime) {
      console.log(`[fix-vercel-runtime] ${dir}: ${config.runtime} -> ${runtime}`);
      config.runtime = runtime;
      await fs.writeFile(file, JSON.stringify(config, null, "\t"));
    }
  }
}

main();
