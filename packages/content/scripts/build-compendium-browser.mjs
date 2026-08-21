import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { localizeEntity } from "../localization.js";
import { buildCompleteMonsterLocalizationCatalog } from "../monster-localization-complete.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(here, "..");
const repoRoot = path.resolve(contentRoot, "../..");
const dataDir = path.join(contentRoot, "data/srd-5.2");
const localeDir = path.join(contentRoot, "locales/pt-BR/srd-5.2");
const outputRoot = path.join(repoRoot, "public/compendium/srd");

const CATEGORY_BY_FILE = new Map([
  ["classes.json", "classes"],
  ["subclasses.json", "subclasses"],
  ["class-features.json", "class-features"],
  ["species.json", "species"],
  ["species-features.json", "species-features"],
  ["feats.json", "feats"],
  ["items.json", "items"],
  ["spells.json", "spells"],
  ["monster-features.json", "monster-features"],
  ["monsters.json", "monsters"]
]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function canonicalDocuments() {
  return fs.readdirSync(dataDir)
    .filter((file) => CATEGORY_BY_FILE.has(file))
    .map((file) => ({ file, category: CATEGORY_BY_FILE.get(file), doc: readJson(path.join(dataDir, file)) }))
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
  const featureCatalogs = featureCatalogFiles
    .map((file) => catalogs.find((catalog) => catalog.file === file)?.doc)
    .filter(Boolean);
  const variantTranslations = Object.assign({}, ...[
    "monster-materialized-variants-01.json",
    "monster-materialized-variants-02.json",
    "monster-materialized-variants-03.json"
  ].map((file) => readJson(path.join(localeDir, file)).translations ?? {}));
  const nameMap = readJson(path.join(localeDir, "monster-name-map.json"));

  return buildCompleteMonsterLocalizationCatalog({
    monsters,
    featureDefinitions,
    featureCatalogs,
    nameMap,
    variantTranslations
  });
}

function firstText(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (!value || typeof value !== "object") return "";
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = firstText(entry);
      if (found) return found;
    }
    return "";
  }
  for (const key of ["summary", "description", "rules", "entries", "text"]) {
    const found = firstText(value[key]);
    if (found) return found;
  }
  return "";
}

function recordFor(entity, sourceFile, category) {
  return {
    canonicalId: entity.canonicalId,
    entityType: entity.entityType,
    category,
    sourceFile,
    name: entity.name ?? entity.canonicalId,
    summary: firstText(entity?.data?.text) || firstText(entity?.data) || "",
    entity
  };
}

function writeLocale(locale, docs, overlayById) {
  const localeRoot = path.join(outputRoot, locale);
  fs.mkdirSync(localeRoot, { recursive: true });
  let total = 0;
  const categories = [];

  for (const { file, category, doc } of docs) {
    const records = doc.items.map((canonicalEntity) => {
      const overlay = overlayById?.get(canonicalEntity.canonicalId);
      const entity = overlay
        ? localizeEntity(canonicalEntity, { entries: { [canonicalEntity.canonicalId]: overlay } })
        : structuredClone(canonicalEntity);
      return recordFor(entity, file, category);
    });
    total += records.length;
    categories.push({ id: category, sourceFile: file, count: records.length });
    fs.writeFileSync(
      path.join(localeRoot, `${category}.json`),
      JSON.stringify({ version: 1, locale, contentSource: "srd-5.2", category, count: records.length, items: records })
    );
  }

  fs.writeFileSync(
    path.join(localeRoot, "manifest.json"),
    JSON.stringify({ version: 1, locale, contentSource: "srd-5.2", total, categories })
  );
  return total;
}

const docs = canonicalDocuments();
const canonicalByFile = new Map(docs.map(({ file, doc }) => [file, doc]));
const catalogs = localizationCatalogs();
const overlayById = new Map();

for (const { doc } of catalogs) {
  for (const [canonicalId, overlay] of Object.entries(doc.entries)) {
    if (overlayById.has(canonicalId)) {
      throw new Error(`Duplicate localization overlay for ${canonicalId}`);
    }
    overlayById.set(canonicalId, overlay);
  }
}

const monsterCatalog = buildMonsterCatalog(catalogs, canonicalByFile);
for (const [canonicalId, overlay] of Object.entries(monsterCatalog.entries)) {
  if (overlayById.has(canonicalId)) throw new Error(`Duplicate generated monster overlay for ${canonicalId}`);
  overlayById.set(canonicalId, overlay);
}

fs.rmSync(outputRoot, { recursive: true, force: true });
const englishTotal = writeLocale("en", docs, null);
const portugueseTotal = writeLocale("pt-BR", docs, overlayById);
if (englishTotal !== portugueseTotal) throw new Error("Locale compendium totals diverged");
console.log(`COMPENDIUM_BROWSER_SRD_ENTITIES=${englishTotal}`);
console.log(`COMPENDIUM_BROWSER_CATEGORIES=${docs.length}`);
