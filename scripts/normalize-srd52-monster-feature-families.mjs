import fs from "node:fs/promises";

const compendiumPath = "packages/content/data/srd-5.2/monster-features.json";
const aliasesPath = "packages/content/data/srd-5.2/monster-feature-aliases.json";
const reportPath = "packages/content/data/srd-5.2/monster-feature-family-normalization.json";

const slug = value => String(value)
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");
const featureCanonicalId = name => `dnd2024:2024:feature:${slug(name)}:srd-5.2`;
const cleanRechargeName = name => String(name)
  .replace(/\s*\{@recharge(?:\s+\d+)?\}\s*/gi, " ")
  .replace(/\s+/g, " ")
  .trim();
const rechargeMin = name => {
  const explicit = String(name).match(/\{@recharge\s+(\d+)\}/i);
  if (explicit) return Number(explicit[1]);
  return /\{@recharge\}/i.test(String(name)) ? 6 : undefined;
};

const compendium = JSON.parse(await fs.readFile(compendiumPath, "utf8"));
const resolver = JSON.parse(await fs.readFile(aliasesPath, "utf8"));
const draconic = (compendium.items ?? []).find(item => item.name === "Draconic Breath Weapon");
if (!draconic) throw new Error("Draconic Breath Weapon definition is required before family normalization");

const ELEMENTAL_BREATH_NAME = /^(Acid|Cold|Fire|Lightning|Poison) Breath(?:\s+\{@recharge(?:\s+\d+)?\})?$/i;
const removedDefinitions = [];
const renamedDefinitions = [];
const mergedDefinitions = [];
const idRemap = new Map();

// First collapse elemental damaging dragon breaths onto the curated reusable template.
let items = [];
for (const item of compendium.items ?? []) {
  if (item.canonicalId !== draconic.canonicalId && ELEMENTAL_BREATH_NAME.test(item.name)) {
    idRemap.set(item.canonicalId, draconic.canonicalId);
    removedDefinitions.push({ name: item.name, canonicalId: item.canonicalId, targetCanonicalId: draconic.canonicalId });
    continue;
  }
  items.push(item);
}

// Then remove 5etools recharge markup from every display name and canonical id.
const byCanonicalId = new Map();
const normalizedItems = [];
for (const item of items) {
  const oldId = item.canonicalId;
  const cleanedName = cleanRechargeName(item.name);
  const cleanId = item.canonicalId === draconic.canonicalId ? item.canonicalId : featureCanonicalId(cleanedName);
  const existing = byCanonicalId.get(cleanId);
  if (existing && existing !== item) {
    idRemap.set(oldId, existing.canonicalId);
    mergedDefinitions.push({ name: item.name, canonicalId: oldId, targetCanonicalId: existing.canonicalId });
    continue;
  }
  if (cleanedName !== item.name || cleanId !== oldId) {
    renamedDefinitions.push({ fromName: item.name, toName: cleanedName, fromCanonicalId: oldId, toCanonicalId: cleanId });
    item.name = cleanedName;
    item.id = cleanId;
    item.canonicalId = cleanId;
    idRemap.set(oldId, cleanId);
    if (item.data?.activities?.[0]?.name && cleanRechargeName(item.data.activities[0].name) === cleanedName) item.data.activities[0].name = cleanedName;
  }
  byCanonicalId.set(item.canonicalId, item);
  normalizedItems.push(item);
}
compendium.items = normalizedItems;

function ensureParameter(record, parameter, bindingPaths = []) {
  const template = record.data?.monsterTemplate;
  if (!template) return;
  template.parameters ??= [];
  template.bindings ??= [];
  if (!template.parameters.some(entry => entry.id === parameter.id)) template.parameters.push(parameter);
  for (const path of bindingPaths) {
    if (!template.bindings.some(entry => entry.parameterId === parameter.id && entry.path === path)) {
      template.bindings.push({ parameterId: parameter.id, path });
    }
  }
}

