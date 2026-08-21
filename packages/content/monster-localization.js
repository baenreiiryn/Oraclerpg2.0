import { isPresentationPath } from "./localization.js";

const MATERIALIZED_FEATURE_NAMES = new Map([
  ["Acid Breath", "Sopro Ácido"],
  ["Cold Breath", "Sopro de Frio"],
  ["Fire Breath", "Sopro de Fogo"],
  ["Lightning Breath", "Sopro Elétrico"],
  ["Poison Breath", "Sopro Venenoso"]
]);

const DAMAGE_TYPES = new Set(["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"]);
const SIZES = new Set(["tiny", "small", "medium", "large", "huge", "gargantuan"]);
const SUBJECTS = [
  "invisible stalker", "purple worm", "shambling mound", "vampire spawn", "giant octopus",
  "giant seahorse", "giant crocodile", "giant constrictor snake", "giant frog", "giant toad",
  "giant owl", "giant rat", "giant elk", "giant boar", "giant goat", "warhorse skeleton",
  "minotaur skeleton", "adult dragon", "ancient dragon", "young dragon", "dragon wyrmling",
  "aboleth", "ape", "armor", "assassin", "balor", "bandit", "basilisk", "bear", "beetle",
  "behir", "boar", "bugbear", "centaur", "cloaker", "couatl", "devil", "dog", "dragon",
  "drider", "dryad", "efreeti", "elemental", "elk", "erinyes", "ettercap", "familiar",
  "frog", "gargoyle", "giant", "gladiator", "gnoll", "goat", "goblin", "golem", "guardian",
  "hezrou", "hippogriff", "hippopotamus", "horse", "hyena", "hydra", "jelly", "kobold",
  "kraken", "limb", "lizard", "magmin", "marilith", "medusa", "mephit", "mouther", "mummy",
  "naga", "nalfeshnee", "nightmare", "noble", "octopus", "ooze", "owl", "panther", "piranha",
  "pirate", "planetar", "plesiosaurus", "pseudodragon", "pteranodon", "rat", "raven", "remorhaz",
  "roc", "roper", "salamander", "satyr", "seahorse", "shark", "shadow", "skeleton", "snake",
  "solar", "specter", "sphinx", "spider", "stalker", "swarm", "tarrasque", "tiger", "toad",
  "treant", "troll", "unicorn", "vampire", "warrior", "wasp", "whale", "wight", "wisp",
  "worm", "wraith", "wyvern", "xorn"
].sort((a, b) => b.length - a.length);

function getPath(root, pathKey) {
  return pathKey.split(".").reduce((cursor, part) => cursor?.[/^\d+$/.test(part) ? Number(part) : part], root);
}

function collectPresentationStrings(root, prefix = "", out = {}) {
  if (typeof root === "string") {
    if (root.trim() && isPresentationPath(prefix) && !prefix.includes(".monsterTemplate.") && !prefix.endsWith(".invocation.entity.name")) out[prefix] = root;
    return out;
  }
  if (root == null || typeof root !== "object") return out;
  if (Array.isArray(root)) {
    root.forEach((value, index) => collectPresentationStrings(value, prefix ? `${prefix}.${index}` : String(index), out));
    return out;
  }
  for (const [key, value] of Object.entries(root)) collectPresentationStrings(value, prefix ? `${prefix}.${key}` : key, out);
  return out;
}

function mergedEntries(catalogs) {
  return Object.assign({}, ...(catalogs ?? []).map((catalog) => catalog?.entries ?? {}));
}

export function buildFeatureSourceTranslationMap(featureDefinitions, featureCatalogs) {
  const definitions = new Map((featureDefinitions ?? []).map((feature) => [feature.canonicalId, feature]));
  const result = new Map();
  const conflicts = new Set();
  for (const [canonicalId, overlay] of Object.entries(mergedEntries(featureCatalogs))) {
    const feature = definitions.get(canonicalId);
    if (!feature) continue;
    for (const [pathKey, translated] of Object.entries(overlay)) {
      const source = getPath(feature, pathKey);
      if (typeof source !== "string" || !source.trim() || typeof translated !== "string") continue;
      if (result.has(source) && result.get(source) !== translated) conflicts.add(source);
      else result.set(source, translated);
    }
  }
  for (const source of conflicts) result.delete(source);
  return result;
}

function canonicalDescription(feature) {
  return [feature?.data?.text?.description, feature?.data?.text?.rules?.[0], feature?.data?.activities?.[0]?.description]
    .find((value) => typeof value === "string" && value.trim()) ?? "";
}

function translatedDescription(feature, overlay, exactMap) {
  const source = canonicalDescription(feature);
  if (!source) return "";
  if (exactMap.has(source)) return exactMap.get(source);
  for (const [pathKey, translated] of Object.entries(overlay ?? {})) {
    if (typeof translated === "string" && getPath(feature, pathKey) === source) return translated;
  }
  return "";
}

function macroToken(macro) {
  const body = macro.slice(2, -1);
  const firstSpace = body.indexOf(" ");
  const kind = firstSpace < 0 ? body : body.slice(0, firstSpace);
  const payload = firstSpace < 0 ? "" : body.slice(firstSpace + 1);
  const primary = payload.split("|")[0];
  return {kind, primary};
}

