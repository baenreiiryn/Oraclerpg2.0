import fs from "node:fs/promises";

const SOURCE = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/spells/spells-xphb.json";
const OUT_DIR = "packages/content/data/srd-5.2/spell-probe";

const res = await fetch(SOURCE);
if (!res.ok) throw new Error(`Failed to fetch spells: ${res.status}`);
const json = await res.json();
const spells = (json.spell ?? []).filter((spell) => spell.srd52 === true);

const counts = {};
const examples = {};
const shapes = {};
const values = {};

function shapeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${[...new Set(value.map(shapeOf))].sort().join("|")}]`;
  if (typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${key}:${shapeOf(value[key])}`).join(",")}}`;
  return typeof value;
}
function addValue(key, value) {
  if (value === undefined || value === null) return;
  values[key] ??= new Set();
  values[key].add(String(value));
}

for (const spell of spells) {
  for (const [key, value] of Object.entries(spell)) {
    counts[key] = (counts[key] ?? 0) + 1;
    const shape = shapeOf(value);
    shapes[key] ??= {};
    shapes[key][shape] = (shapes[key][shape] ?? 0) + 1;
    examples[key] ??= [];
    if (examples[key].length < 5) examples[key].push({ name: spell.name, value });
  }
  for (const time of spell.time ?? []) {
    addValue("time.unit", time.unit);
    addValue("time.condition", time.condition);
  }
  addValue("range.type", spell.range?.type);
  addValue("range.distance.type", spell.range?.distance?.type);
  for (const duration of spell.duration ?? []) {
    addValue("duration.type", duration.type);
    addValue("duration.unit", duration.duration?.type);
    for (const end of duration.ends ?? []) addValue("duration.ends", end);
  }
  for (const value of spell.miscTags ?? []) addValue("miscTags", value);
  for (const value of spell.areaTags ?? []) addValue("areaTags", value);
  for (const value of spell.spellAttack ?? []) addValue("spellAttack", value);
  for (const value of spell.savingThrow ?? []) addValue("savingThrow", value);
  for (const value of spell.abilityCheck ?? []) addValue("abilityCheck", value);
  for (const value of spell.damageInflict ?? []) addValue("damageInflict", value);
  for (const value of spell.conditionInflict ?? []) addValue("conditionInflict", value);
  for (const value of spell.damageResist ?? []) addValue("damageResist", value);
  for (const value of spell.damageImmune ?? []) addValue("damageImmune", value);
  for (const value of spell.damageVulnerable ?? []) addValue("damageVulnerable", value);
  for (const value of spell.conditionImmune ?? []) addValue("conditionImmune", value);
  for (const value of spell.affectsCreatureType ?? []) addValue("affectsCreatureType", value);
}

const summary = {
  upstream: SOURCE,
  source: "XPHB",
  filter: "srd52 === true",
  count: spells.length,
  levels: Object.fromEntries([...new Set(spells.map((spell) => spell.level))].sort((a,b)=>a-b).map((level) => [level, spells.filter((spell) => spell.level === level).length])),
  schools: Object.fromEntries([...new Set(spells.map((spell) => spell.school))].sort().map((school) => [school, spells.filter((spell) => spell.school === school).length])),
  fieldCounts: Object.fromEntries(Object.entries(counts).sort((a,b)=>b[1]-a[1])),
  fieldShapes: shapes,
  distinctValues: Object.fromEntries(Object.entries(values).map(([key, set]) => [key, [...set].sort()])),
  examples,
};

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.writeFile(`${OUT_DIR}/spell-field-probe.json`, `${JSON.stringify(summary, null, 2)}\n`);
await fs.writeFile(`${OUT_DIR}/srd52-spell-names.json`, `${JSON.stringify(spells.map(({name, level, school, page}) => ({name, level, school, page})), null, 2)}\n`);
console.log(`SRD 5.2 spells: ${spells.length}`);
console.log(JSON.stringify(summary.fieldCounts, null, 2));
console.log(JSON.stringify(summary.distinctValues, null, 2));