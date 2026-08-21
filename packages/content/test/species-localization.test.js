import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath, localizeEntity } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, "../data/srd-5.2");
const localeDir = path.join(here, "../locales/pt-BR/srd-5.2");

const canonicalSpecies = readJson(path.join(dataDir, "species.json"));
const canonicalFeatures = readJson(path.join(dataDir, "species-features.json"));
const speciesCatalog = readJson(path.join(localeDir, "species.json"));
const featureCatalog = readJson(path.join(localeDir, "species-features.json"));

const REFERENCE_TAGS = new Set([
  "action", "condition", "creature", "feat", "hazard", "item", "itemProperty",
  "sense", "skill", "spell", "status", "variantrule"
]);
const FORMATTING_TAGS = new Set(["b", "i", "em", "s", "strike", "u", "sup", "sub"]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

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
    if (
      isPresentationPath(pathKey)
      && !pathKey.includes(".speciesTemplate.")
      && !pathKey.endsWith(".invocation.entity.name")
    ) out[pathKey] = value;
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
  if (kind === "book") {
    const identityLength = parts.length >= 3 && /^\d/.test(parts[2]) ? 3 : Math.min(2, parts.length);
    return `${kind} ${parts.slice(0, identityLength).join("|")}`.trim();
  }
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
    rolls: uniqueSortedMatches(text, /\[\[[^\]]+\]\]/g),
    uuids: uniqueSortedMatches(text, /@UUID\[[^\]]+\]/g),
    placeholders: uniqueSortedMatches(text, /\{\{[^}]+\}\}/g),
    numbers: numericTokens(text)
  };
}

function assertMachineTextPreserved(source, translated, label) {
  assert.deepEqual(fingerprint(translated), fingerprint(source), `${label}: machine-significant text changed`);
}

function assertBalancedMarkup(text, label) {
  const withoutPlaceholders = text.replace(/\{\{[^}]+\}\}/g, "");
  assert.equal(
    (withoutPlaceholders.match(/\{@/g) ?? []).length,
    (withoutPlaceholders.match(/}/g) ?? []).length,
    `${label}: unbalanced 5etools markup`
  );
  assert.equal((text.match(/\[\[/g) ?? []).length, (text.match(/\]\]/g) ?? []).length, `${label}: unbalanced Foundry roll markup`);
}

function assertEncodedJsonPreserved(source, translated, label) {
  if (!source.trim().startsWith("{")) return;
  let parsedSource;
  try {
    parsedSource = JSON.parse(source);
  } catch {
    return;
  }
  const parsedTranslated = JSON.parse(translated);
  assert.equal(parsedTranslated?.type, parsedSource?.type, `${label}: encoded presentation JSON type changed`);
}

function auditCatalog(canonicalDoc, catalog, expectedType) {
  assert.equal(catalog.format, "oraclerpg-localization");
  assert.equal(catalog.version, 1);
  assert.equal(catalog.locale, "pt-BR");
  assert.equal(catalog.sourceLocale, "en");
  assert.equal(catalog.contentSource, "srd-5.2");
  assert.equal(catalog.entityType, expectedType);
  assert.equal(Object.keys(catalog.entries).length, canonicalDoc.items.length);

  const byId = new Map(canonicalDoc.items.map((entity) => [entity.canonicalId, entity]));
  assert.deepEqual(new Set(Object.keys(catalog.entries)), new Set(byId.keys()));

  let checkedPaths = 0;
  for (const [canonicalId, overlay] of Object.entries(catalog.entries)) {
    const entity = byId.get(canonicalId);
    assert.ok(entity, `${canonicalId}: localization without canonical entity`);
    const expected = collectPresentationStrings(entity);
    assert.deepEqual(new Set(Object.keys(overlay)), new Set(Object.keys(expected)), `${canonicalId}: missing or stale presentation paths`);

    for (const [pathKey, translated] of Object.entries(overlay)) {
      assert.equal(isPresentationPath(pathKey), true, `${canonicalId}: non-presentation path ${pathKey}`);
      assert.equal(pathKey.includes(".speciesTemplate."), false, `${canonicalId}: speciesTemplate must remain canonical`);
      assert.equal(pathKey.endsWith(".invocation.entity.name"), false, `${canonicalId}: invocation entity identity must remain canonical`);
      const source = getPath(entity, pathKey);
      assert.equal(typeof source, "string", `${canonicalId}: ${pathKey} is not an existing canonical string`);
      assert.equal(typeof translated, "string", `${canonicalId}: ${pathKey} translation must be a string`);
      assertMachineTextPreserved(source, translated, `${canonicalId} ${pathKey}`);
      assertBalancedMarkup(translated, `${canonicalId} ${pathKey}`);
      assertEncodedJsonPreserved(source, translated, `${canonicalId} ${pathKey}`);
      checkedPaths += 1;
    }

    const before = structuredClone(entity);
    const localized = localizeEntity(entity, { entries: { [canonicalId]: overlay } });
    assert.deepEqual(entity, before, `${canonicalId}: localization mutated canonical data in place`);
    const restored = structuredClone(localized);
    for (const pathKey of Object.keys(overlay)) setPath(restored, pathKey, getPath(entity, pathKey));
    assert.deepEqual(restored, entity, `${canonicalId}: localization changed non-presentation mechanics or references`);
  }
  return checkedPaths;
}

test("PT-BR species catalog exactly covers all 9 canonical SRD 5.2 species", () => {
  assert.equal(canonicalSpecies.items.length, 9);
  assert.equal(canonicalSpecies.count, 9);
  assert.equal(Object.keys(speciesCatalog.entries).length, 9);
});

test("PT-BR species-feature catalog exactly covers all 34 canonical SRD 5.2 features", () => {
  assert.equal(canonicalFeatures.items.length, 34);
  assert.equal(canonicalFeatures.count, 34);
  assert.equal(Object.keys(featureCatalog.entries).length, 34);
});

test("species localization covers every presentation string and preserves every canonical mechanic", () => {
  const paths = auditCatalog(canonicalSpecies, speciesCatalog, "species");
  console.log(`SPECIES_LOCALIZATION_PATHS_VERIFIED=${paths}`);
});

test("species feature localization covers every presentation string and preserves every canonical mechanic", () => {
  const paths = auditCatalog(canonicalFeatures, featureCatalog, "feature");
  console.log(`SPECIES_FEATURE_LOCALIZATION_PATHS_VERIFIED=${paths}`);
});
