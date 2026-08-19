import fs from 'node:fs/promises';

const ROOT = process.argv[2] ?? 'packages/content/data/srd-5.2';
const RACES_URL = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/races.json';
const FEATS_URL = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/feats.json';
const CATEGORY = { O:'origin', G:'general', FS:'fightingStyle', EB:'epicBoon' };
const SIZE = { T:'tiny', S:'small', M:'medium', L:'large', H:'huge', G:'gargantuan' };

const fetchJson = async url => { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };
const load = async name => JSON.parse(await fs.readFile(`${ROOT}/${name}`, 'utf8'));
const normalizeSize = values => (values ?? []).map(x => SIZE[x] ?? String(x).toLowerCase()).sort();
const sorted = values => [...values].sort((a,b)=>String(a).localeCompare(String(b)));

const [racesData, featsData, speciesDoc, speciesFeaturesDoc, featsDoc] = await Promise.all([
  fetchJson(RACES_URL), fetchJson(FEATS_URL), load('species.json'), load('species-features.json'), load('feats.json')
]);

const sourceSpecies = (racesData.race ?? []).filter(x => x.srd52 === true);
const sourceFeats = (featsData.feat ?? []).filter(x => x.srd52 === true);
const oracleSpecies = new Map(speciesDoc.items.map(x => [x.name, x]));
const oracleFeats = new Map(featsDoc.items.map(x => [x.name, x]));
const oracleSpeciesFeatures = new Set(speciesFeaturesDoc.items.map(x => x.name));

const issues = [];
const speciesChecks = [];
for (const src of sourceSpecies) {
  const out = oracleSpecies.get(src.name);
  if (!out) { issues.push({type:'missing-species', name:src.name}); continue; }
  const expectedSize = normalizeSize(src.size);
  const actualSize = sorted(out.data.size ?? []);
  if (JSON.stringify(expectedSize) !== JSON.stringify(actualSize)) issues.push({type:'species-size', name:src.name, source:expectedSize, oracle:actualSize});
  const expectedSpeed = typeof src.speed === 'number' ? src.speed : 30;
  if (out.data.speed !== expectedSpeed) issues.push({type:'species-speed', name:src.name, source:expectedSpeed, oracle:out.data.speed});
  const expectedDarkvision = typeof src.darkvision === 'number' ? src.darkvision : undefined;
  if (expectedDarkvision !== undefined && out.data.darkvision !== expectedDarkvision) issues.push({type:'species-darkvision', name:src.name, source:expectedDarkvision, oracle:out.data.darkvision});
  const sourceFeatureNames = (src.entries ?? []).filter(e => e && typeof e === 'object' && e.name).map(e => e.name);
  const oracleFeatureNames = (out.data.features ?? []).map(x => x.name).filter(Boolean);
  for (const f of sourceFeatureNames) if (!oracleFeatureNames.includes(f)) issues.push({type:'species-feature-link', species:src.name, feature:f});
  for (const f of sourceFeatureNames) if (!oracleSpeciesFeatures.has(f)) issues.push({type:'species-feature-definition', species:src.name, feature:f});
  const sourceVariants = src._versions?.length ?? 0;
  const oracleVariants = out.data.variants?.length ?? 0;
  if (sourceVariants && sourceVariants !== oracleVariants) {
    const dragonbornExpanded = src.name === 'Dragonborn' && sourceVariants === 1 && oracleVariants === 10;
    if (!dragonbornExpanded) issues.push({type:'species-variant-count', name:src.name, source:sourceVariants, oracle:oracleVariants});
  }
  speciesChecks.push({name:src.name,size:actualSize,speed:out.data.speed,darkvision:out.data.darkvision??null,featureCount:oracleFeatureNames.length,variantCount:oracleVariants});
}
for (const name of oracleSpecies.keys()) if (!sourceSpecies.some(x => x.name === name)) issues.push({type:'extra-oracle-species',name});

const featChecks = [];
for (const src of sourceFeats) {
  const out = oracleFeats.get(src.name);
  if (!out) { issues.push({type:'missing-feat', name:src.name}); continue; }
  const expectedCategory = CATEGORY[src.category] ?? 'other';
  if (out.data.featCategory !== expectedCategory) issues.push({type:'feat-category', name:src.name, source:expectedCategory, oracle:out.data.featCategory});
  if (Boolean(src.repeatable) !== Boolean(out.data.repeatable)) issues.push({type:'feat-repeatable',name:src.name,source:Boolean(src.repeatable),oracle:Boolean(out.data.repeatable)});
  if (src.additionalSpells?.length && !out.data.spellGrants?.length && !out.data.spellGrantChoices?.length) issues.push({type:'feat-spell-grants',name:src.name});
  if (src.ability?.length && !out.data.abilityScoreOptions?.length) issues.push({type:'feat-ability-options',name:src.name});
  if (src.prerequisite?.length && !out.data.prerequisites?.length) issues.push({type:'feat-prerequisites',name:src.name});
  featChecks.push({name:src.name,category:out.data.featCategory,repeatable:Boolean(out.data.repeatable),hasSpells:Boolean(out.data.spellGrants?.length||out.data.spellGrantChoices?.length),hasAbilityOptions:Boolean(out.data.abilityScoreOptions?.length),hasPrerequisites:Boolean(out.data.prerequisites?.length)});
}
for (const name of oracleFeats.keys()) if (!sourceFeats.some(x => x.name === name)) issues.push({type:'extra-oracle-feat',name});

const report = {
  generatedAt:new Date().toISOString(),
  source:'5etools-mirror-3/5etools-src',
  sourceSpeciesCount:sourceSpecies.length,
  oracleSpeciesCount:oracleSpecies.size,
  sourceFeatCount:sourceFeats.length,
  oracleFeatCount:oracleFeats.size,
  sourceFeatCategories:Object.fromEntries(Object.entries(CATEGORY).map(([k,v])=>[v,sourceFeats.filter(x=>x.category===k).length])),
  oracleFeatCategories:Object.fromEntries(Object.values(CATEGORY).map(v=>[v,[...oracleFeats.values()].filter(x=>x.data.featCategory===v).length])),
  speciesChecks,
  featChecks,
  issues,
  status:issues.length ? 'PARTIAL' : 'SUPPORTED'
};
await fs.writeFile(`${ROOT}/species-feats-5etools-comparison.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({sourceSpeciesCount:report.sourceSpeciesCount,oracleSpeciesCount:report.oracleSpeciesCount,sourceFeatCount:report.sourceFeatCount,oracleFeatCount:report.oracleFeatCount,sourceFeatCategories:report.sourceFeatCategories,oracleFeatCategories:report.oracleFeatCategories,issues:report.issues,status:report.status},null,2));
if (issues.length) process.exitCode = 1;
