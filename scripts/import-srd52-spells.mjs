import fs from "node:fs/promises";
import path from "node:path";

const URL_SPELLS = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/spells/spells-xphb.json";
const URL_SOURCES = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/spells/sources.json";
const OUT_DIR = "packages/content/data/srd-5.2";

const SCHOOL = { A:"abjuration", C:"conjuration", D:"divination", E:"enchantment", V:"evocation", I:"illusion", N:"necromancy", T:"transmutation" };
const TIME = { action:"action", bonus:"bonusAction", reaction:"reaction", minute:"minute", hour:"hour" };
const ATTACK = { M:"melee", R:"ranged" };
const HANDLED_FIELDS = new Set([
  "name","source","page","level","school","time","range","components","duration","entries","entriesHigherLevel",
  "meta","miscTags","areaTags","damageInflict","savingThrow","conditionInflict","spellAttack","affectsCreatureType",
  "scalingLevelDice","abilityCheck","damageResist","conditionImmune","damageImmune","damageVulnerable","srd52","basicRules2024","alias"
]);

/**
 * SRD 5.2 deliberately renames a small set of branded PHB spells. 5etools keeps the PHB record
 * under its branded name and therefore cannot mark those records with srd52:true. We still source
 * their mechanics from the XPHB record and publish the CC/SRD name as the canonical name.
 */
const SRD_NAME_FROM_XPHB = new Map(Object.entries({
  "Tenser's Floating Disk":"Floating Disk",
  "Tasha's Hideous Laughter":"Hideous Laughter",
  "Melf's Acid Arrow":"Acid Arrow",
  "Arcane Vigor":"Arcane Vigor",
  "Nystul's Magic Aura":"Arcanist's Magic Aura",
  "Leomund's Tiny Hut":"Tiny Hut",
  "Evard's Black Tentacles":"Black Tentacles",
  "Mordenkainen's Faithful Hound":"Faithful Hound",
  "Mordenkainen's Private Sanctum":"Private Sanctum",
  "Otiluke's Resilient Sphere":"Resilient Sphere",
  "Leomund's Secret Chest":"Secret Chest",
  "Bigby's Hand":"Arcane Hand",
  "Rary's Telepathic Bond":"Telepathic Bond",
  "Otiluke's Freezing Sphere":"Freezing Sphere",
  "Drawmij's Instant Summons":"Instant Summons",
  "Otto's Irresistible Dance":"Irresistible Dance",
  "Mordenkainen's Sword":"Arcane Sword",
  "Mordenkainen's Magnificent Mansion":"Magnificent Mansion"
}));

const OFFICIAL_SRD_OVERRIDES = {
  "Commune with Nature": { duration:{type:"instant"} },
  "Transport via Plants": { duration:{type:"timed",amount:1,unit:"minute"} },
  "Power Word Heal": { components:{verbal:true} }
};

const slug = value => String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const spellId = name => `dnd2024:2024:spell:${slug(name)}:srd-5.2`;
const classId = name => `dnd2024:2024:class:${slug(name)}:srd-5.2`;

