import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath, localizeEntity } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/items.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/items-armor.json"), "utf8"));
const items = canonical.items.filter((item) => item.data?.itemKind === "armor");

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

test("PT-BR armor catalog exactly covers all 31 canonical armor items", () => {
  assert.equal(items.length, 31);
  assert.equal(Object.keys(catalog.entries).length, 31);
  const expected = new Set(items.map((item) => item.canonicalId));
  assert.deepEqual(Object.keys(catalog.entries).filter((id) => !expected.has(id)), []);
  assert.deepEqual(items.filter((item) => !catalog.entries[item.canonicalId]).map((item) => item.canonicalId), []);
});

test("armor localization uses only existing presentation string paths and preserves mechanics", () => {
  const byId = new Map(items.map((item) => [item.canonicalId, item]));
  for (const [canonicalId, overlay] of Object.entries(catalog.entries)) {
    const item = byId.get(canonicalId);
    assert.ok(item);
    assert.equal(typeof overlay.name, "string");
    assert.notEqual(overlay.name.trim(), "");
    for (const [pathKey, value] of Object.entries(overlay)) {
      assert.equal(isPresentationPath(pathKey), true, `${canonicalId}: forbidden path ${pathKey}`);
      assert.equal(typeof value, "string");
      assert.equal(typeof getPath(item, pathKey), "string", `${canonicalId}: missing canonical string at ${pathKey}`);
    }

    const original = structuredClone(item);
    const localized = localizeEntity(item, catalog);
    assert.deepEqual(item, original);
    const restored = structuredClone(localized);
    for (const pathKey of Object.keys(overlay)) setPath(restored, pathKey, getPath(item, pathKey));
    assert.deepEqual(restored, item, `${canonicalId}: localization changed mechanics or undeclared data`);
  }
});
