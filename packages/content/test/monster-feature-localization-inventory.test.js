import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monster-features.json"), "utf8"));
const features = (canonical.items ?? []).filter((feature) => !["trait", "action"].includes(feature.data?.category));

function collectPresentationStrings(root, prefix = "", out = {}) {
  if (typeof root === "string") {
    if (isPresentationPath(prefix) && !prefix.includes(".monsterTemplate.") && !prefix.endsWith(".invocation.entity.name")) out[prefix] = root;
    return out;
  }
  if (root == null || typeof root !== "object") return out;
  if (Array.isArray(root)) {
    root.forEach((value, index) => collectPresentationStrings(value, prefix ? `${prefix}.${index}` : String(index), out));
    return out;
  }
  for (const [key, value] of Object.entries(root)) collectPresentationStrings(value, prefix ? `${prefix}.${key}` : key, out);
  return out;
}

test("inventory remaining creature feature localization", () => {
  const counts = Object.fromEntries(Object.entries(Object.groupBy(features, (feature) => feature.data?.category ?? "<none>")).map(([category, items]) => [category, items.length]));
  console.log(`CREATURE_REMAINING_COUNTS=${JSON.stringify(counts)}`);
  console.log(`CREATURE_REMAINING_TOTAL=${features.length}`);
  for (const feature of features) console.log("CREATURE_REMAINING=" + JSON.stringify({canonicalId: feature.canonicalId, category: feature.data?.category, name: feature.name, strings: collectPresentationStrings(feature)}));
});
