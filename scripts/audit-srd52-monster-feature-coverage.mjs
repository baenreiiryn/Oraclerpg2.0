import fs from "node:fs/promises";
import {
  validateCanonicalContent,
  validateMonsterFeatureDefinition
} from "../packages/schema/dist/index.js";

const compendium = JSON.parse(await fs.readFile("packages/content/data/srd-5.2/monster-features.json", "utf8"));
const resolver = JSON.parse(await fs.readFile("packages/content/data/srd-5.2/monster-feature-aliases.json", "utf8"));

const issues = [];
const definitions = new Map();
for (const [index, record] of (compendium.items ?? []).entries()) {
  if (!record?.canonicalId) {
    issues.push({ path: `items[${index}].canonicalId`, message: "Missing canonicalId" });
    continue;
  }
  if (definitions.has(record.canonicalId)) issues.push({ path: `items[${index}].canonicalId`, message: `Duplicate canonicalId ${record.canonicalId}` });
  definitions.set(record.canonicalId, record);

  const canonical = validateCanonicalContent("feature", record.data);
  if (!canonical.ok) issues.push(...canonical.issues.map(issue => ({ path: `${record.name}:${issue.path}`, message: issue.message })));

  if (record.data?.featureKind === "monsterFeature" && record.data?.monsterTemplate) {
    const templateIssues = validateMonsterFeatureDefinition(record.data);
    issues.push(...templateIssues.map(issue => ({ path: `${record.name}:${issue.path}`, message: issue.message })));
  } else {
    issues.push({ path: record.name, message: "Creature feature definition must be a monsterFeature template" });
  }
}

const aliasEntries = Object.entries(resolver.aliases ?? {});
for (const [key, alias] of aliasEntries) {
  if (!definitions.has(alias.definitionCanonicalId)) issues.push({ path: `aliases.${key}`, message: `Unknown definition ${alias.definitionCanonicalId}` });
}

const required = ["Draconic Breath Weapon", "Legendary Resistance", "Bite", "Claw", "Multiattack", "Pack Tactics"];
for (const name of required) {
  if (![...definitions.values()].some(record => record.name === name)) issues.push({ path: "definitions", message: `Missing required reusable definition ${name}` });
}

const elementalBreaths = aliasEntries.filter(([key]) => /^(Acid|Cold|Fire|Lightning|Poison) Breath/i.test(key));
const breathTargets = new Set(elementalBreaths.map(([, alias]) => alias.definitionCanonicalId));
if (!elementalBreaths.length) issues.push({ path: "aliases", message: "No elemental breath aliases discovered" });
if (breathTargets.size !== 1 || ![...breathTargets][0]?.includes("draconic-breath-weapon")) {
  issues.push({ path: "aliases", message: "Elemental breath variants must resolve to the single Draconic Breath Weapon definition" });
}

const legendaryResistance = aliasEntries.filter(([key]) => /^Legendary Resistance/i.test(key));
const resistanceTargets = new Set(legendaryResistance.map(([, alias]) => alias.definitionCanonicalId));
if (!legendaryResistance.length) issues.push({ path: "aliases", message: "No Legendary Resistance aliases discovered" });
if (resistanceTargets.size !== 1 || ![...resistanceTargets][0]?.includes("legendary-resistance")) {
  issues.push({ path: "aliases", message: "Legendary Resistance usage variants must resolve to a single definition" });
}

if ((resolver.occurrenceCount ?? 0) !== 1236) issues.push({ path: "occurrenceCount", message: `Expected 1236 SRD feature occurrences, got ${resolver.occurrenceCount}` });
if ((compendium.count ?? 0) < 300) issues.push({ path: "count", message: `Expected a populated creature feature compendium, got only ${compendium.count} definitions` });
if ((resolver.definitionCount ?? 0) !== (compendium.count ?? -1)) issues.push({ path: "definitionCount", message: "Resolver definition count does not match compendium count" });

const report = {
  generatedAt: new Date().toISOString(),
  ok: issues.length === 0,
  definitionCount: compendium.count,
  occurrenceCount: resolver.occurrenceCount,
  aliasKeyCount: aliasEntries.length,
  elementalBreathAliases: elementalBreaths.length,
  legendaryResistanceAliases: legendaryResistance.length,
  issues
};
await fs.writeFile("packages/content/data/srd-5.2/monster-features-coverage-audit.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (issues.length) process.exit(1);
