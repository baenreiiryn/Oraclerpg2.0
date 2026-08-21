import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath, localizeEntity } from "../localization.js";
import { buildCompleteMonsterLocalizationCatalog } from "../monster-localization-complete.js";
import { collectMonsterPresentationStrings } from "../monster-localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monsters.json"), "utf8"));
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
const variantCatalogFiles = [
  "monster-materialized-variants-01.json",
  "monster-materialized-variants-02.json",
  "monster-materialized-variants-03.json"
];
const featureCatalogs = featureCatalogFiles.map((file) => JSON.parse(fs.readFileSync(path.join(localeDir, file), "utf8")));
const variantCatalogs = variantCatalogFiles.map((file) => JSON.parse(fs.readFileSync(path.join(localeDir, file), "utf8")));
const variantTranslations = Object.assign({}, ...variantCatalogs.map((catalog) => catalog.translations ?? {}));
const nameMap = JSON.parse(fs.readFileSync(path.join(localeDir, "monster-name-map.json"), "utf8"));
const monsters = canonical.items ?? [];
const catalog = buildCompleteMonsterLocalizationCatalog({
  monsters,
  featureDefinitions: featureDoc.items ?? [],
  featureCatalogs,
  nameMap,
  variantTranslations
});

function getPath(root, pathKey) {
  return pathKey.split(".").reduce((cursor, part) => cursor?.[/^\d+$/.test(part) ? Number(part) : part], root);
}

function setPath(root, pathKey, value) {
  const parts = pathKey.split(".");
  let cursor = root;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = /^\d+$/.test(parts[index]) ? Number(parts[index]) : parts[index];
    cursor = cursor?.[key];
    if (cursor == null) return;
  }
  const leaf = parts.at(-1);
  const key = /^\d+$/.test(leaf) ? Number(leaf) : leaf;
  cursor[key] = value;
}

test("PT-BR monster catalog exactly covers all 331 canonical SRD 5.2 creatures", () => {
  assert.equal(canonical.count, 331);
  assert.equal(monsters.length, 331);
  assert.equal(Object.keys(nameMap.names).length, 331);
  assert.equal(Object.keys(catalog.entries).length, 331);
  assert.deepEqual(Object.keys(catalog.entries).sort(), monsters.map((monster) => monster.canonicalId).sort());
});

test("every visual string across all 331 creatures has a PT-BR overlay", () => {
  let total = 0;
  for (const monster of monsters) {
    const expected = collectMonsterPresentationStrings(monster);
    const overlay = catalog.entries[monster.canonicalId];
    assert.ok(overlay, `${monster.canonicalId}: missing overlay`);
    assert.deepEqual(Object.keys(overlay).sort(), Object.keys(expected).sort(), `${monster.canonicalId}: incomplete or stale presentation coverage`);
    total += Object.keys(expected).length;
  }
  assert.equal(total, 5497);
});

test("monster localization is presentation-only and preserves every canonical mechanic and reference", () => {
  for (const monster of monsters) {
    const overlay = catalog.entries[monster.canonicalId];
    for (const [pathKey, translated] of Object.entries(overlay)) {
      assert.equal(isPresentationPath(pathKey), true, `${monster.canonicalId}: forbidden path ${pathKey}`);
      assert.equal(pathKey.includes(".monsterTemplate."), false, `${monster.canonicalId}: monster template must remain canonical`);
      assert.equal(pathKey.endsWith(".invocation.entity.name"), false, `${monster.canonicalId}: invocation entity name must remain canonical`);
      assert.equal(typeof translated, "string", `${monster.canonicalId}: non-string overlay at ${pathKey}`);
      assert.equal(typeof getPath(monster, pathKey), "string", `${monster.canonicalId}: missing canonical string ${pathKey}`);
    }

    const original = structuredClone(monster);
    const localized = localizeEntity(monster, catalog);
    assert.deepEqual(monster, original, `${monster.canonicalId}: canonical creature mutated`);

    const restored = structuredClone(localized);
    for (const pathKey of Object.keys(overlay)) setPath(restored, pathKey, getPath(monster, pathKey));
    assert.deepEqual(restored, monster, `${monster.canonicalId}: a non-presentation field changed`);
  }
});

test("all localized creature strings keep 5etools and Foundry markup balanced", () => {
  for (const [canonicalId, overlay] of Object.entries(catalog.entries)) {
    for (const value of Object.values(overlay)) {
      assert.equal((value.match(/\{(?:@|#)/g) ?? []).length, (value.match(/\}/g) ?? []).length, `${canonicalId}: ${value}`);
      assert.equal((value.match(/\[\[/g) ?? []).length, (value.match(/\]\]/g) ?? []).length, `${canonicalId}: ${value}`);
    }
  }
});
