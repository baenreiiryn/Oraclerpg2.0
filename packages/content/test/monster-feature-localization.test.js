import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath, localizeEntity } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monster-features.json"), "utf8"));
const catalogFiles = [
  "monster-features-traits.json",
  "monster-features-actions-01.json",
  "monster-features-actions-02.json",
  "monster-features-actions-03.json",
  "monster-features-actions-04.json",
  "monster-features-bonus-actions.json",
  "monster-features-legendary-actions.json",
  "monster-features-reactions.json"
];
const catalogs = catalogFiles.map((file) => JSON.parse(fs.readFileSync(path.join(here, `../locales/pt-BR/srd-5.2/${file}`), "utf8")));
const entries = Object.assign({}, ...catalogs.map((catalog) => catalog.entries));
const expectedCounts = { trait: 106, action: 219, bonusAction: 30, legendaryAction: 36, reaction: 14 };

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

function collectPresentationPaths(root, prefix = "", out = []) {
  if (typeof root === "string") {
    if (isPresentationPath(prefix) && !prefix.includes(".monsterTemplate.") && !prefix.endsWith(".invocation.entity.name")) out.push(prefix);
    return out;
  }
  if (root == null || typeof root !== "object") return out;
  if (Array.isArray(root)) {
    root.forEach((value, index) => collectPresentationPaths(value, prefix ? `${prefix}.${index}` : String(index), out));
    return out;
  }
  for (const [key, value] of Object.entries(root)) collectPresentationPaths(value, prefix ? `${prefix}.${key}` : key, out);
  return out;
}

test("PT-BR creature feature catalogs exactly cover all 405 canonical features", () => {
  assert.equal(canonical.count, 405);
  assert.equal(canonical.items.length, 405);
  assert.equal(Object.keys(entries).length, 405);
  for (const [category, expected] of Object.entries(expectedCounts)) {
    const canonicalIds = canonical.items.filter((feature) => feature.data?.category === category).map((feature) => feature.canonicalId).sort();
    const localizedIds = canonicalIds.filter((canonicalId) => Object.hasOwn(entries, canonicalId)).sort();
    assert.equal(canonicalIds.length, expected, `${category}: unexpected canonical count`);
    assert.deepEqual(localizedIds, canonicalIds, `${category}: incomplete localization coverage`);
  }
  assert.deepEqual(Object.keys(entries).sort(), canonical.items.map((feature) => feature.canonicalId).sort());
});

test("every visual string in every creature feature has a PT-BR overlay", () => {
  for (const feature of canonical.items) {
    const overlay = entries[feature.canonicalId];
    assert.ok(overlay, `${feature.canonicalId}: missing overlay`);
    assert.deepEqual(Object.keys(overlay).sort(), collectPresentationPaths(feature).sort(), `${feature.canonicalId}: incomplete or stale presentation coverage`);
  }
});

test("creature feature localization is presentation-only and preserves all mechanics", () => {
  for (const feature of canonical.items) {
    const overlay = entries[feature.canonicalId];
    for (const [pathKey, value] of Object.entries(overlay)) {
      assert.equal(isPresentationPath(pathKey), true, `${feature.canonicalId}: forbidden path ${pathKey}`);
      assert.equal(pathKey.includes(".monsterTemplate."), false, `${feature.canonicalId}: template path must stay canonical`);
      assert.equal(pathKey.endsWith(".invocation.entity.name"), false, `${feature.canonicalId}: invocation entity name must stay canonical`);
      assert.equal(typeof value, "string");
      assert.equal(typeof getPath(feature, pathKey), "string", `${feature.canonicalId}: missing canonical string ${pathKey}`);
    }
    const original = structuredClone(feature);
    const localized = localizeEntity(feature, { entries });
    assert.deepEqual(feature, original, `${feature.canonicalId}: canonical feature mutated`);
    const restored = structuredClone(localized);
    for (const pathKey of Object.keys(overlay)) setPath(restored, pathKey, getPath(feature, pathKey));
    assert.deepEqual(restored, feature, `${feature.canonicalId}: mechanics changed`);
  }
});

test("creature feature localization keeps inline markup balanced", () => {
  for (const [canonicalId, overlay] of Object.entries(entries)) {
    for (const value of Object.values(overlay)) {
      assert.equal((value.match(/\{(?:@|#)/g) ?? []).length, (value.match(/\}/g) ?? []).length, `${canonicalId}: ${value}`);
      assert.equal((value.match(/\[\[/g) ?? []).length, (value.match(/\]\]/g) ?? []).length, `${canonicalId}: ${value}`);
    }
  }
});
