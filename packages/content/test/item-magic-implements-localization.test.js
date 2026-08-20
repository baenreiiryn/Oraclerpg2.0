import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath, localizeEntity } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/items.json"), "utf8"));
const rings = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/items-rings.json"), "utf8"));
const rods = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/items-rods.json"), "utf8"));
const wands = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/items-wands.json"), "utf8"));
const mundane = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/items-equipment-mundane.json"), "utf8"));

const groups = {
  rings: {
    items: canonical.items.filter((item) => item.data?.itemKind === "equipment" && item.data?.equipmentType === "RG"),
    catalog: rings,
    count: 34,
  },
  rods: {
    items: canonical.items.filter((item) => item.data?.itemKind === "equipment" && item.data?.equipmentType === "RD"),
    catalog: rods,
    count: 7,
  },
  wands: {
    items: canonical.items.filter((item) => item.data?.itemKind === "equipment" && item.data?.equipmentType === "WD"),
    catalog: wands,
    count: 15,
  },
};

const foci = canonical.items.filter(
  (item) => item.data?.itemKind === "equipment" && item.data?.equipmentType === "SCF"
);

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

function assertCatalog(groupName, { items, catalog, count }) {
  assert.equal(items.length, count);
  assert.equal(Object.keys(catalog.entries).length, count);
  assert.equal(catalog.scope, groupName);

  const expected = new Set(items.map((item) => item.canonicalId));
  assert.deepEqual(Object.keys(catalog.entries).filter((id) => !expected.has(id)), []);
  assert.deepEqual(items.filter((item) => !catalog.entries[item.canonicalId]).map((item) => item.canonicalId), []);
}

function assertPresentationPaths(items, catalog) {
  const byId = new Map(items.map((item) => [item.canonicalId, item]));
  for (const [canonicalId, overlay] of Object.entries(catalog.entries)) {
    const item = byId.get(canonicalId);
    assert.ok(item, `${canonicalId}: missing canonical item`);
    assert.equal(typeof overlay.name, "string");
    assert.notEqual(overlay.name.trim(), "");
    for (const [pathKey, value] of Object.entries(overlay)) {
      assert.equal(isPresentationPath(pathKey), true, `${canonicalId}: forbidden path ${pathKey}`);
      assert.equal(typeof value, "string", `${canonicalId}: ${pathKey} must be a string`);
      assert.equal(typeof getPath(item, pathKey), "string", `${canonicalId}: missing canonical string at ${pathKey}`);
    }
  }
}

function assertMechanicsPreserved(items, catalog) {
  for (const item of items) {
    const original = structuredClone(item);
    const overlay = catalog.entries[item.canonicalId];
    assert.ok(overlay, `${item.canonicalId}: missing localization entry`);
    const localized = localizeEntity(item, catalog);
    assert.deepEqual(item, original, `${item.canonicalId}: canonical item was mutated`);

    const restored = structuredClone(localized);
    for (const pathKey of Object.keys(overlay)) setPath(restored, pathKey, getPath(item, pathKey));
    assert.deepEqual(restored, item, `${item.canonicalId}: localization changed mechanics or undeclared data`);
  }
}

function assertMarkupBalanced(catalog) {
  for (const overlay of Object.values(catalog.entries)) {
    for (const value of Object.values(overlay)) {
      if (typeof value !== "string") continue;
      assert.equal((value.match(/\{(?:@|#)/g) ?? []).length, (value.match(/\}/g) ?? []).length, value);
      assert.equal((value.match(/\[\[/g) ?? []).length, (value.match(/\]\]/g) ?? []).length, value);
    }
  }
}

test("PT-BR ring, rod and wand catalogs exactly cover their canonical SRD 5.2 categories", () => {
  for (const [groupName, group] of Object.entries(groups)) assertCatalog(groupName, group);
});

test("ring, rod and wand localization uses only existing presentation string paths", () => {
  for (const group of Object.values(groups)) assertPresentationPaths(group.items, group.catalog);
});

test("ring, rod and wand localization preserves rarity, attunement, charges, DCs, spell refs and every mechanical field", () => {
  for (const group of Object.values(groups)) assertMechanicsPreserved(group.items, group.catalog);
});

test("ring, rod and wand localization keeps inline markup balanced", () => {
  for (const group of Object.values(groups)) assertMarkupBalanced(group.catalog);
});

test("all 10 spellcasting foci are covered by the PT-BR equipment localization", () => {
  assert.equal(foci.length, 10);
  const missing = foci.filter((item) => !mundane.entries[item.canonicalId]).map((item) => item.canonicalId);
  assert.deepEqual(missing, [], `missing PT-BR spellcasting foci: ${missing.join(", ")}`);
  for (const item of foci) {
    const overlay = mundane.entries[item.canonicalId];
    assert.equal(typeof overlay.name, "string");
    assert.notEqual(overlay.name.trim(), "");
    for (const [pathKey, value] of Object.entries(overlay)) {
      assert.equal(isPresentationPath(pathKey), true, `${item.canonicalId}: forbidden path ${pathKey}`);
      assert.equal(typeof value, "string", `${item.canonicalId}: ${pathKey} must be a string`);
      assert.equal(typeof getPath(item, pathKey), "string", `${item.canonicalId}: missing canonical string at ${pathKey}`);
    }

    const original = structuredClone(item);
    const localized = localizeEntity(item, mundane);
    assert.deepEqual(item, original, `${item.canonicalId}: canonical focus was mutated`);
    const restored = structuredClone(localized);
    for (const pathKey of Object.keys(overlay)) setPath(restored, pathKey, getPath(item, pathKey));
    assert.deepEqual(restored, item, `${item.canonicalId}: focus localization changed mechanics or undeclared data`);
  }
});