function ensureRulesParameter(record) {
  const defaultText = record.data?.text?.rules?.[0];
  if (typeof defaultText !== "string") return;
  const paths = ["text.rules.0"];
  if (record.data?.activities?.[0]) paths.push("activities.0.description");
  ensureParameter(record, { id: "rulesText", name: "Rules Text", kind: "string", required: true, defaultValue: defaultText }, paths);
}

// Resolve transitive remaps after merges/renames.
function finalId(id) {
  let current = id;
  const seen = new Set();
  while (idRemap.has(current) && !seen.has(current)) {
    seen.add(current);
    current = idRemap.get(current);
  }
  return current;
}

const targetAliases = new Map();
let remappedAliases = 0;
let rechargeAliases = 0;
for (const [key, alias] of Object.entries(resolver.aliases ?? {})) {
  const rawName = key.split("|")[0].trim();
  const originalTarget = alias.definitionCanonicalId;
  let target = finalId(originalTarget);
  if (ELEMENTAL_BREATH_NAME.test(rawName)) target = draconic.canonicalId;
  const record = (compendium.items ?? []).find(item => item.canonicalId === target);
  if (!record) throw new Error(`Alias ${key} resolves to missing definition ${target}`);
  if (target !== originalTarget || alias.definitionName !== record.name) remappedAliases += 1;
  alias.definitionCanonicalId = target;
  alias.definitionName = record.name;

  const min = rechargeMin(rawName);
  if (min != null) {
    alias.parameterHints = { ...(alias.parameterHints ?? {}), rechargeMin: min, rechargeMax: 6 };
    rechargeAliases += 1;
  }
  if (!targetAliases.has(target)) targetAliases.set(target, []);
  targetAliases.get(target).push({ key, alias, rawName });
}

// Any definition reached by a recharge-tagged alias receives structured recharge mechanics.
let structuredRechargeDefinitions = 0;
for (const record of compendium.items ?? []) {
  const aliases = targetAliases.get(record.canonicalId) ?? [];
  const mins = aliases.map(entry => rechargeMin(entry.rawName)).filter(value => value != null);
  if (!mins.length || !record.data?.activities?.[0]) continue;
  const defaultMin = Math.min(...mins);
  record.data.activities[0].recharge = {
    timing: "turnStart",
    roll: { formula: "1d6" },
    success: { min: defaultMin, max: 6 },
    restores: "all"
  };
  ensureParameter(record, { id: "rechargeMin", name: "Recharge Minimum", kind: "number", required: true, defaultValue: defaultMin }, ["activities.0.recharge.success.min"]);
  ensureParameter(record, { id: "rechargeMax", name: "Recharge Maximum", kind: "number", required: true, defaultValue: 6 }, ["activities.0.recharge.success.max"]);
  structuredRechargeDefinitions += 1;
}

// If normalization merged two same-named definitions, keep exact source rules configurable per creature copy.
for (const merge of mergedDefinitions) {
  const target = (compendium.items ?? []).find(item => item.canonicalId === finalId(merge.targetCanonicalId));
  if (target) ensureRulesParameter(target);
}

compendium.items.sort((a, b) => a.name.localeCompare(b.name));
compendium.count = compendium.items.length;
resolver.definitionCount = compendium.count;

await fs.writeFile(compendiumPath, JSON.stringify(compendium, null, 2) + "\n");
await fs.writeFile(aliasesPath, JSON.stringify(resolver, null, 2) + "\n");
await fs.writeFile(reportPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  draconicBreathCanonicalId: draconic.canonicalId,
  removedDefinitions,
  renamedDefinitions,
  mergedDefinitions,
  remappedAliases,
  rechargeAliases,
  structuredRechargeDefinitions,
  resultingDefinitionCount: compendium.count
}, null, 2) + "\n");

console.log(JSON.stringify({
  removedDefinitions: removedDefinitions.length,
  renamedDefinitions: renamedDefinitions.length,
  mergedDefinitions: mergedDefinitions.length,
  remappedAliases,
  rechargeAliases,
  structuredRechargeDefinitions,
  resultingDefinitionCount: compendium.count
}, null, 2));
