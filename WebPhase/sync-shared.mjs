#!/usr/bin/env node
/**
 * Copy the canonical shared primitives into each app.
 *
 * The three apps are separate Next.js projects with separate node_modules, so a
 * workspace package would need a dependency install per app. Copying a single
 * canonical file keeps one source of truth without that cost, and this script
 * is what makes the copies trustworthy: run it after editing `shared/ui.tsx`.
 *
 *   node sync-shared.mjs          # write the copies
 *   node sync-shared.mjs --check  # fail if a copy has drifted
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, "shared", "ui.tsx");
const apps = ["marketplace", "merchant", "admin"];
const check = process.argv.includes("--check");

const canonical = readFileSync(source, "utf8");
const banner = "// GENERATED FILE — do not edit. Source: WebPhase/shared/ui.tsx (run `node sync-shared.mjs`).\n";
const body = banner + canonical;

let drifted = 0;
for (const app of apps) {
  const target = join(here, app, "components", "shared", "ui.tsx");
  mkdirSync(dirname(target), { recursive: true });

  if (check) {
    const current = existsSync(target) ? readFileSync(target, "utf8") : "";
    if (current !== body) {
      console.error(`drifted: ${app}/components/shared/ui.tsx`);
      drifted++;
    }
    continue;
  }

  writeFileSync(target, body);
  console.log(`synced: ${app}/components/shared/ui.tsx`);
}

if (check) {
  if (drifted) {
    console.error(`\n${drifted} app(s) out of sync — run: node sync-shared.mjs`);
    process.exit(1);
  }
  console.log("all apps in sync");
}
