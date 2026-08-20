import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath, localizeEntity } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/items.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/items-mounts.json"), "utf8"));
const items = canonical.items.filter((item) => item.data?.itemKind === "mount");

test("PT-BR mount catalog exactly covers all 8 canonical mounts", () => {
  assert.equal(items.length, 8);
  assert.equal(Object.keys(catalog.entries).length, 8);
  assert.equal(catalog.scope, "mounts");
  const expected = new Set(items.map((item) => item.canonicalId));
  assert.deepEqual(Object.keys(catalog.entries).filter((id) => !expected.has(id)), []);
  assert.deepEqual(items.filter((item) => !catalog.entries[item.canonicalId]).map((item) => item.canonicalId), []);
});

test("mount localization changes names only and preserves every mechanical field", () => {
  for (const item of items) {
    const overlay = catalog.entries[item.canonicalId];
    assert.equal(isPresentationPath("name"), true);
    assert.equal(typeof overlay?.name, "string");
    assert.notEqual(overlay.name.trim(), "");

    const original = structuredClone(item);
    const localized = localizeEntity(item, catalog);
    assert.deepEqual(item, original, `${item.canonicalId}: canonical item was mutated`);
    localized.name = item.name;
    assert.deepEqual(localized, item, `${item.canonicalId}: mount localization changed data beyond the name`);
  }
});
