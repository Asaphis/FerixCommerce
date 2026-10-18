#!/usr/bin/env node
/**
 * Copy canonical shared primitives into each app.
 *
 * The apps are independent Next.js projects; this keeps common UI and color
 * safety logic in one source without a workspace install in every app.
 *
 *   node sync-shared.mjs          # write the copies
 *   node sync-shared.mjs --check  # fail if a copy has drifted
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const apps = ["marketplace", "merchant", "admin"];
const check = process.argv.includes("--check");
const files = [
  { source: "shared/ui.tsx", target: "ui.tsx" },
  { source: "shared/colors.ts", target: "colors.ts" },
  { source: "shared/color-input.tsx", target: "color-input.tsx" },
];
let drifted = 0;

for (const file of files) {
  const sourcePath = join(here, file.source);
  const canonical = readFileSync(sourcePath, "utf8");
  const banner = `// GENERATED FILE — do not edit. Source: WebPhase/${file.source} (run \`node sync-shared.mjs\`).\n`;
  const body = banner + canonical;
  for (const app of apps) {
    const target = join(here, app, "components", "shared", file.target);
    mkdirSync(dirname(target), { recursive: true });
    if (check) {
      const current = existsSync(target) ? readFileSync(target, "utf8") : "";
      if (current !== body) {
        console.error(`drifted: ${app}/components/shared/${file.target}`);
        drifted++;
      }
    } else {
      writeFileSync(target, body);
      console.log(`synced: ${app}/components/shared/${file.target}`);
    }
  }
}

if (check) {
  if (drifted) {
    console.error(`\n${drifted} shared file(s) out of sync — run: node sync-shared.mjs`);
    process.exit(1);
  }
  console.log("all apps in sync");
}
