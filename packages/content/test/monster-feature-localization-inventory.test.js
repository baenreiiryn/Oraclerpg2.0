import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monster-features.json"), "utf8"));
const allActions = (canonical.items ?? []).filter((feature) => feature.data?.category === "action");
const features = allActions.slice(55, 110);

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

test("inventory creature action localization batch 02", () => {
  console.log(`CREATURE_ACTION_BATCH_COUNT=${features.length}`);
  for (const feature of features) console.log("CREATURE_ACTION=" + JSON.stringify({canonicalId: feature.canonicalId, name: feature.name, strings: collectPresentationStrings(feature)}));
});
