import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath, localizeEntity } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/items.json"), "utf8"));
const common = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/items-wondrous-common.json"), "utf8"));
const uncommon = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/items-wondrous-uncommon.json"), "utf8"));
const rare = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/items-wondrous-rare.json"), "utf8"));
const veryRare = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/items-wondrous-very-rare.json"), "utf8"));
const legendary = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/items-wondrous-legendary.json"), "utf8"));
const wondrous = canonical.items.filter((item) => item.data?.itemKind === "equipment" && item.data?.equipmentType === "wondrous");
const catalogs = { common, uncommon, rare, veryRare, legendary };
const entries = Object.assign({}, common.entries, uncommon.entries, rare.entries, veryRare.entries, legendary.entries);

function getPath(root, pathKey) {
  return pathKey.split(".").reduce((cursor, part) => cursor?.[part], root);
}

function setPath(root, pathKey, value) {
  const parts = pathKey.split(".");
  let cursor = root;
  for (let index = 0; index < parts.length - 1; index += 1) {
    cursor = cursor?.[parts[index]];
    if (cursor == null) return;
  }
  cursor[parts.at(-1)] = value;
}

test("PT-BR wondrous catalogs exactly cover all 148 canonical wondrous items", () => {
  assert.equal(wondrous.length, 148);
  assert.equal(wondrous.filter((item) => item.data?.rarity === "common").length, 1);
  assert.equal(wondrous.filter((item) => item.data?.rarity === "uncommon").length, 52);
  assert.equal(wondrous.filter((item) => item.data?.rarity === "rare").length, 41);
  assert.equal(wondrous.filter((item) => item.data?.rarity === "veryRare").length, 35);
  assert.equal(wondrous.filter((item) => item.data?.rarity === "legendary").length, 19);
  assert.equal(Object.keys(entries).length, 148);
  assert.equal(common.scope, "wondrous-common");
  assert.equal(uncommon.scope, "wondrous-uncommon");
  assert.equal(rare.scope, "wondrous-rare");
  assert.equal(veryRare.scope, "wondrous-very-rare");
  assert.equal(legendary.scope, "wondrous-legendary");

  const expected = new Set(wondrous.map((item) => item.canonicalId));
  assert.deepEqual(Object.keys(entries).filter((id) => !expected.has(id)), []);
  assert.deepEqual(wondrous.filter((item) => !entries[item.canonicalId]).map((item) => item.canonicalId), []);
});

test("all wondrous localization uses only existing presentation string paths", () => {
  const byId = new Map(wondrous.map((item) => [item.canonicalId, item]));
  for (const [canonicalId, overlay] of Object.entries(entries)) {
    const item = byId.get(canonicalId);
    assert.ok(item, `${canonicalId}: missing canonical wondrous item`);
    assert.equal(typeof overlay.name, "string");
    assert.notEqual(overlay.name.trim(), "");
    for (const [pathKey, value] of Object.entries(overlay)) {
      assert.equal(isPresentationPath(pathKey), true, `${canonicalId}: forbidden path ${pathKey}`);
      assert.equal(typeof value, "string", `${canonicalId}: ${pathKey} must be a string`);
      assert.equal(typeof getPath(item, pathKey), "string", `${canonicalId}: missing canonical string at ${pathKey}`);
    }
  }
});

test("all wondrous localization preserves rarity, attunement, charges, DCs, spell refs and every mechanical field", () => {
  for (const item of wondrous) {
    const original = structuredClone(item);
    const catalog = catalogs[item.data?.rarity];
    assert.ok(catalog, `${item.canonicalId}: missing catalog for rarity ${item.data?.rarity}`);
    const overlay = catalog.entries[item.canonicalId];
    assert.ok(overlay, `${item.canonicalId}: missing localization entry`);
    const localized = localizeEntity(item, catalog);
    assert.deepEqual(item, original, `${item.canonicalId}: canonical wondrous item was mutated`);

    const restored = structuredClone(localized);
    for (const pathKey of Object.keys(overlay)) setPath(restored, pathKey, getPath(item, pathKey));
    assert.deepEqual(restored, item, `${item.canonicalId}: localization changed mechanics or undeclared data`);
  }
});

test("all wondrous localization keeps inline markup balanced", () => {
  for (const overlay of Object.values(entries)) {
    for (const value of Object.values(overlay)) {
      if (typeof value !== "string") continue;
      assert.equal((value.match(/\{(?:@|#)/g) ?? []).length, (value.match(/\}/g) ?? []).length, value);
      assert.equal((value.match(/\[\[/g) ?? []).length, (value.match(/\]\]/g) ?? []).length, value);
    }
  }
});
