import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath, localizeEntity } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/class-features.json"), "utf8"));

function readCatalog(name) {
  return JSON.parse(fs.readFileSync(path.join(here, `../locales/pt-BR/srd-5.2/${name}`), "utf8"));
}

test("Barbarian PT-BR catalog covers every canonical Barbarian and Berserker feature", () => {
  const catalog = readCatalog("class-features-barbarian.json");
  const source = canonical.items.filter((item) => item.canonicalId.startsWith("dnd2024:2024:feature:barbarian:"));
  const missing = source.filter((item) => !catalog.entries[item.canonicalId]).map((item) => item.canonicalId);
  assert.deepEqual(missing, []);
  assert.equal(Object.keys(catalog.entries).length, source.length);

  for (const item of source) {
    const translated = localizeEntity(item, catalog);
    assert.equal(translated.id, item.id);
    assert.equal(translated.canonicalId, item.canonicalId);
  }
});

test("class-feature catalogs only use presentation paths", () => {
  for (const file of ["class-features-barbarian.json"]) {
    const catalog = readCatalog(file);
    for (const overlay of Object.values(catalog.entries)) {
      for (const pathKey of Object.keys(overlay)) {
        assert.equal(isPresentationPath(pathKey), true, `${file}: forbidden localization path ${pathKey}`);
      }
    }
  }
});
