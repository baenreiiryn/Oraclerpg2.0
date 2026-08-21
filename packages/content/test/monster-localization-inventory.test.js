import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildMonsterLocalizationCatalog, collectMonsterPresentationStrings } from "../monster-localization.js";

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
const featureCatalogs = featureCatalogFiles.map((file) => JSON.parse(fs.readFileSync(path.join(localeDir, file), "utf8")));
const nameMap = JSON.parse(fs.readFileSync(path.join(localeDir, "monster-name-map.json"), "utf8"));
const monsters = monstersDoc.items ?? [];
const catalog = buildMonsterLocalizationCatalog({monsters, featureDefinitions: featureDoc.items ?? [], featureCatalogs, nameMap});

test("measure generated monster localization coverage", () => {
  const unresolved = [];
  let total = 0;
  let covered = 0;
  for (const monster of monsters) {
    const strings = collectMonsterPresentationStrings(monster);
    const overlay = catalog.entries[monster.canonicalId] ?? {};
    for (const [pathKey, value] of Object.entries(strings)) {
      total += 1;
      if (typeof overlay[pathKey] === "string") covered += 1;
      else unresolved.push({canonicalId: monster.canonicalId, monster: monster.name, path: pathKey, value});
    }
  }
  console.log(`MONSTER_LOCALIZATION_TOTAL=${total}`);
  console.log(`MONSTER_LOCALIZATION_COVERED=${covered}`);
  console.log(`MONSTER_LOCALIZATION_UNRESOLVED=${unresolved.length}`);
  const byPath = Object.fromEntries(Object.entries(Object.groupBy(unresolved, (row) => row.path.replace(/\.\d+/g, ".*"))).map(([key, rows]) => [key, rows.length]));
  console.log(`MONSTER_UNRESOLVED_BY_PATH=${JSON.stringify(byPath)}`);
  for (const row of unresolved) console.log(`MONSTER_UNRESOLVED=${JSON.stringify(row)}`);
});