function normalizedSkeleton(text) {
  let out = text.toLowerCase().replace(/\{@[^}]+\}/g, (macro) => {
    const {kind, primary} = macroToken(macro);
    return ["dc", "damage", "dice", "hit"].includes(kind) ? `<${kind}>` : `<${kind}:${primary.toLowerCase()}>`;
  });
  for (const subject of SUBJECTS) out = out.replace(new RegExp(`\\b${subject.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:'s)?\\b`, "g"), "<subject>");
  for (const type of DAMAGE_TYPES) out = out.replace(new RegExp(`\\b${type}\\b`, "g"), "<damage-type>");
  for (const size of SIZES) out = out.replace(new RegExp(`\\b${size}\\b`, "g"), "<size>");
  return out.replace(/\b\d+(?:\.\d+)?(?:\/\d+)?\+?\b/g, "<n>").replace(/\s+/g, " ").trim();
}

function plainNumbers(text) {
  return text.replace(/\{@[^}]+\}/g, "").match(/\b\d+(?:\.\d+)?(?:\/\d+)?\+?\b/g) ?? [];
}

function projectVariant(baseEn, basePt, variantEn) {
  if (!baseEn || !basePt || normalizedSkeleton(baseEn) !== normalizedSkeleton(variantEn)) return null;
  const ptMacros = basePt.match(/\{@[^}]+\}/g) ?? [];
  const variantMacros = variantEn.match(/\{@[^}]+\}/g) ?? [];
  if (ptMacros.length !== variantMacros.length) return null;
  let macroIndex = 0;
  let projected = basePt.replace(/\{@[^}]+\}/g, () => {
    const ptMacro = ptMacros[macroIndex];
    const variantMacro = variantMacros[macroIndex++];
    const pt = macroToken(ptMacro);
    const variant = macroToken(variantMacro);
    if (pt.kind !== variant.kind || pt.primary !== variant.primary) return variantMacro;
    const ptBody = ptMacro.slice(2, -1);
    const ptParts = ptBody.split("|");
    const display = ptParts.length > 1 ? ptParts.at(-1) : null;
    if (!display || display === pt.primary) return variantMacro;
    const variantParts = variantMacro.slice(2, -1).split("|");
    if (variantParts.length > 1) variantParts[variantParts.length - 1] = display;
    else variantParts.push(display);
    return `{@${variantParts.join("|")}}`;
  });
  const from = plainNumbers(baseEn);
  const to = plainNumbers(variantEn);
  if (from.length !== to.length) return null;
  if (from.some((value, index) => value !== to[index])) {
    const macros = [];
    let protectedText = projected.replace(/\{@[^}]+\}/g, (macro) => `§M${macros.push(macro) - 1}§`);
    let numberIndex = 0;
    protectedText = protectedText.replace(/\b\d+(?:\.\d+)?(?:\/\d+)?\+?\b/g, () => to[numberIndex++]);
    projected = protectedText.replace(/§M(\d+)§/g, (_, index) => macros[Number(index)]);
  }
  return projected;
}

export function buildMonsterLocalizationCatalog({ monsters, featureDefinitions, featureCatalogs, nameMap, variantTranslations = {}, explicitEntries = {} }) {
  const exactMap = buildFeatureSourceTranslationMap(featureDefinitions, featureCatalogs);
  const definitions = new Map((featureDefinitions ?? []).map((feature) => [feature.canonicalId, feature]));
  const featureEntries = mergedEntries(featureCatalogs);
  const names = nameMap?.names ?? {};
  const entries = {};

  for (const monster of monsters ?? []) {
    const overlay = {};
    const explicit = explicitEntries[monster.canonicalId] ?? {};
    for (const [pathKey, source] of Object.entries(collectPresentationStrings(monster))) {
      let translated = explicit[pathKey];
      if (typeof translated !== "string" && pathKey === "name") translated = names[source];
      if (typeof translated !== "string") translated = variantTranslations[source];
      if (typeof translated !== "string" && exactMap.has(source)) translated = exactMap.get(source);
      if (typeof translated !== "string" && MATERIALIZED_FEATURE_NAMES.has(source)) translated = MATERIALIZED_FEATURE_NAMES.get(source);
      if (typeof translated !== "string") {
        const match = pathKey.match(/^data\.features\.(\d+)\.text\.description$/);
        if (match) {
          const instance = monster.data?.features?.[Number(match[1])];
          const definition = definitions.get(instance?.definition?.canonicalId);
          if (definition) translated = projectVariant(canonicalDescription(definition), translatedDescription(definition, featureEntries[definition.canonicalId], exactMap), source);
        }
      }
      if (typeof translated === "string" && translated.length) overlay[pathKey] = translated;
    }
    entries[monster.canonicalId] = overlay;
  }
  return { format: "oraclerpg-localization", version: 1, locale: "pt-BR", sourceLocale: "en", contentSource: "srd-5.2", entityType: "monster", scope: "monsters", entries };
}

export function collectMonsterPresentationStrings(monster) {
  return collectPresentationStrings(monster);
}
