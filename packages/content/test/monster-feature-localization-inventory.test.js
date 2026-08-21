import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monster-features.json"), "utf8"));
const features = (canonical.items ?? []).filter((feature) => feature.data?.category === "action");

test("inventory canonical SRD 5.2 creature action feature names", () => {
  console.log(`CREATURE_ACTION_COUNT=${features.length}`);
  console.log("CREATURE_ACTION_NAMES=" + JSON.stringify(features.map((feature, index) => ({
    index,
    canonicalId: feature.canonicalId,
    name: feature.name,
  }))));
});
