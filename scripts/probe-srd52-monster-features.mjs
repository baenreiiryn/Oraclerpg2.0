import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const SOURCE_URL = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/bestiary/bestiary-xmm.json";
const OUT_DIR = path.resolve("packages/content/data/srd-5.2/monster-feature-probe");

const response = await fetch(SOURCE_URL);
if (!response.ok) throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status}`);
const source = await response.json();
const monsters = (source.monster ?? []).filter((monster) => monster.srd52 === true);

const SECTIONS = [
  ["trait", "trait"],
  ["action", "action"],
  ["bonus", "bonusAction"],
  ["reaction", "reaction"],
  ["legendary", "legendaryAction"]
];

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, stable(child)]));
}

function hash(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex").slice(0, 16);
}

function textOf(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textOf).join(" ");
  if (typeof value === "object") return Object.values(value).map(textOf).join(" ");
  return String(value);
}

function normalizeName(name = "") {
  return name
    .replace(/\s*\([^)]*Recharge[^)]*\)\s*/gi, " ")
    .replace(/\s*\(Costs?\s+\d+\s+Actions?\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classify(feature, section) {
  const name = normalizeName(feature.name ?? "").toLowerCase();
  const text = textOf(feature.entries ?? feature).toLowerCase();
  if (name.includes("multiattack")) return "multiattack";
  if (/breath/.test(name) && /(cone|line|saving throw|damage)/.test(text)) return "breathWeapon";
  if (/^(bite|claw|gore|slam|tail|tentacle|pseudopod|beak|hooves|ram|sting|talon|mandibles|constrict|mace|fist|tusk|horns?)\b/.test(name)) return "naturalAttack";
  if (/pack tactics/.test(name)) return "packTactics";
  if (/legendary resistance/.test(name)) return "legendaryResistance";
  if (/magic resistance/.test(name)) return "magicResistance";
  if (/regeneration/.test(name)) return "regeneration";
  if (/keen /.test(name)) return "keenSense";
  if (/amphibious/.test(name)) return "amphibious";
  if (/spider climb/.test(name)) return "spiderClimb";
  if (/flyby/.test(name)) return "flyby";
  if (/charge|pounce/.test(name)) return "movementAttackRider";
  if (/aura/.test(name)) return "aura";
  if (/spellcasting/.test(name)) return "spellcasting";
  return section;
}

function mechanics(feature) {
  const raw = textOf(feature.entries ?? feature);
  return {
    attackTags: [...raw.matchAll(/\{@atk\s+([^}]+)\}/g)].map((m) => m[1]),
    damageFormulas: [...raw.matchAll(/\{@damage\s+([^}|]+)(?:\|[^}]*)?\}/g)].map((m) => m[1]),
    dcValues: [...raw.matchAll(/\{@dc\s+(\d+)/g)].map((m) => Number(m[1])),
    conditions: [...new Set([...raw.matchAll(/\{@condition\s+([^}|]+)(?:\|[^}]*)?\}/g)].map((m) => m[1]))],
    damageTypes: [...new Set([...raw.matchAll(/\b(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)\b/gi)].map((m) => m[1].toLowerCase()))],
    areaShapes: [...new Set([...raw.matchAll(/\b(cone|line|emanation|sphere|cube|cylinder)\b/gi)].map((m) => m[1].toLowerCase()))],
    distances: [...new Set([...raw.matchAll(/(\d+)[ -]?foot/gi)].map((m) => Number(m[1])))],
    hasRecharge: /recharge/i.test(feature.name ?? "") || /\{@recharge/.test(raw),
    hasSave: /saving throw/i.test(raw) || /\{@dc\s+\d+/.test(raw),
    hasAttack: /\{@atk\s+/.test(raw) || /attack roll/i.test(raw)
  };
}

const occurrences = [];
for (const monster of monsters) {
  for (const [field, section] of SECTIONS) {
    for (const feature of monster[field] ?? []) {
      const normalizedName = normalizeName(feature.name ?? "Unnamed Feature");
      occurrences.push({
        monster: monster.name,
        source: monster.source,
        section,
        name: feature.name ?? "Unnamed Feature",
        normalizedName,
        family: classify(feature, section),
        exactFingerprint: hash(feature),
        mechanics: mechanics(feature),
        feature
      });
    }
  }
}

const byName = new Map();
for (const occurrence of occurrences) {
  const key = occurrence.normalizedName.toLowerCase();
  if (!byName.has(key)) byName.set(key, []);
  byName.get(key).push(occurrence);
}

const repeated = [...byName.entries()]
  .filter(([, values]) => values.length > 1)
  .map(([key, values]) => ({
    key,
    name: values[0].normalizedName,
    count: values.length,
    exactVariantCount: new Set(values.map((value) => value.exactFingerprint)).size,
    families: [...new Set(values.map((value) => value.family))],
    sections: [...new Set(values.map((value) => value.section))],
    monsters: [...new Set(values.map((value) => value.monster))],
    variants: [...new Map(values.map((value) => [value.exactFingerprint, {
      fingerprint: value.exactFingerprint,
      count: values.filter((candidate) => candidate.exactFingerprint === value.exactFingerprint).length,
      sampleMonster: value.monster,
      mechanics: value.mechanics,
      feature: value.feature
    }])).values()]
  }))
  .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

const familyCounts = Object.fromEntries([...occurrences.reduce((map, item) => map.set(item.family, (map.get(item.family) ?? 0) + 1), new Map()).entries()].sort((a, b) => b[1] - a[1]));
const sectionCounts = Object.fromEntries(SECTIONS.map(([, section]) => [section, occurrences.filter((item) => item.section === section).length]));

const report = {
  source: SOURCE_URL,
  generatedAt: new Date().toISOString(),
  srd52MonsterCount: monsters.length,
  featureOccurrenceCount: occurrences.length,
  uniqueNormalizedNameCount: byName.size,
  repeatedNameCount: repeated.length,
  sectionCounts,
  familyCounts,
  topRepeated: repeated.slice(0, 100).map(({ variants, ...entry }) => ({ ...entry, variantSummaries: variants.map(({ feature, ...variant }) => variant) })),
  templateCandidates: repeated
    .filter((entry) => entry.count >= 3)
    .map(({ variants, ...entry }) => ({
      ...entry,
      recommendation: entry.exactVariantCount === 1 ? "sharedExactTemplate" : "parameterizedTemplate",
      variantSummaries: variants.map(({ feature, ...variant }) => variant)
    }))
};

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.writeFile(path.join(OUT_DIR, "summary.json"), `${JSON.stringify(report, null, 2)}\n`);
await fs.writeFile(path.join(OUT_DIR, "repeated-features.json"), `${JSON.stringify(repeated, null, 2)}\n`);
await fs.writeFile(path.join(OUT_DIR, "occurrences.json"), `${JSON.stringify(occurrences, null, 2)}\n`);

console.log(JSON.stringify({
  srd52MonsterCount: report.srd52MonsterCount,
  featureOccurrenceCount: report.featureOccurrenceCount,
  uniqueNormalizedNameCount: report.uniqueNormalizedNameCount,
  repeatedNameCount: report.repeatedNameCount,
  sectionCounts: report.sectionCounts,
  familyCounts: report.familyCounts,
  topRepeated: report.topRepeated.slice(0, 20).map(({ name, count, exactVariantCount, families }) => ({ name, count, exactVariantCount, families }))
}, null, 2));
