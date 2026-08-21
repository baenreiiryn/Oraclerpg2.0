import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath, localizeEntity } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/items.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/items-tools.json"), "utf8"));
const items = canonical.items.filter((item) => item.data?.itemKind === "tool");

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

test("PT-BR tool catalog exactly covers all 40 canonical tools", () => {
  assert.equal(items.length, 40);
  assert.equal(Object.keys(catalog.entries).length, 40);
  assert.equal(catalog.locale, "pt-BR");
  assert.equal(catalog.entityType, "item");
  assert.equal(catalog.scope, "tools");
  const expected = new Set(items.map((item) => item.canonicalId));
  assert.deepEqual(Object.keys(catalog.entries).filter((id) => !expected.has(id)), []);
  assert.deepEqual(items.filter((item) => !catalog.entries[item.canonicalId]).map((item) => item.canonicalId), []);
});

test("tool localization uses only existing presentation string paths and preserves mechanics", () => {
  const byId = new Map(items.map((item) => [item.canonicalId, item]));
  for (const [canonicalId, overlay] of Object.entries(catalog.entries)) {
    const item = byId.get(canonicalId);
    assert.ok(item, `${canonicalId}: missing canonical tool`);
    assert.equal(typeof overlay.name, "string");
    assert.notEqual(overlay.name.trim(), "");
    for (const [pathKey, value] of Object.entries(overlay)) {
      assert.equal(isPresentationPath(pathKey), true, `${canonicalId}: forbidden path ${pathKey}`);
      assert.equal(typeof value, "string", `${canonicalId}: ${pathKey} must be a string`);
      assert.equal(typeof getPath(item, pathKey), "string", `${canonicalId}: missing canonical string at ${pathKey}`);
    }

    const original = structuredClone(item);
    const localized = localizeEntity(item, catalog);
    assert.deepEqual(item, original, `${canonicalId}: canonical item was mutated`);
    const restored = structuredClone(localized);
    for (const pathKey of Object.keys(overlay)) setPath(restored, pathKey, getPath(item, pathKey));
    assert.deepEqual(restored, item, `${canonicalId}: localization changed mechanics or undeclared data`);
  }
});

test("tool localization keeps inline markup balanced", () => {
  for (const overlay of Object.values(catalog.entries)) {
    for (const value of Object.values(overlay)) {
      if (typeof value !== "string") continue;
      assert.equal((value.match(/\{@/g) ?? []).length, (value.match(/\}/g) ?? []).length, value);
      assert.equal((value.match(/\[\[/g) ?? []).length, (value.match(/\]\]/g) ?? []).length, value);
    }
  }
});
