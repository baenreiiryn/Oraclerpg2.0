import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

const FOUNDRY_ROOT = process.argv[2] ?? "../foundry-dnd5e/packs/_source/monsterfeatures24";
const PROBE_DIR = "packages/content/data/srd-5.2/monster-feature-probe";
const OUT = path.join(PROBE_DIR, "foundry-comparison.json");

function normalizeName(name = "") {
  return String(name)
    .replace(/\s*\([^)]*Recharge[^)]*\)\s*/gi, " ")
    .replace(/\s*\(Costs?\s+\d+\s+Actions?\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function walk(dir) {
  const result = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.name.startsWith("_")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...await walk(full));
    else if (/\.ya?ml$/i.test(entry.name)) result.push(full);
  }
  return result;
}

const repeated = JSON.parse(await fs.readFile(path.join(PROBE_DIR, "repeated-features.json"), "utf8"));
const foundryFiles = await walk(FOUNDRY_ROOT);
const foundry = [];
for (const file of foundryFiles) {
  const parsed = YAML.parse(await fs.readFile(file, "utf8"));
  if (!parsed?.name) continue;
  const relative = path.relative(FOUNDRY_ROOT, file).replaceAll("\\", "/");
  foundry.push({
    name: parsed.name,
    normalizedName: normalizeName(parsed.name),
    category: relative.split("/")[0],
    file: relative,
    type: parsed.type,
    identifier: parsed.system?.identifier,
    systemType: parsed.system?.type?.value,
    activityTypes: [...new Set(Object.values(parsed.system?.activities ?? {}).map((activity) => activity?.type).filter(Boolean))],
    properties: parsed.system?.properties ?? [],
    description: parsed.system?.description?.value ?? ""
  });
}

const foundryByName = new Map();
for (const feature of foundry) {
  if (!foundryByName.has(feature.normalizedName)) foundryByName.set(feature.normalizedName, []);
  foundryByName.get(feature.normalizedName).push(feature);
}

const repeatedRows = repeated.map((entry) => {
  const matches = foundryByName.get(normalizeName(entry.name)) ?? [];
  return {
    name: entry.name,
    count: entry.count,
    exactVariantCount: entry.exactVariantCount,
    families: entry.families,
    foundryReusable: matches.length > 0,
    foundryMatches: matches
  };
});

const foundryNames = new Set(foundry.map((entry) => entry.normalizedName));
const repeatedNames = new Set(repeatedRows.map((entry) => normalizeName(entry.name)));
const overlap = repeatedRows.filter((entry) => entry.foundryReusable);
const repeatedOnly = repeatedRows.filter((entry) => !entry.foundryReusable);
const foundryOnly = foundry.filter((entry) => !repeatedNames.has(entry.normalizedName));

const report = {
  generatedAt: new Date().toISOString(),
  foundryRoot: FOUNDRY_ROOT,
  foundryFeatureCount: foundry.length,
  foundryUniqueNameCount: foundryNames.size,
  repeated5etoolsNameCount: repeatedRows.length,
  reusableNameOverlapCount: overlap.length,
  repeated5etoolsOnlyCount: repeatedOnly.length,
  foundryOnlyCount: foundryOnly.length,
  foundryCategoryCounts: Object.fromEntries([...foundry.reduce((map, row) => map.set(row.category, (map.get(row.category) ?? 0) + 1), new Map()).entries()].sort()),
  recommendedOracleTemplates: overlap
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .map((row) => ({
      name: row.name,
      occurrences: row.count,
      sourceVariants: row.exactVariantCount,
      families: row.families,
      foundryCategories: [...new Set(row.foundryMatches.map((match) => match.category))],
      foundryTypes: [...new Set(row.foundryMatches.map((match) => match.type))],
      foundryActivityTypes: [...new Set(row.foundryMatches.flatMap((match) => match.activityTypes))],
      recommendation: row.exactVariantCount === 1 ? "sharedExactTemplate" : "parameterizedTemplate"
    })),
  repeated5etoolsOnly: repeatedOnly.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  foundryOnly
};

await fs.writeFile(OUT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  foundryFeatureCount: report.foundryFeatureCount,
  foundryUniqueNameCount: report.foundryUniqueNameCount,
  repeated5etoolsNameCount: report.repeated5etoolsNameCount,
  reusableNameOverlapCount: report.reusableNameOverlapCount,
  foundryCategoryCounts: report.foundryCategoryCounts,
  topRecommended: report.recommendedOracleTemplates.slice(0, 30)
}, null, 2));
