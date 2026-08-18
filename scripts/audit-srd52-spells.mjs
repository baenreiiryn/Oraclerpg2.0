import fs from "node:fs/promises";

const URL = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/spells/spells-xphb.json";
const OUT = "packages/content/data/srd-5.2/spells-coverage-audit.json";
const response = await fetch(URL);
if (!response.ok) throw new Error(`Failed upstream spell fetch: ${response.status}`);
const upstream = (await response.json()).spell.filter(spell => spell.srd52 === true);
const oracle = JSON.parse(await fs.readFile("packages/content/data/srd-5.2/spells.json","utf8")).items;
const byName = new Map(oracle.map(record=>[record.name,record]));
const issues=[];
const covered={ castingTime:0, range:0, duration:0, components:0, ritual:0, concentration:0, spellLists:0, damageMetadata:0, saveMetadata:0, conditionMetadata:0, attackMetadata:0, scaling:0, higherLevel:0 };

for (const spell of upstream) {
  const record=byName.get(spell.name);
  if (!record) { issues.push({name:spell.name,field:"record",issue:"missing"}); continue; }
  const data=record.data;
  if (spell.time?.length) { if (!data.castingTimes?.length) issues.push({name:spell.name,field:"time",issue:"missing"}); else covered.castingTime++; }
  if (spell.range) { if (!data.range) issues.push({name:spell.name,field:"range",issue:"missing"}); else covered.range++; }
  if (spell.duration?.length) { if (!data.durations?.length) issues.push({name:spell.name,field:"duration",issue:"missing"}); else covered.duration++; }
  if (spell.components) { if (!data.components) issues.push({name:spell.name,field:"components",issue:"missing"}); else covered.components++; }
  if (spell.meta?.ritual) { if (!data.ritual) issues.push({name:spell.name,field:"ritual",issue:"lost"}); else covered.ritual++; }
  if (spell.duration?.some(d=>d.concentration)) { if (!data.concentration) issues.push({name:spell.name,field:"concentration",issue:"lost"}); else covered.concentration++; }
  if (spell.damageInflict?.length) { if (!data.mechanicIndex?.damageInflicted?.length) issues.push({name:spell.name,field:"damageInflict",issue:"missing"}); else covered.damageMetadata++; }
  if (spell.savingThrow?.length) { if (!data.mechanicIndex?.savingThrows?.length) issues.push({name:spell.name,field:"savingThrow",issue:"missing"}); else covered.saveMetadata++; }
  if (spell.conditionInflict?.length) { if (!data.mechanicIndex?.conditionsInflicted?.length) issues.push({name:spell.name,field:"conditionInflict",issue:"missing"}); else covered.conditionMetadata++; }
  if (spell.spellAttack?.length) { if (!data.mechanicIndex?.spellAttacks?.length) issues.push({name:spell.name,field:"spellAttack",issue:"missing"}); else covered.attackMetadata++; }
  if (spell.scalingLevelDice) { if (!data.scaling?.length) issues.push({name:spell.name,field:"scalingLevelDice",issue:"missing"}); else covered.scaling++; }
  if (spell.entriesHigherLevel?.length) { if (!data.higherLevelText?.rules?.length) issues.push({name:spell.name,field:"entriesHigherLevel",issue:"missing"}); else covered.higherLevel++; }
  if (!data.activities?.length) issues.push({name:spell.name,field:"activities",issue:"missing-base-activity"});
  if (data.components?.material?.cost && data.components.material.cost.currency !== "cp") issues.push({name:spell.name,field:"components.material.cost.currency",issue:"unexpected-unit"});
}

const report={generatedAt:new Date().toISOString(),upstreamCount:upstream.length,oracleCount:oracle.length,issueCount:issues.length,status:issues.length?"partial":"supported",covered,issues};
await fs.writeFile(OUT,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
if (issues.length) process.exitCode=1;