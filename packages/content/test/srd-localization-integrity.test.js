import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath, localizeEntity } from "../localization.js";
import { buildCompleteMonsterLocalizationCatalog } from "../monster-localization-complete.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(here, "../data/srd-5.2");
const localeDir = path.join(here, "../locales/pt-BR/srd-5.2");

const DISPLAY_LABEL_TAGS = new Set([
  "action", "condition", "hazard", "item", "sense", "skill", "spell", "status", "variantrule"
]);
const FORBIDDEN_TEMPLATE_SEGMENTS = [".monsterTemplate.", ".speciesTemplate."];

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
    cursor = cursor?.[key];
    if (cursor == null) return;
  }
  const leaf = parts.at(-1);
  const key = /^\d+$/.test(leaf) ? Number(leaf) : leaf;
  cursor[key] = value;
}

function macroIdentity(macro) {
  const body = macro.slice(2, -1);
  const space = body.indexOf(" ");
  const kind = space < 0 ? body : body.slice(0, space);
  const payload = space < 0 ? "" : body.slice(space + 1);
  if (!DISPLAY_LABEL_TAGS.has(kind)) return body;
  const parts = payload.split("|");
  return `${kind} ${parts.slice(0, 2).join("|")}`.trim();
}

function uniqueSortedMatches(text, regex, map = (value) => value) {
  return [...new Set((text.match(regex) ?? []).map(map))].sort();
}

function stripMachineTokens(text) {
  return text
    .replace(/\{@[^}]+\}/g, " ")
    .replace(/\[\[[^\]]+\]\]/g, " ")
    .replace(/@UUID\[[^\]]+\]/g, " ")
    .replace(/\{\{[^}]+\}\}/g, " ");
}

function mechanicalTextFingerprint(text) {
  const plain = stripMachineTokens(text);
  return {
    macros: uniqueSortedMatches(text, /\{@[^}]+\}/g, macroIdentity),
    rolls: uniqueSortedMatches(text, /\[\[[^\]]+\]\]/g),
    uuids: uniqueSortedMatches(text, /@UUID\[[^\]]+\]/g),
    placeholders: uniqueSortedMatches(text, /\{\{[^}]+\}\}/g),
    numbers: uniqueSortedMatches(plain, /\d+(?:\.\d+)?(?:\/\d+)?\+?/g)
  };
}

function canonicalDocuments() {
  return fs.readdirSync(dataDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => ({ file, doc: readJson(path.join(dataDir, file)) }))
    .filter(({ doc }) => doc?.format === "oraclerpg-compendium" && doc?.contentSource === "srd-5.2" && Array.isArray(doc.items));
}

function localizationCatalogs() {
  return fs.readdirSync(localeDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => ({ file, doc: readJson(path.join(localeDir, file)) }))
    .filter(({ doc }) => doc?.format === "oraclerpg-localization" && doc?.entries && typeof doc.entries === "object");
}

function buildMonsterCatalog(catalogs, canonicalByFile) {
  const monsters = canonicalByFile.get("monsters.json")?.items ?? [];
  const featureDefinitions = canonicalByFile.get("monster-features.json")?.items ?? [];
  const featureCatalogFiles = [
    "monster-features-traits.json",
    "monster-features-actions-01.json",
    "monster-features-actions-02.json",
    "monster-features-actions-03.json",
    "monster-features-actions-04.json",
    "monster-features-bonus-actions.json",
    "monster-features-legendary-actions.json",
    "monster-features-reactions.json"
  ];
  const featureCatalogs = featureCatalogFiles.map((file) => catalogs.find((catalog) => catalog.file === file)?.doc).filter(Boolean);
  const variantCatalogs = [
    "monster-materialized-variants-01.json",
    "monster-materialized-variants-02.json",
    "monster-materialized-variants-03.json"
  ].map((file) => readJson(path.join(localeDir, file)));
  const variantTranslations = Object.assign({}, ...variantCatalogs.map((catalog) => catalog.translations ?? {}));
  const nameMap = readJson(path.join(localeDir, "monster-name-map.json"));
  return buildCompleteMonsterLocalizationCatalog({
    monsters,
    featureDefinitions,
    featureCatalogs,
    nameMap,
    variantTranslations
  });
}

const canonicalDocs = canonicalDocuments();
const canonicalByFile = new Map(canonicalDocs.map(({ file, doc }) => [file, doc]));
const registry = new Map();
for (const { file, doc } of canonicalDocs) {
  assert.equal(doc.count, doc.items.length, `${file}: count/items mismatch`);
  for (const entity of doc.items) {
    assert.equal(typeof entity?.canonicalId, "string", `${file}: entity without canonicalId`);
    assert.equal(registry.has(entity.canonicalId), false, `${entity.canonicalId}: duplicate canonical entity across compendium files`);
    registry.set(entity.canonicalId, { entity, sourceFile: file });
  }
}

