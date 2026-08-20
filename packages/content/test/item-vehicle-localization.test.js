import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { localizeEntity } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/items.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/items-vehicles.json"), "utf8"));
const items = canonical.items.filter((item) => item.data?.itemKind === "vehiclePurchase");

test("PT-BR vehicle catalog exactly covers all 6 canonical vehicle purchases", () => {
  assert.equal(items.length, 6);
  assert.equal(Object.keys(catalog.entries).length, 6);
  const expected = new Set(items.map((item) => item.canonicalId));
  assert.deepEqual(Object.keys(catalog.entries).filter((id) => !expected.has(id)), []);
  assert.deepEqual(items.filter((item) => !catalog.entries[item.canonicalId]).map((item) => item.canonicalId), []);
});

test("vehicle localization changes names only and preserves vehicle statistics", () => {
  for (const item of items) {
    const original = structuredClone(item);
    const localized = localizeEntity(item, catalog);
    assert.deepEqual(item, original, `${item.canonicalId}: canonical vehicle was mutated`);
    localized.name = item.name;
    assert.deepEqual(localized, item, `${item.canonicalId}: AC, HP, threshold, speed, crew, passengers or cargo changed`);
  }
});
