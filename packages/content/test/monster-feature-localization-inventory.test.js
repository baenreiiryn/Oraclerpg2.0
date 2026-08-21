import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monster-features.json"), "utf8"));
const features = canonical.items ?? [];

function collectPresentationStrings(root, prefix = "", out = {}) {
  if (typeof root === "string") {
    if (
      isPresentationPath(prefix) &&
      !prefix.includes(".monsterTemplate.") &&
      !prefix.endsWith(".invocation.entity.name")
    ) out[prefix] = root;
    return out;
  }
  if (root == null || typeof root !== "object") return out;
  if (Array.isArray(root)) {
    root.forEach((value, index) => collectPresentationStrings(value, prefix ? `${prefix}.${index}` : String(index), out));
    return out;
  }
  for (const [key, value] of Object.entries(root)) {
    const next = prefix ? `${prefix}.${key}` : key;
    collectPresentationStrings(value, next, out);
  }
  return out;
}

test("inventory canonical SRD 5.2 creature features for PT-BR localization", () => {
  console.log(`CREATURE_FEATURE_COUNT=${features.length}`);

  const categories = {};
  const subtypes = {};
  const families = {};
  const activityKinds = {};
  const pathCounts = {};

  for (const feature of features) {
    const category = feature.data?.category ?? "<none>";
    const subtype = feature.data?.subtype ?? "<none>";
    const family = feature.data?.monsterTemplate?.family ?? "<none>";
    categories[category] = (categories[category] ?? 0) + 1;
    subtypes[subtype] = (subtypes[subtype] ?? 0) + 1;
    families[family] = (families[family] ?? 0) + 1;
    for (const activity of feature.data?.activities ?? []) {
      const kind = activity.kind ?? "<none>";
      activityKinds[kind] = (activityKinds[kind] ?? 0) + 1;
    }

    const strings = collectPresentationStrings(feature);
    for (const pathKey of Object.keys(strings)) {
      const normalized = pathKey.replace(/\.\d+(?=\.|$)/g, ".*");
      pathCounts[normalized] = (pathCounts[normalized] ?? 0) + 1;
    }

    console.log("CREATURE_FEATURE=" + JSON.stringify({
      canonicalId: feature.canonicalId,
      name: feature.name,
      category,
      subtype,
      family,
      strings,
    }));
  }

  console.log("CREATURE_FEATURE_CATEGORIES=" + JSON.stringify(categories));
  console.log("CREATURE_FEATURE_SUBTYPES=" + JSON.stringify(subtypes));
  console.log("CREATURE_FEATURE_FAMILIES=" + JSON.stringify(families));
  console.log("CREATURE_FEATURE_ACTIVITY_KINDS=" + JSON.stringify(activityKinds));
  console.log("CREATURE_FEATURE_PRESENTATION_PATHS=" + JSON.stringify(pathCounts));
});
