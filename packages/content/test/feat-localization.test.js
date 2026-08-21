import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath, localizeEntity } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/feats.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/feats.json"), "utf8"));

const REFERENCE_TAGS = new Set([
  "action", "condition", "creature", "feat", "hazard", "item", "itemProperty",
  "sense", "skill", "spell", "status", "table", "variantrule"
]);
const FORMATTING_TAGS = new Set(["b", "i", "em", "s", "strike", "u", "sup", "sub"]);

function getPath(root, pathKey) {
  return pathKey.split(".").reduce((cursor, part) => cursor?.[/^\d+$/.test(part) ? Number(part) : part], root);
}

function setPath(root, pathKey, value) {
  const parts = pathKey.split(".");
  let cursor = root;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = /^\d+$/.test(parts[index]) ? Number(parts[index]) : parts[index];
    cursor = cursor[key];
  }
  const leaf = parts.at(-1);
  cursor[/^\d+$/.test(leaf) ? Number(leaf) : leaf] = value;
}

function collectPresentationStrings(value, pathParts = [], out = {}) {
  if (typeof value === "string") {
    const pathKey = pathParts.join(".");
    if (isPresentationPath(pathKey)) out[pathKey] = value;
    return out;
  }
  if (!value || typeof value !== "object") return out;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectPresentationStrings(entry, [...pathParts, String(index)], out));
    return out;
  }
  for (const [key, entry] of Object.entries(value)) collectPresentationStrings(entry, [...pathParts, key], out);
  return out;
}

function macroIdentity(macro) {
  const body = macro.slice(2, -1);
  const space = body.indexOf(" ");
  const kind = space < 0 ? body : body.slice(0, space);
  const payload = space < 0 ? "" : body.slice(space + 1);
  const parts = payload.split("|");
  if (FORMATTING_TAGS.has(kind)) return null;
  if (REFERENCE_TAGS.has(kind)) return `${kind} ${parts.slice(0, Math.min(2, parts.length)).join("|")}`.trim();
  if (kind === "filter") return `${kind} ${parts.slice(1).join("|")}`.trim();
  if (kind === "chance") return `${kind} ${parts[0] ?? ""}`.trim();
  return body;
}

function uniqueSortedMatches(text, regex, map = (value) => value) {
  return [...new Set((text.match(regex) ?? []).map(map).filter((value) => value != null))].sort();
}

function stripMachineTokens(text) {
  return text
    .replace(/\{@[^}]+\}/g, " ")
    .replace(/&Reference\[[^\]]+\]/g, " ")
    .replace(/\[\[[^\]]+\]\]/g, " ")
    .replace(/@UUID\[[^\]]+\]/g, " ")
    .replace(/\{\{[^}]+\}\}/g, " ");
}

function numericTokens(text) {
  return uniqueSortedMatches(stripMachineTokens(text), /\d+(?:[.,]\d+)?(?:\/\d+)?/g, (value) => value.replace(",", "."));
}

function fingerprint(text) {
  return {
    macros: uniqueSortedMatches(text, /\{@[^}]+\}/g, macroIdentity),
    foundryReferences: uniqueSortedMatches(text, /&Reference\[[^\]]+\]/g),
    rolls: uniqueSortedMatches(text, /\[\[[^\]]+\]\]/g),
    uuids: uniqueSortedMatches(text, /@UUID\[[^\]]+\]/g),
    placeholders: uniqueSortedMatches(text, /\{\{[^}]+\}\}/g),
    numbers: numericTokens(text)
  };
}

function assertBalancedMarkup(text, label) {
  assert.equal((text.match(/\{@/g) ?? []).length, (text.match(/\{@[^}]*\}/g) ?? []).length, `${label}: unbalanced 5etools markup`);
  assert.equal((text.match(/\[\[/g) ?? []).length, (text.match(/\]\]/g) ?? []).length, `${label}: unbalanced Foundry roll markup`);
}

test("PT-BR feat catalog exactly covers all 17 canonical SRD 5.2 feats", () => {
  assert.equal(canonical.count, 17);
  assert.equal(canonical.items.length, 17);
  assert.equal(Object.keys(catalog.entries).length, 17);
  assert.equal(catalog.locale, "pt-BR");
  assert.equal(catalog.sourceLocale, "en");
  assert.equal(catalog.contentSource, "srd-5.2");
  assert.equal(catalog.entityType, "feature");
  assert.deepEqual(new Set(Object.keys(catalog.entries)), new Set(canonical.items.map((entity) => entity.canonicalId)));
});

test("every feat presentation string has a PT-BR overlay and preserves machine-significant text", () => {
  const byId = new Map(canonical.items.map((entity) => [entity.canonicalId, entity]));
  let checkedPaths = 0;

  for (const [canonicalId, overlay] of Object.entries(catalog.entries)) {
    const entity = byId.get(canonicalId);
    assert.ok(entity, `${canonicalId}: localization without canonical entity`);
    const expected = collectPresentationStrings(entity);
    assert.deepEqual(new Set(Object.keys(overlay)), new Set(Object.keys(expected)), `${canonicalId}: missing or stale presentation paths`);

    for (const [pathKey, translated] of Object.entries(overlay)) {
      assert.equal(isPresentationPath(pathKey), true, `${canonicalId}: non-presentation path ${pathKey}`);
      assert.equal(pathKey.endsWith(".invocation.entity.name"), false, `${canonicalId}: invocation identity must remain canonical`);
      const source = getPath(entity, pathKey);
      assert.equal(typeof source, "string", `${canonicalId}: ${pathKey} is not an existing canonical string`);
      assert.equal(typeof translated, "string", `${canonicalId}: ${pathKey} translation must be a string`);
      assert.deepEqual(fingerprint(translated), fingerprint(source), `${canonicalId} ${pathKey}: machine-significant text changed`);
      assertBalancedMarkup(translated, `${canonicalId} ${pathKey}`);
      checkedPaths += 1;
    }

    const before = structuredClone(entity);
    const localized = localizeEntity(entity, { entries: { [canonicalId]: overlay } });
    assert.deepEqual(entity, before, `${canonicalId}: localization mutated canonical data in place`);
    const restored = structuredClone(localized);
    for (const pathKey of Object.keys(overlay)) setPath(restored, pathKey, getPath(entity, pathKey));
    assert.deepEqual(restored, entity, `${canonicalId}: localization changed non-presentation mechanics or references`);
  }

  console.log(`FEAT_LOCALIZATION_PATHS_VERIFIED=${checkedPaths}`);
});
