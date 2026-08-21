import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildCompleteMonsterLocalizationCatalog } from "../monster-localization-complete.js";
import { collectMonsterPresentationStrings } from "../monster-localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const monstersDoc = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monsters.json"), "utf8"));
const featureDoc = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monster-features.json"), "utf8"));
const localeDir = path.join(here, "../locales/pt-BR/srd-5.2");
const featureCatalogs = [
  "monster-features-traits.json", "monster-features-actions-01.json", "monster-features-actions-02.json",
  "monster-features-actions-03.json", "monster-features-actions-04.json", "monster-features-bonus-actions.json",
  "monster-features-legendary-actions.json", "monster-features-reactions.json"
].map((file) => JSON.parse(fs.readFileSync(path.join(localeDir, file), "utf8")));
const variantCatalogs = [
  "monster-materialized-variants-01.json",
  "monster-materialized-variants-02.json",
  "monster-materialized-variants-03.json"
].map((file) => JSON.parse(fs.readFileSync(path.join(localeDir, file), "utf8")));
const variantTranslations = Object.assign({}, ...variantCatalogs.map((catalog) => catalog.translations ?? {}));
const nameMap = JSON.parse(fs.readFileSync(path.join(localeDir, "monster-name-map.json"), "utf8"));
const monsters = monstersDoc.items ?? [];
const features = featureDoc.items ?? [];
const catalog = buildCompleteMonsterLocalizationCatalog({
  monsters,
  featureDefinitions: features,
  featureCatalogs,
  nameMap,
  variantTranslations
});

test("inventory complete PT-BR monster localization coverage", () => {
  const unresolved = [];
  let total = 0;
  for (const monster of monsters) {
    const strings = collectMonsterPresentationStrings(monster);
    const overlay = catalog.entries[monster.canonicalId] ?? {};
    for (const [pathKey, value] of Object.entries(strings)) {
      total += 1;
      if (typeof overlay[pathKey] === "string") continue;
      const featureMatch = pathKey.match(/^data\.features\.(\d+)\./);
      const instance = featureMatch ? monster.data?.features?.[Number(featureMatch[1])] : null;
      unresolved.push({
        canonicalId: monster.canonicalId,
        monster: monster.name,
        path: pathKey,
        definitionId: instance?.definition?.canonicalId ?? null,
        featureName: instance?.name ?? null,
        value
      });
    }
  }
  const unique = [...new Map(unresolved.map((row) => [row.value, row])).values()];
  console.log(`MONSTER_LOCALIZATION_TOTAL=${total}`);
  console.log(`MONSTER_SAFE_COVERED=${total - unresolved.length}`);
  console.log(`MONSTER_SAFE_UNRESOLVED_LEAVES=${unresolved.length}`);
  console.log(`MONSTER_SAFE_UNRESOLVED_UNIQUE=${unique.length}`);
  for (const [index, row] of unique.entries()) console.log(`MONSTER_REMAINING_${index}=${JSON.stringify(row)}`);
  assert.equal(monsters.length, 331);
  assert.equal(Object.keys(nameMap.names).length, 331);
  assert.equal(total, 5497);
  assert.equal(unresolved.length, 0);
  assert.equal(unique.length, 0);
});
