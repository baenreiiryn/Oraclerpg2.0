import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath, localizeEntity } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/items.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/items-packs-containers.json"), "utf8"));
const items = canonical.items.filter((item) => ["pack", "container"].includes(item.data?.itemKind));

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

test("PT-BR pack/container catalog covers all 12 packs and 23 containers", () => {
  assert.equal(items.length, 35);
  assert.equal(items.filter((item) => item.data?.itemKind === "pack").length, 12);
  assert.equal(items.filter((item) => item.data?.itemKind === "container").length, 23);
  assert.equal(Object.keys(catalog.entries).length, 35);
  assert.equal(catalog.scope, "packs-containers");

  const expected = new Set(items.map((item) => item.canonicalId));
  assert.deepEqual(Object.keys(catalog.entries).filter((id) => !expected.has(id)), []);
  assert.deepEqual(items.filter((item) => !catalog.entries[item.canonicalId]).map((item) => item.canonicalId), []);
});

test("pack/container localization uses only existing presentation strings", () => {
  const byId = new Map(items.map((item) => [item.canonicalId, item]));
  for (const [canonicalId, overlay] of Object.entries(catalog.entries)) {
    const item = byId.get(canonicalId);
    assert.ok(item, `${canonicalId}: missing canonical item`);
    for (const [pathKey, value] of Object.entries(overlay)) {
      assert.equal(isPresentationPath(pathKey), true, `${canonicalId}: forbidden path ${pathKey}`);
      assert.equal(typeof value, "string", `${canonicalId}: ${pathKey} must be a string`);
      assert.equal(typeof getPath(item, pathKey), "string", `${canonicalId}: missing canonical string at ${pathKey}`);
    }
  }
});

test("pack/container localization preserves contents, quantities, capacity and every mechanical field", () => {
  for (const item of items) {
    const original = structuredClone(item);
    const originalContents = structuredClone(item.data?.contents);
    const overlay = catalog.entries[item.canonicalId];
    const localized = localizeEntity(item, catalog);

    assert.deepEqual(item, original, `${item.canonicalId}: canonical item was mutated`);
    assert.deepEqual(localized.data?.contents, originalContents, `${item.canonicalId}: contents or quantities changed`);

    const restored = structuredClone(localized);
    for (const pathKey of Object.keys(overlay)) setPath(restored, pathKey, getPath(item, pathKey));
    assert.deepEqual(restored, item, `${item.canonicalId}: localization changed mechanics, capacity, contents or undeclared data`);
  }
});

test("pack/container localization keeps inline markup balanced", () => {
  for (const overlay of Object.values(catalog.entries)) {
    for (const value of Object.values(overlay)) {
      if (typeof value !== "string") continue;
      assert.equal((value.match(/\{@/g) ?? []).length, (value.match(/\}/g) ?? []).length, value);
      assert.equal((value.match(/\[\[/g) ?? []).length, (value.match(/\]\]/g) ?? []).length, value);
    }
  }
});
