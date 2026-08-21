import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath, localizeEntity } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monster-features.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/monster-features-actions-01.json"), "utf8"));
const actions = canonical.items.filter((feature) => feature.data?.category === "action").slice(0, 55);

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
    if (
      isPresentationPath(prefix) &&
      !prefix.includes(".monsterTemplate.") &&
      !prefix.endsWith(".invocation.entity.name")
    ) out.push(prefix);
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

test("PT-BR creature action batch 01 exactly covers canonical actions 0-54", () => {
  assert.equal(catalog.scope, "monster-features-actions-01");
  assert.equal(actions.length, 55);
  assert.equal(Object.keys(catalog.entries).length, 55);
  assert.deepEqual(Object.keys(catalog.entries), actions.map((feature) => feature.canonicalId));
});

test("every visual string in creature action batch 01 has a PT-BR overlay", () => {
  for (const feature of actions) {
    assert.deepEqual(Object.keys(catalog.entries[feature.canonicalId]).sort(), collectPresentationPaths(feature).sort(), `${feature.canonicalId}: incomplete or stale presentation coverage`);
  }
});

test("creature action batch 01 localization preserves every mechanical field", () => {
  for (const feature of actions) {
    const overlay = catalog.entries[feature.canonicalId];
    for (const [pathKey, value] of Object.entries(overlay)) {
      assert.equal(isPresentationPath(pathKey), true, `${feature.canonicalId}: forbidden path ${pathKey}`);
      assert.equal(pathKey.includes(".monsterTemplate."), false, `${feature.canonicalId}: template path must stay canonical`);
      assert.equal(pathKey.endsWith(".invocation.entity.name"), false, `${feature.canonicalId}: invocation entity name must stay canonical`);
      assert.equal(typeof value, "string");
      assert.equal(typeof getPath(feature, pathKey), "string", `${feature.canonicalId}: missing canonical string ${pathKey}`);
    }
    const original = structuredClone(feature);
    const localized = localizeEntity(feature, catalog);
    assert.deepEqual(feature, original, `${feature.canonicalId}: canonical feature mutated`);
    const restored = structuredClone(localized);
    for (const pathKey of Object.keys(overlay)) setPath(restored, pathKey, getPath(feature, pathKey));
    assert.deepEqual(restored, feature, `${feature.canonicalId}: mechanics changed`);
  }
});

test("creature action batch 01 keeps inline markup balanced", () => {
  for (const [canonicalId, overlay] of Object.entries(catalog.entries)) {
    for (const value of Object.values(overlay)) {
      assert.equal((value.match(/\{(?:@|#)/g) ?? []).length, (value.match(/\}/g) ?? []).length, `${canonicalId}: ${value}`);
      assert.equal((value.match(/\[\[/g) ?? []).length, (value.match(/\]\]/g) ?? []).length, `${canonicalId}: ${value}`);
    }
  }
});