async function load(url) {
  const response = await fetch(url, { headers: { "user-agent": "OracleRPG2-SRD-Importer" } });
  if (!response.ok) throw new Error(`${url}: ${response.status} ${response.statusText}`);
  return response.json();
}
function rich(entry) {
  if (entry == null) return null;
  if (["string","number","boolean"].includes(typeof entry)) return String(entry);
  if (Array.isArray(entry)) return { type:"list", items:entry.map(rich).filter(Boolean) };
  if (entry.type === "table") return { type:"table", ...(entry.caption ? {caption:String(entry.caption)}:{}), columns:(entry.colLabels??[]).map(String), rows:entry.rows??[] };
  if (entry.type === "list") return { type:"list", items:(entry.items??[]).map(rich).filter(Boolean) };
  const entries = entry.entries ?? entry.items;
  if (Array.isArray(entries)) return { type:"entries", ...(entry.name ? {name:String(entry.name).replace(/:$/,'')}:{}), entries:entries.map(rich).filter(Boolean) };
  return entry.name ? String(entry.name) : JSON.stringify(entry);
}
function textOf(entries) {
  const rules = (entries ?? []).map(rich).filter(Boolean);
  return rules.length ? { rules } : undefined;
}
function castingTimes(record) {
  return (record.time ?? []).map(time => ({ amount:Number(time.number ?? 1), unit:TIME[time.unit] ?? "action", ...(time.condition ? {condition:String(time.condition)}:{}), ...(time.note ? {note:String(time.note)}:{}) }));
}
function rangeOf(record) {
  const r = record.range ?? { type:"point", distance:{type:"self"} };
  const areaTypes = new Set(["cone","cube","emanation","line","sphere"]);
  return {
    type:r.type,
    ...(areaTypes.has(r.type) ? {origin:"self"} : r.type === "point" ? {origin:"point"} : {}),
    distance:{ type:r.distance?.type ?? "self", ...(r.distance?.amount != null ? {amount:Number(r.distance.amount)}:{}) }
  };
}
function durations(record) {
  return (record.duration ?? []).map(d => ({ type:d.type, ...(d.duration?.amount != null ? {amount:Number(d.duration.amount)}:{}), ...(d.duration?.type ? {unit:d.duration.type}:{}), ...(d.concentration ? {concentration:true}:{}), ...(d.upTo ? {upTo:true}:{}), ...(d.ends?.length ? {ends:d.ends}:{} ) }));
}
function components(record) {
  const c = record.components ?? {};
  const out = {};
  if (c.v) out.verbal = true;
  if (c.s) out.somatic = true;
  if (c.m) {
    const m = typeof c.m === "string" ? {text:c.m} : c.m;
    out.material = { ...(m.text ? {text:String(m.text)}:{}), ...(m.cost != null ? {cost:{amount:Number(m.cost), currency:"cp"}}:{}), ...(m.consume ? {consumed:true}:{}) };
  }
  return out;
}
function mechanicIndex(record) {
  const out = {};
  const copy = (target, source, map=x=>x) => { if (Array.isArray(record[source]) && record[source].length) out[target] = record[source].map(map); };
  copy("savingThrows","savingThrow"); copy("abilityChecks","abilityCheck"); copy("spellAttacks","spellAttack", x=>ATTACK[x]??String(x));
  copy("damageInflicted","damageInflict"); copy("conditionsInflicted","conditionInflict"); copy("affectsCreatureTypes","affectsCreatureType");
  copy("grantsDamageResistance","damageResist"); copy("grantsDamageImmunity","damageImmune"); copy("grantsDamageVulnerability","damageVulnerable");
  copy("grantsConditionImmunity","conditionImmune"); copy("areaTags","areaTags"); copy("miscTags","miscTags");
  return Object.keys(out).length ? out : undefined;
}
function scaling(record) {
  if (!record.scalingLevelDice) return undefined;
  const raw = Array.isArray(record.scalingLevelDice) ? record.scalingLevelDice : [record.scalingLevelDice];
  return raw.map(entry => ({ type:"characterLevel", progression:entry.scaling, ...(entry.label ? {formula:String(entry.label)}:{}) }));
}
/** sources.json is keyed by the spell's original publication, not always by XPHB. Search all books. */
function classLists(record, sources) {
  const entries=[];
  for (const sourceEntries of Object.values(sources ?? {})) {
    const hit = sourceEntries?.[record.name];
    if (hit?.class?.length) entries.push(...hit.class);
  }
  const classes = entries.filter(entry => entry.source === "XPHB");
  const seen = new Set();
  return classes.filter(entry => !seen.has(entry.name) && seen.add(entry.name)).map(entry => ({ canonicalId:classId(entry.name), name:entry.name, entityType:"class" }));
}
function baseActivity(record) {
  const attacks = record.spellAttack ?? [];
  const saves = record.savingThrow ?? [];
  const checks = record.abilityCheck ?? [];
  const summon = (record.miscTags ?? []).includes("SMN");
  const kind = summon ? "summon" : attacks.length ? "attack" : saves.length ? "save" : checks.length ? "check" : "utility";
  const activity = { id:"cast", name:`Cast ${record.name}`, kind };
  const time = castingTimes(record)[0];
  if (time) activity.activation = { type:time.unit, cost:time.amount };
  const range = rangeOf(record);
  if (range.origin === "self") activity.range = { normal:{unit:"self"} };
  else if (range.distance.type === "feet" || range.distance.type === "miles" || ["touch","sight","unlimited","self"].includes(range.distance.type)) {
    activity.range = { normal:{ ...(range.distance.amount != null ? {value:range.distance.amount}:{}), unit:range.distance.type === "feet" ? "ft" : range.distance.type === "miles" ? "mile" : range.distance.type } };
  }
  if (["cone","cube","emanation","line","sphere"].includes(range.type)) {
    activity.target = { type:range.origin === "self" ? "self" : "point", area:{ shape:range.type, ...(range.distance.amount != null ? {size:{value:range.distance.amount, unit:range.distance.type === "miles" ? "mile" : "ft"}}:{}) } };
  } else if (range.distance.type === "self") activity.target = {type:"self"};
  if (attacks.length === 1) activity.attack = { classification:"spell", mode:ATTACK[attacks[0]] ?? "meleeOrRanged" };
  if (saves.length === 1) activity.save = { ability:saves[0], dc:{type:"spellcasting"}, onSuccess:"special" };
  if (checks.length === 1) activity.check = { ability:checks[0] };
  const ds = durations(record)[0];
  if (ds) activity.duration = ds.concentration ? {type:"concentration", ...(ds.amount != null ? {value:ds.amount}:{}), ...(ds.unit ? {unit:ds.unit}:{})} : ds.type === "timed" ? {type:"timed", value:ds.amount, unit:ds.unit} : ds.type === "instant" ? {type:"instant"} : ds.type === "permanent" ? {type:"permanent"} : {type:"special"};
  if (summon || attacks.length > 1 || saves.length > 1 || checks.length > 1 || record.damageInflict?.length || record.conditionInflict?.length) {
    activity.manualAdjudication = { required:true, reason:"Source discovery metadata does not fully encode every executable branch. Rules text is preserved and later enrichment may replace this fallback.", fallback:"promptGM" };
  }
  return activity;
}
function mapRecord(record, sources, canonicalName) {
  let ds = durations(record);
  let comps = components(record);
  const official = OFFICIAL_SRD_OVERRIDES[canonicalName];
  if (official?.duration) ds = [official.duration];
  if (official?.components) comps = official.components;
  const text = textOf(record.entries);
  const higher = textOf(record.entriesHigherLevel);
  const lists = classLists(record, sources);
  const idx = mechanicIndex(record);
  const scale = scaling(record);
  return {
    level:Number(record.level), school:SCHOOL[record.school],
    aliases:[...new Set([...(record.alias??[]), ...(canonicalName !== record.name ? [record.name] : [])])],
    ritual:Boolean(record.meta?.ritual), concentration:ds.some(d=>d.concentration), castingTimes:castingTimes(record), range:rangeOf(record), durations:ds,
    components:comps, activities:[baseActivity(record)], ...(scale ? {scaling:scale}:{}), ...(lists.length ? {spellLists:lists}:{}),
    ...(idx ? {mechanicIndex:idx}:{}), tags:["srd-5.2","5etools",...(record.miscTags??[]),...(record.areaTags??[])],
    ...(text ? {text}:{}), ...(higher ? {higherLevelText:higher}:{})
  };
}

