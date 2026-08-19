import fs from "node:fs/promises";

const compendiumPath = "packages/content/data/srd-5.2/monster-features.json";
const aliasesPath = "packages/content/data/srd-5.2/monster-feature-aliases.json";
const reportPath = "packages/content/data/srd-5.2/monster-feature-family-normalization.json";

const compendium = JSON.parse(await fs.readFile(compendiumPath, "utf8"));
const resolver = JSON.parse(await fs.readFile(aliasesPath, "utf8"));
const draconic = (compendium.items ?? []).find(item => item.name === "Draconic Breath Weapon");
if (!draconic) throw new Error("Draconic Breath Weapon definition is required before family normalization");

const ELEMENTAL_BREATH_NAME = /^(Acid|Cold|Fire|Lightning|Poison) Breath(?:\s+\{@recharge(?:\s+\d+)?\})?$/i;
const removedDefinitions = [];
compendium.items = (compendium.items ?? []).filter(item => {
  if (item.canonicalId === draconic.canonicalId) return true;
  if (!ELEMENTAL_BREATH_NAME.test(item.name)) return true;
  removedDefinitions.push({ name: item.name, canonicalId: item.canonicalId });
  return false;
});
compendium.count = compendium.items.length;

let remappedAliases = 0;
for (const [key, alias] of Object.entries(resolver.aliases ?? {})) {
  const rawName = key.split("|")[0].trim();
  if (!ELEMENTAL_BREATH_NAME.test(rawName)) continue;
  alias.definitionCanonicalId = draconic.canonicalId;
  alias.definitionName = draconic.name;
  const bareRecharge = /\{@recharge\}/i.test(rawName);
  const explicit = rawName.match(/\{@recharge\s+(\d+)\}/i);
  if (bareRecharge) {
    alias.parameterHints = { ...(alias.parameterHints ?? {}), rechargeMin: 6, rechargeMax: 6 };
  } else if (explicit) {
    alias.parameterHints = { ...(alias.parameterHints ?? {}), rechargeMin: Number(explicit[1]), rechargeMax: 6 };
  }
  remappedAliases += 1;
}
resolver.definitionCount = compendium.count;

await fs.writeFile(compendiumPath, JSON.stringify(compendium, null, 2) + "\n");
await fs.writeFile(aliasesPath, JSON.stringify(resolver, null, 2) + "\n");
await fs.writeFile(reportPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  draconicBreathCanonicalId: draconic.canonicalId,
  removedDefinitions,
  remappedAliases,
  resultingDefinitionCount: compendium.count
}, null, 2) + "\n");

console.log(JSON.stringify({ removedDefinitions: removedDefinitions.length, remappedAliases, resultingDefinitionCount: compendium.count }, null, 2));
