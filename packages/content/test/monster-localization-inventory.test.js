import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const monstersDoc = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monsters.json"), "utf8"));
const featureDoc = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monster-features.json"), "utf8"));
const localeDir = path.join(here, "../locales/pt-BR/srd-5.2");
const featureCatalogFiles = [
  "monster-features-traits.json",
  "monster-features-actions-01.json",
  "monster-features-actions-02.json",
  "monster-features-actions-03.json",
  "monster-features-actions-04.json",
  "monster-features-bonus-actions.json",
  "monster-features-legendary-actions.json",
  "monster-features-reactions.json"
];
const catalogs = featureCatalogFiles.map((file) => JSON.parse(fs.readFileSync(path.join(localeDir, file), "utf8")));
const featureEntries = Object.assign({}, ...catalogs.map((catalog) => catalog.entries));
const featuresById = new Map((featureDoc.items ?? []).map((feature) => [feature.canonicalId, feature]));
const monsters = monstersDoc.items ?? [];

function getPath(root, pathKey) {
  return pathKey.split(".").reduce((cursor, part) => cursor?.[part], root);
}

function collectPresentationStrings(root, prefix = "", out = {}) {
  if (typeof root === "string") {
    if (root.trim() && isPresentationPath(prefix) && !prefix.includes(".monsterTemplate.") && !prefix.endsWith(".invocation.entity.name")) out[prefix] = root;
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

const exactTranslations = new Map();
for (const [featureId, overlay] of Object.entries(featureEntries)) {
  const feature = featuresById.get(featureId);
  if (!feature) continue;
  for (const [pathKey, translated] of Object.entries(overlay)) {
    const source = getPath(feature, pathKey);
    if (typeof source !== "string" || !source.trim()) continue;
    const prior = exactTranslations.get(source);
    if (prior && prior !== translated) exactTranslations.set(source, null);
    else if (prior === undefined) exactTranslations.set(source, translated);
  }
}
for (const [source, translated] of [...exactTranslations]) if (translated == null) exactTranslations.delete(source);

test("measure reusable monster translations", () => {
  let total = 0;
  let exact = 0;
  const unresolvedNames = new Set();
  const unresolvedDescriptions = new Set();
  const unresolvedByShape = new Map();

  for (const monster of monsters) {
    const strings = collectPresentationStrings(monster);
    for (const [pathKey, source] of Object.entries(strings)) {
      total += 1;
      if (pathKey !== "name" && exactTranslations.has(source)) {
        exact += 1;
        continue;
      }
      const shape = pathKey.replace(/\.\d+/g, ".*");
      unresolvedByShape.set(shape, (unresolvedByShape.get(shape) ?? 0) + 1);
      if (pathKey.endsWith(".name") || pathKey === "name") unresolvedNames.add(source);
      else if (pathKey.endsWith(".description")) unresolvedDescriptions.add(source);
    }
  }

  console.log(`MONSTER_COUNT=${monsters.length}`);
  console.log(`MONSTER_NONEMPTY_PRESENTATION_STRING_COUNT=${total}`);
  console.log(`MONSTER_EXACT_FEATURE_TRANSLATION_REUSE=${exact}`);
  console.log(`MONSTER_UNRESOLVED_LEAVES=${total - exact}`);
  console.log(`MONSTER_UNRESOLVED_UNIQUE_NAMES=${unresolvedNames.size}`);
  console.log(`MONSTER_UNRESOLVED_UNIQUE_DESCRIPTIONS=${unresolvedDescriptions.size}`);
  console.log(`MONSTER_UNRESOLVED_BY_SHAPE=${JSON.stringify(Object.fromEntries([...unresolvedByShape].sort()))}`);
  console.log(`MONSTER_EXACT_DICTIONARY_SIZE=${exactTranslations.size}`);
  console.log(`MONSTER_NAMES=${JSON.stringify(monsters.map((monster) => [monster.canonicalId, monster.name]))}`);
  console.log(`MONSTER_UNRESOLVED_NAME_VALUES=${JSON.stringify([...unresolvedNames].sort())}`);
});
