import { isPresentationPath } from "./localization.js";

const MATERIALIZED_FEATURE_NAME_TRANSLATIONS = new Map([
  ["Acid Breath", "Sopro Ácido"],
  ["Cold Breath", "Sopro de Frio"],
  ["Fire Breath", "Sopro de Fogo"],
  ["Lightning Breath", "Sopro Elétrico"],
  ["Poison Breath", "Sopro Venenoso"]
]);

function getPath(root, pathKey) {
  return pathKey.split(".").reduce((cursor, part) => cursor?.[/^\d+$/.test(part) ? Number(part) : part], root);
}

function collectPresentationStrings(root, prefix = "", out = {}) {
  if (typeof root === "string") {
    if (
      root.trim() &&
      isPresentationPath(prefix) &&
      !prefix.includes(".monsterTemplate.") &&
      !prefix.endsWith(".invocation.entity.name")
    ) out[prefix] = root;
    return out;
  }
  if (root == null || typeof root !== "object") return out;
  if (Array.isArray(root)) {
    root.forEach((value, index) => collectPresentationStrings(value, prefix ? `${prefix}.${index}` : String(index), out));
    return out;
  }
  for (const [key, value] of Object.entries(root)) {
    collectPresentationStrings(value, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

export function buildFeatureSourceTranslationMap(featureDefinitions, featureCatalogs) {
  const definitions = new Map((featureDefinitions ?? []).map((feature) => [feature.canonicalId, feature]));
  const candidates = new Map();
  const conflicts = new Set();

  for (const catalog of featureCatalogs ?? []) {
    for (const [canonicalId, overlay] of Object.entries(catalog?.entries ?? {})) {
      const definition = definitions.get(canonicalId);
      if (!definition) continue;
      for (const [pathKey, translated] of Object.entries(overlay)) {
        if (typeof translated !== "string") continue;
        const source = getPath(definition, pathKey);
        if (typeof source !== "string" || !source.trim()) continue;
        const previous = candidates.get(source);
        if (previous !== undefined && previous !== translated) {
          conflicts.add(source);
          continue;
        }
        candidates.set(source, translated);
      }
    }
  }

  for (const source of conflicts) candidates.delete(source);
  return candidates;
}

export function buildMonsterLocalizationCatalog({
  monsters,
  featureDefinitions,
  featureCatalogs,
  nameMap,
  explicitEntries = {}
}) {
  const sourceTranslations = buildFeatureSourceTranslationMap(featureDefinitions, featureCatalogs);
  const names = nameMap?.names ?? {};
  const entries = {};

  for (const monster of monsters ?? []) {
    const overlay = {};
    const explicit = explicitEntries[monster.canonicalId] ?? {};
    for (const [pathKey, source] of Object.entries(collectPresentationStrings(monster))) {
      let translated;
      if (typeof explicit[pathKey] === "string") translated = explicit[pathKey];
      else if (pathKey === "name") translated = names[source];
      else if (sourceTranslations.has(source)) translated = sourceTranslations.get(source);
      else if (MATERIALIZED_FEATURE_NAME_TRANSLATIONS.has(source)) translated = MATERIALIZED_FEATURE_NAME_TRANSLATIONS.get(source);

      if (typeof translated === "string" && translated.length) overlay[pathKey] = translated;
    }
    entries[monster.canonicalId] = overlay;
  }

  return {
    format: "oraclerpg-localization",
    version: 1,
    locale: "pt-BR",
    sourceLocale: "en",
    contentSource: "srd-5.2",
    entityType: "monster",
    scope: "monsters",
    entries
  };
}

export function collectMonsterPresentationStrings(monster) {
  return collectPresentationStrings(monster);
}
