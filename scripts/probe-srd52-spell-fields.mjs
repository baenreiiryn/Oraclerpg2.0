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

function shapeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${[...new Set(value.map(shapeOf))].sort().join("|")}]`;
  if (typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${key}:${shapeOf(value[key])}`).join(",")}}`;
  return typeof value;
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
  examples,
};

await fs.mkdir(OUT_DIR, { recursive: true });
await fs.writeFile(`${OUT_DIR}/spell-field-probe.json`, `${JSON.stringify(summary, null, 2)}\n`);
await fs.writeFile(`${OUT_DIR}/srd52-spell-names.json`, `${JSON.stringify(spells.map(({name, level, school, page}) => ({name, level, school, page})), null, 2)}\n`);
console.log(`SRD 5.2 spells: ${spells.length}`);
console.log(JSON.stringify(summary.fieldCounts, null, 2));