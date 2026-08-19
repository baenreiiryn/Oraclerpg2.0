import fs from 'node:fs/promises';

const RACES_URL = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/races.json';
const FEATS_URL = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/feats.json';

const fetchJson = async url => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
};

const shape = value => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `array<${[...new Set(value.map(shape))].sort().join('|')}>`;
  if (typeof value === 'object') return `object{${Object.entries(value).map(([k,v]) => `${k}:${shape(v)}`).sort().join(',')}}`;
  return typeof value;
};

const summarize = records => {
  const fieldCounts = {};
  const fieldShapes = {};
  for (const rec of records) {
    for (const [key, value] of Object.entries(rec)) {
      fieldCounts[key] = (fieldCounts[key] ?? 0) + 1;
      fieldShapes[key] ??= {};
      const s = shape(value);
      fieldShapes[key][s] = (fieldShapes[key][s] ?? 0) + 1;
    }
  }
  return { fieldCounts, fieldShapes };
};

const racesData = await fetchJson(RACES_URL);
const featsData = await fetchJson(FEATS_URL);
const species = (racesData.race ?? []).filter(x => x.srd52 === true);
const feats = (featsData.feat ?? []).filter(x => x.srd52 === true);

const featCategories = {};
for (const feat of feats) featCategories[feat.category ?? 'unknown'] = (featCategories[feat.category ?? 'unknown'] ?? 0) + 1;

const speciesFeatureNames = {};
for (const sp of species) {
  for (const entry of sp.entries ?? []) {
    if (entry && typeof entry === 'object' && typeof entry.name === 'string') speciesFeatureNames[entry.name] = (speciesFeatureNames[entry.name] ?? 0) + 1;
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  sources: { races: RACES_URL, feats: FEATS_URL },
  speciesCount: species.length,
  featCount: feats.length,
  featCategories,
  speciesNames: species.map(x => x.name).sort(),
  featNames: feats.map(x => ({ name: x.name, category: x.category ?? null, prerequisite: x.prerequisite ?? null })).sort((a,b) => a.name.localeCompare(b.name)),
  repeatedSpeciesFeatureNames: Object.entries(speciesFeatureNames).filter(([,n]) => n > 1).sort((a,b) => b[1]-a[1]),
  species: summarize(species),
  feats: summarize(feats),
  speciesSamples: species,
  featSamples: feats,
};

await fs.mkdir('tmp/species-feat-probe', { recursive: true });
await fs.writeFile('tmp/species-feat-probe/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ speciesCount: report.speciesCount, featCount: report.featCount, featCategories, repeatedSpeciesFeatureNames: report.repeatedSpeciesFeatureNames.slice(0,20) }, null, 2));
