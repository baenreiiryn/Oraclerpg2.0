import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath, localizeEntity } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/items.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/items-weapons.json"), "utf8"));
const weapons = canonical.items.filter((item) => item.data?.itemKind === "weapon");

function getPath(root, pathKey) {
  return pathKey.split(".").reduce((cursor, part) => cursor?.[part], root);
}

function setPath(root, pathKey, value) {
  const parts = pathKey.split(".");
  let cursor = root;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const part = parts[index];
    cursor = cursor?.[part];
    if (cursor == null) return;
  }
  cursor[parts.at(-1)] = value;
}

test("PT-BR weapon catalog exactly covers all 63 canonical weapons", () => {
  assert.equal(weapons.length, 63);
  assert.equal(Object.keys(catalog.entries).length, 63);
  assert.equal(catalog.locale, "pt-BR");
  assert.equal(catalog.entityType, "item");
  assert.equal(catalog.scope, "weapons");

  const expected = new Set(weapons.map((item) => item.canonicalId));
  assert.deepEqual(Object.keys(catalog.entries).filter((id) => !expected.has(id)), []);
  assert.deepEqual(weapons.filter((item) => !catalog.entries[item.canonicalId]).map((item) => item.canonicalId), []);
});

test("weapon localization uses only existing presentation string paths", () => {
  const byId = new Map(weapons.map((item) => [item.canonicalId, item]));

  for (const [canonicalId, overlay] of Object.entries(catalog.entries)) {
    const item = byId.get(canonicalId);
    assert.ok(item, `${canonicalId}: missing canonical weapon`);
    assert.equal(typeof overlay.name, "string");
    assert.notEqual(overlay.name.trim(), "");

    for (const [pathKey, translatedValue] of Object.entries(overlay)) {
      assert.equal(isPresentationPath(pathKey), true, `${canonicalId}: forbidden localization path ${pathKey}`);
      assert.equal(typeof translatedValue, "string", `${canonicalId}: ${pathKey} must be a string`);
      assert.equal(typeof getPath(item, pathKey), "string", `${canonicalId}: missing canonical string at ${pathKey}`);
    }
  }
});

test("weapon localization changes only declared string leaves and preserves all mechanics", () => {
  for (const item of weapons) {
    const original = structuredClone(item);
    const overlay = catalog.entries[item.canonicalId];
    const localized = localizeEntity(item, catalog);

    assert.deepEqual(item, original, `${item.canonicalId}: canonical item was mutated`);

    const restored = structuredClone(localized);
    for (const pathKey of Object.keys(overlay)) {
      setPath(restored, pathKey, getPath(item, pathKey));
    }
    assert.deepEqual(restored, item, `${item.canonicalId}: localization changed mechanics or undeclared data`);
  }
});

test("weapon localization keeps inline markup balanced", () => {
  for (const overlay of Object.values(catalog.entries)) {
    for (const translatedValue of Object.values(overlay)) {
      if (typeof translatedValue !== "string") continue;
      assert.equal((translatedValue.match(/\{@/g) ?? []).length, (translatedValue.match(/\}/g) ?? []).length, translatedValue);
      assert.equal((translatedValue.match(/\[\[/g) ?? []).length, (translatedValue.match(/\]\]/g) ?? []).length, translatedValue);
    }
  }
});
