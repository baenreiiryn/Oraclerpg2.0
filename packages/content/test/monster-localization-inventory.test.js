import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildFeatureSourceTranslationMap, buildMonsterLocalizationCatalog, collectMonsterPresentationStrings } from "../monster-localization.js";
import { translateFinalCommonMonsterVariant } from "../monster-localization-patterns-final.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const monstersDoc = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monsters.json"), "utf8"));
const featureDoc = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monster-features.json"), "utf8"));
const localeDir = path.join(here, "../locales/pt-BR/srd-5.2");
const featureCatalogs = [
  "monster-features-traits.json", "monster-features-actions-01.json", "monster-features-actions-02.json",
  "monster-features-actions-03.json", "monster-features-actions-04.json", "monster-features-bonus-actions.json",
  "monster-features-legendary-actions.json", "monster-features-reactions.json"
].map((file) => JSON.parse(fs.readFileSync(path.join(localeDir, file), "utf8")));
const nameMap = JSON.parse(fs.readFileSync(path.join(localeDir, "monster-name-map.json"), "utf8"));
const monsters = monstersDoc.items ?? [];
const features = featureDoc.items ?? [];
const exactMap = buildFeatureSourceTranslationMap(features, featureCatalogs);
const catalog = buildMonsterLocalizationCatalog({monsters, featureDefinitions: features, featureCatalogs, nameMap});

test("inventory safe monster localization coverage", () => {
  const unresolved = [];
  let total = 0;
  let finalPatternCovered = 0;
  for (const monster of monsters) {
    const strings = collectMonsterPresentationStrings(monster);
    const overlay = catalog.entries[monster.canonicalId] ?? {};
    for (const [pathKey, value] of Object.entries(strings)) {
      total += 1;
      if (typeof overlay[pathKey] === "string") continue;
      const finalPattern = translateFinalCommonMonsterVariant(value, exactMap);
      if (typeof finalPattern === "string" && finalPattern.length) {
        finalPatternCovered += 1;
        continue;
      }
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
  console.log(`MONSTER_BASE_COVERED=${total - unresolved.length - finalPatternCovered}`);
  console.log(`MONSTER_FINAL_PATTERN_COVERED=${finalPatternCovered}`);
  console.log(`MONSTER_SAFE_COVERED=${total - unresolved.length}`);
  console.log(`MONSTER_SAFE_UNRESOLVED_LEAVES=${unresolved.length}`);
  console.log(`MONSTER_SAFE_UNRESOLVED_UNIQUE=${unique.length}`);
  const byPath = Object.fromEntries(Object.entries(Object.groupBy(unresolved, (row) => row.path.replace(/\.\d+/g, ".*"))).map(([key, rows]) => [key, rows.length]));
  console.log(`MONSTER_SAFE_UNRESOLVED_BY_PATH=${JSON.stringify(byPath)}`);
  const byDefinition = Object.entries(Object.groupBy(unresolved, (row) => row.definitionId ?? "<none>"))
    .map(([id, rows]) => [id, {count: rows.length, unique: new Set(rows.map((row) => row.value)).size, name: rows[0]?.featureName ?? null}])
    .sort((a, b) => b[1].count - a[1].count);
  console.log(`MONSTER_SAFE_UNRESOLVED_BY_DEFINITION=${JSON.stringify(Object.fromEntries(byDefinition))}`);
  for (const [index, row] of unique.entries()) console.log(`MONSTER_VARIANT_${index}=${JSON.stringify(row)}`);
  assert.equal(Object.keys(nameMap.names).length, 331);
});
