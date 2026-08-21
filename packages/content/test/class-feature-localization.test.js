import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath, localizeEntity } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/class-features.json"), "utf8"));
const classes = [
  "barbarian", "bard", "cleric", "druid", "fighter", "monk",
  "paladin", "ranger", "rogue", "sorcerer", "warlock", "wizard"
];

function readCatalog(name) {
  return JSON.parse(fs.readFileSync(path.join(here, `../locales/pt-BR/srd-5.2/${name}`), "utf8"));
}

for (const className of classes) {
  test(`${className} PT-BR catalog covers every canonical feature`, () => {
    const file = `class-features-${className}.json`;
    const catalog = readCatalog(file);
    const prefix = `dnd2024:2024:feature:${className}:`;
    const source = canonical.items.filter((item) => item.canonicalId.startsWith(prefix));
    const sourceIds = new Set(source.map((item) => item.canonicalId));
    const catalogIds = Object.keys(catalog.entries);
    const missing = source.filter((item) => !catalog.entries[item.canonicalId]).map((item) => item.canonicalId);
    const orphaned = catalogIds.filter((id) => !sourceIds.has(id));

    assert.deepEqual(missing, [], `${file}: missing canonical features`);
    assert.deepEqual(orphaned, [], `${file}: localization entries without canonical feature`);
    assert.equal(catalogIds.length, source.length, `${file}: catalog/source count mismatch`);

    for (const item of source) {
      const overlay = catalog.entries[item.canonicalId];
      assert.equal(typeof overlay?.name, "string", `${file}: ${item.canonicalId} has no localized name`);
      assert.notEqual(overlay.name.trim(), "", `${file}: ${item.canonicalId} has an empty localized name`);

      const translated = localizeEntity(item, catalog);
      assert.equal(translated.id, item.id);
      assert.equal(translated.canonicalId, item.canonicalId);
      assert.equal(translated.system.gameSystem, item.system.gameSystem);
      assert.equal(translated.system.rulesVersion, item.system.rulesVersion);
    }
  });
}

test("all class-feature catalogs only use presentation paths", () => {
  const seen = new Set();
  for (const className of classes) {
    const file = `class-features-${className}.json`;
    const catalog = readCatalog(file);
    assert.equal(catalog.locale, "pt-BR", `${file}: wrong locale`);
    assert.equal(catalog.sourceLocale, "en", `${file}: wrong source locale`);
    assert.equal(catalog.contentSource, "srd-5.2", `${file}: wrong content source`);
    assert.equal(catalog.entityType, "feature", `${file}: wrong entity type`);
    assert.equal(catalog.scope, className, `${file}: wrong scope`);

    for (const [canonicalId, overlay] of Object.entries(catalog.entries)) {
      assert.equal(seen.has(canonicalId), false, `duplicate localized canonicalId ${canonicalId}`);
      seen.add(canonicalId);
      for (const pathKey of Object.keys(overlay)) {
        assert.equal(isPresentationPath(pathKey), true, `${file}: forbidden localization path ${pathKey}`);
      }
    }
  }
});

test("the 12 class catalogs collectively cover every canonical class feature", () => {
  const localizedIds = new Set();
  for (const className of classes) {
    const catalog = readCatalog(`class-features-${className}.json`);
    for (const id of Object.keys(catalog.entries)) localizedIds.add(id);
  }
  const missing = canonical.items.filter((item) => !localizedIds.has(item.canonicalId)).map((item) => item.canonicalId);
  assert.deepEqual(missing, []);
  assert.equal(localizedIds.size, canonical.items.length);
});