const [spellJson, sources] = await Promise.all([load(URL_SPELLS), load(URL_SOURCES)]);
const candidates = (spellJson.spell ?? []).filter(spell => spell.srd52 === true || SRD_NAME_FROM_XPHB.has(spell.name));
const records = [];
const diagnostics = [];
for (const source of candidates) {
  const canonicalName = SRD_NAME_FROM_XPHB.get(source.name) ?? source.name;
  const extra = Object.keys(source).filter(key => !HANDLED_FIELDS.has(key));
  if (extra.length) diagnostics.push({name:canonicalName,status:"unmapped-source-fields",fields:extra});
  try {
    const data = mapRecord(source, sources, canonicalName);
    records.push({
      id:spellId(canonicalName), canonicalId:spellId(canonicalName), entityType:"spell", name:canonicalName,
      system:{gameSystem:"dnd2024",rulesVersion:"2024"},
      source:{sourceId:"srd-5.2",book:"SRD 5.2",...(source.page!=null?{page:source.page}:{}),license:"CC-BY-4.0",licenseUrl:"https://creativecommons.org/licenses/by/4.0/"},
      provenance:{origin:"import",provider:"5etools",sourceKey:`${source.name}|${source.source}`,importedAt:new Date().toISOString(),adapterVersion:"0.2.0",mapperVersion:"0.2.0"},
      schemaVersion:1,data,
      relations:(data.spellLists??[]).map(ref=>({type:"availableTo",targetCanonicalId:ref.canonicalId})),
      metadata:{tags:["srd-5.2","5etools","spell",`level-${source.level}`,...(canonicalName!==source.name?["srd-renamed"]:[])]}
    });
  } catch(error) { diagnostics.push({name:canonicalName,status:"mapper-error",error:error instanceof Error?error.message:String(error)}); }
}
records.sort((a,b)=>a.name.localeCompare(b.name));
await fs.mkdir(OUT_DIR,{recursive:true});
await fs.writeFile(path.join(OUT_DIR,"spells.json"),JSON.stringify({format:"oraclerpg-compendium",version:1,contentSource:"srd-5.2",entityType:"spell",count:records.length,items:records},null,2)+"\n");
await fs.writeFile(path.join(OUT_DIR,"spells-import-report.json"),JSON.stringify({generatedAt:new Date().toISOString(),upstream:[URL_SPELLS,URL_SOURCES],sourceCandidates:candidates.length,imported:records.length,renamedSrdEntries:[...SRD_NAME_FROM_XPHB.entries()].map(([sourceName,srdName])=>({sourceName,srdName})),diagnostics},null,2)+"\n");
console.log(`SRD 5.2 spells: ${records.length} imported; ${diagnostics.length} diagnostics.`);