const catalogs = localizationCatalogs();
const localizedEntries = new Map();
for (const { file, doc } of catalogs) {
  assert.equal(doc.locale, "pt-BR", `${file}: wrong locale`);
  assert.equal(doc.sourceLocale, "en", `${file}: wrong source locale`);
  assert.equal(doc.contentSource, "srd-5.2", `${file}: wrong content source`);
  for (const [canonicalId, overlay] of Object.entries(doc.entries)) {
    assert.equal(localizedEntries.has(canonicalId), false, `${canonicalId}: duplicate localization entry in ${file}`);
    localizedEntries.set(canonicalId, { overlay, catalogFile: file, entityType: doc.entityType });
  }
}

const monsterCatalog = buildMonsterCatalog(catalogs, canonicalByFile);
for (const [canonicalId, overlay] of Object.entries(monsterCatalog.entries)) {
  assert.equal(localizedEntries.has(canonicalId), false, `${canonicalId}: duplicate stored/generated localization entry`);
  localizedEntries.set(canonicalId, { overlay, catalogFile: "<generated-monsters>", entityType: "monster" });
}

function coverageRows() {
  return canonicalDocs.map(({ file, doc }) => {
    const localized = doc.items.filter((entity) => localizedEntries.has(entity.canonicalId)).length;
    return { file, total: doc.items.length, localized, missing: doc.items.length - localized };
  });
}

test("all PT-BR SRD localization overlays are presentation-only and cannot mutate canonical mechanics", () => {
  const stalePaths = [];
  const textDrifts = [];
  let checkedPaths = 0;

  for (const [canonicalId, { overlay, catalogFile, entityType }] of localizedEntries) {
    const canonicalRecord = registry.get(canonicalId);
    assert.ok(canonicalRecord, `${catalogFile}: orphan localization entry ${canonicalId}`);
    const { entity } = canonicalRecord;
    if (entityType) assert.equal(entityType, entity.entityType, `${canonicalId}: localization/canonical entityType mismatch`);

    const restorablePaths = [];
    for (const [pathKey, translated] of Object.entries(overlay)) {
      assert.equal(isPresentationPath(pathKey), true, `${canonicalId}: forbidden localization path ${pathKey}`);
      for (const segment of FORBIDDEN_TEMPLATE_SEGMENTS) {
        assert.equal(pathKey.includes(segment), false, `${canonicalId}: template internals must remain canonical: ${pathKey}`);
      }
      assert.equal(pathKey.endsWith(".invocation.entity.name"), false, `${canonicalId}: invocation identity must remain canonical`);
      assert.equal(typeof translated, "string", `${canonicalId}: non-string localization at ${pathKey}`);

      const source = getPath(entity, pathKey);
      if (typeof source !== "string") {
        stalePaths.push({ canonicalId, catalogFile, pathKey });
        continue;
      }

      checkedPaths += 1;
      restorablePaths.push(pathKey);
      const sourceFingerprint = mechanicalTextFingerprint(source);
      const translatedFingerprint = mechanicalTextFingerprint(translated);
      if (JSON.stringify(sourceFingerprint) !== JSON.stringify(translatedFingerprint)) {
        textDrifts.push({ canonicalId, catalogFile, pathKey, sourceFingerprint, translatedFingerprint });
      }
    }

    const before = structuredClone(entity);
    const localized = localizeEntity(entity, { entries: { [canonicalId]: overlay } });
    assert.deepEqual(entity, before, `${canonicalId}: canonical entity mutated in place`);

    const restored = structuredClone(localized);
    for (const pathKey of restorablePaths) setPath(restored, pathKey, getPath(entity, pathKey));
    assert.deepEqual(restored, entity, `${canonicalId}: non-presentation mechanic/reference changed after localization`);
  }

  const coverage = coverageRows();
  const missing = coverage.reduce((sum, row) => sum + row.missing, 0);
  console.log(`SRD_CANONICAL_DOCUMENTS=${canonicalDocs.length}`);
  console.log(`SRD_CANONICAL_ENTITIES=${registry.size}`);
  console.log(`SRD_LOCALIZED_ENTITIES=${localizedEntries.size}`);
  console.log(`SRD_UNLOCALIZED_ENTITIES=${missing}`);
  console.log(`SRD_LOCALIZATION_PATHS_VERIFIED=${checkedPaths}`);
  console.log(`SRD_STALE_OVERLAY_PATHS=${stalePaths.length}`);
  console.log(`SRD_TEXT_TOKEN_DRIFTS=${textDrifts.length}`);
  for (const row of coverage) console.log(`SRD_COVERAGE_${row.file}=${row.localized}/${row.total}`);
  for (const stale of stalePaths) console.log(`SRD_STALE_PATH=${stale.catalogFile} ${stale.canonicalId} ${stale.pathKey}`);
  for (const drift of textDrifts) console.log(`SRD_TEXT_DRIFT=${JSON.stringify(drift)}`);
  assert.equal(textDrifts.length, 0, `${textDrifts.length} localized presentation strings changed machine-significant references or values`);
});

test("every localized canonicalId resolves to exactly one SRD 5.2 canonical entity", () => {
  for (const [canonicalId, { catalogFile }] of localizedEntries) {
    assert.ok(registry.has(canonicalId), `${catalogFile}: missing canonical entity ${canonicalId}`);
  }
});
