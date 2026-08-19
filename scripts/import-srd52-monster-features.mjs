import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const SOURCE_URL = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/bestiary/bestiary-xmm.json";
const OUT_DIR = "packages/content/data/srd-5.2";
const COMPENDIUM_PATH = path.join(OUT_DIR, "monster-features.json");
const ALIASES_PATH = path.join(OUT_DIR, "monster-feature-aliases.json");
const REPORT_PATH = path.join(OUT_DIR, "monster-features-import-report.json");

const SECTIONS = [
  ["trait", "trait"],
  ["action", "action"],
  ["bonus", "bonusAction"],
  ["reaction", "reaction"],
  ["legendary", "legendaryAction"]
];

const DAMAGE_TYPES = ["acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic", "piercing", "poison", "psychic", "radiant", "slashing", "thunder"];
const ELEMENTAL_BREATH = /^(acid|cold|fire|lightning|poison) breath$/i;

const slug = value => String(value)
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

const featureCanonicalId = name => `dnd2024:2024:feature:${slug(name)}:srd-5.2`;

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, stable(child)]));
}

function fingerprint(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stable(value))).digest("hex").slice(0, 16);
}

function textOf(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textOf).filter(Boolean).join(" ");
  if (typeof value === "object") {
    if (value.type === "list" && Array.isArray(value.items)) return value.items.map(textOf).filter(Boolean).join(" ");
    if (Array.isArray(value.entries)) return [value.name, ...value.entries.map(textOf)].filter(Boolean).join(" ");
    return Object.values(value).map(textOf).filter(Boolean).join(" ");
  }
  return String(value);
}

function normalizeName(name = "") {
  return String(name)
    .replace(/\s*\{@recharge\s+[^}]+\}\s*/gi, " ")
    .replace(/\s*\([^)]*Recharge[^)]*\)\s*/gi, " ")
    .replace(/\s*\(Costs?\s+\d+\s+Actions?\)\s*/gi, " ")
    .replace(/\s*\(\d+\/Day(?:[^)]*)\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function rawRechargeMin(name = "") {
  const tagged = String(name).match(/\{@recharge\s+(\d+)/i);
  if (tagged) return Number(tagged[1]);
  const plain = String(name).match(/recharge\s+(\d+)/i);
  return plain ? Number(plain[1]) : undefined;
}

function rawDailyUses(name = "") {
  const match = String(name).match(/\((\d+)\/Day/i);
  return match ? Number(match[1]) : undefined;
}

function legendaryActionCost(name = "") {
  const match = String(name).match(/\(Costs?\s+(\d+)\s+Actions?\)/i);
  return match ? Number(match[1]) : undefined;
}

function sectionActivation(section) {
  if (section === "action") return { type: "action" };
  if (section === "bonusAction") return { type: "bonusAction" };
  if (section === "reaction") return { type: "reaction" };
  if (section === "legendaryAction") return { type: "special" };
  return undefined;
}

function classify(feature, section) {
  const name = normalizeName(feature.name ?? "").toLowerCase();
  const text = textOf(feature.entries ?? feature).toLowerCase();
  if (name.includes("multiattack")) return "multiattack";
  if (/breath/.test(name) && /(cone|line|saving throw|damage|condition)/.test(text)) return "breathWeapon";
  if (/^(bite|claw|gore|slam|tail|tentacle|pseudopod|beak|hooves|ram|sting|talon|talons|mandibles|constrict|fist|tusk|horns?|rend)\b/.test(name)) return "naturalAttack";
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

function schemaFamily(family, section) {
  if (family === "naturalAttack") return "naturalAttack";
  if (family === "breathWeapon") return "breathWeapon";
  if (family === "multiattack") return "multiattack";
  if (family === "aura") return "aura";
  if (family === "spellcasting") return "spellcasting";
  if (["amphibious", "spiderClimb", "flyby", "movementAttackRider"].includes(family)) return "movementTrait";
  if (section === "reaction") return "reaction";
  if (section === "legendaryAction") return "legendaryAction";
  if (section === "trait") return "trait";
  return "special";
}

function damageTypeOf(text) {
  const lower = text.toLowerCase();
  return DAMAGE_TYPES.find(type => new RegExp(`\\b${type}\\b`, "i").test(lower));
}

function mechanics(feature) {
  const raw = textOf(feature.entries ?? feature);
  const hit = raw.match(/\{@hit\s+([+-]?\d+)/i);
  const damage = [...raw.matchAll(/\{@damage\s+([^}|]+)(?:\|[^}]*)?\}/gi)].map(m => m[1].trim());
  const dc = raw.match(/\{@dc\s+(\d+)/i);
  const distances = [...raw.matchAll(/(\d+)[ -]?foot/gi)].map(m => Number(m[1]));
  const area = raw.match(/(\d+)[ -]?foot(?:-radius)?\s+(cone|line|emanation|sphere|cube|cylinder)/i);
  const attackTag = raw.match(/\{@atk\s+([^}]+)\}/i)?.[1];
  return {
    raw,
    attackBonus: hit ? Number(hit[1]) : undefined,
    damageFormula: damage[0],
    damageType: damageTypeOf(raw),
    saveDc: dc ? Number(dc[1]) : undefined,
    distances: [...new Set(distances)],
    areaShape: area?.[2]?.toLowerCase(),
    areaSize: area ? Number(area[1]) : undefined,
    attackTag,
    rechargeMin: rawRechargeMin(feature.name),
    dailyUses: rawDailyUses(feature.name),
    legendaryActionCost: legendaryActionCost(feature.name)
  };
}

function canonicalGroupName(occurrence) {
  if (occurrence.family === "legendaryResistance") return "Legendary Resistance";
  if (occurrence.family === "breathWeapon" && ELEMENTAL_BREATH.test(occurrence.normalizedName)) return "Draconic Breath Weapon";
  return occurrence.normalizedName;
}

function baseRecord(name, data, sourceKey, tags = []) {
  const canonicalId = featureCanonicalId(name);
  return {
    id: canonicalId,
    canonicalId,
    entityType: "feature",
    name,
    system: { gameSystem: "dnd2024", rulesVersion: "2024" },
    source: { sourceId: "srd-5.2", book: "XMM", license: "CC-BY-4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" },
    provenance: { origin: "import", provider: "5etools", sourceKey, adapterVersion: "0.2.0", mapperVersion: "0.2.0" },
    schemaVersion: 1,
    data,
    relations: [],
    metadata: { tags: ["srd-5.2", "monster-feature", ...tags] }
  };
}

function rulesTemplate(name, section, family, occurrences) {
  const representative = occurrences[0];
  const variants = new Set(occurrences.map(item => item.fingerprint)).size;
  const raw = representative.mechanics.raw || name;
  const parameters = [];
  const bindings = [];
  if (variants > 1) {
    parameters.push({ id: "rulesText", name: "Rules Text", kind: "string", required: true, defaultValue: raw });
    bindings.push({ parameterId: "rulesText", path: "text.rules.0" });
  }
  const activation = sectionActivation(section);
  const data = {
    featureKind: "monsterFeature",
    category: section,
    subtype: family,
    monsterTemplate: { family: schemaFamily(family, section), ...(parameters.length ? { parameters, bindings } : {}) },
    ...(section === "trait" ? {} : { activities: [{ id: slug(name) || "feature", name, kind: "special", ...(activation ? { activation } : {}), description: raw }] }),
    text: { rules: [raw] }
  };
  return baseRecord(name, data, `XMM:feature:${name}`, ["template", schemaFamily(family, section), variants > 1 ? "parameterized" : "exact"]);
}

function naturalAttackTemplate(name, section, occurrences) {
  const representative = occurrences[0];
  const m = representative.mechanics;
  const attackMode = /r/.test(m.attackTag ?? "") && !/m/.test(m.attackTag ?? "") ? "ranged" : "melee";
  const reach = m.distances[0] ?? 5;
  const parameters = [
    { id: "attackBonus", name: "Attack Bonus", kind: "attackBonus", required: true, defaultValue: String(m.attackBonus ?? 0) },
    { id: "damageFormula", name: "Damage Formula", kind: "damageFormula", required: true, defaultValue: m.damageFormula ?? "1" },
    { id: "damageType", name: "Damage Type", kind: "damageType", required: true, defaultValue: m.damageType ?? "bludgeoning" },
    { id: "rulesText", name: "Rules Text", kind: "string", required: true, defaultValue: m.raw || name }
  ];
  const bindings = [
    { parameterId: "attackBonus", path: "activities.0.attack.bonus.formula" },
    { parameterId: "damageFormula", path: "activities.0.damage.0.formula" },
    { parameterId: "damageType", path: "activities.0.damage.0.damageType" },
    { parameterId: "rulesText", path: "text.rules.0" },
    { parameterId: "rulesText", path: "activities.0.description" }
  ];
  if (attackMode === "melee") {
    parameters.splice(1, 0, { id: "reach", name: "Reach", kind: "number", defaultValue: reach });
    bindings.splice(1, 0, { parameterId: "reach", path: "activities.0.range.reach.value" });
  }
  const activity = {
    id: slug(name), name, kind: "attack", activation: { type: "action" },
    ...(attackMode === "melee" ? { range: { reach: { value: reach, unit: "ft" } } } : {}),
    target: { type: "creature", count: 1 },
    attack: { classification: "special", mode: attackMode, bonus: { formula: String(m.attackBonus ?? 0) } },
    damage: [{ damageType: m.damageType ?? "bludgeoning", formula: m.damageFormula ?? "1" }],
    description: m.raw || name
  };
  const data = {
    featureKind: "monsterFeature", category: section, subtype: "naturalAttack",
    monsterTemplate: { family: "naturalAttack", parameters, bindings },
    activities: [activity], text: { rules: [m.raw || name] }
  };
  return baseRecord(name, data, `XMM:shared:${slug(name)}`, ["template", "natural-attack", "parameterized"]);
}

function multiattackTemplate(name, section, occurrences) {
  const raw = occurrences[0].mechanics.raw || name;
  const data = {
    featureKind: "monsterFeature", category: section, subtype: "multiattack",
    monsterTemplate: {
      family: "multiattack",
      parameters: [{ id: "rulesText", name: "Attack Sequence", kind: "string", required: true, defaultValue: raw }],
      bindings: [
        { parameterId: "rulesText", path: "text.rules.0" },
        { parameterId: "rulesText", path: "activities.0.description" }
      ]
    },
    activities: [{ id: "multiattack", name: "Multiattack", kind: "multiattack", activation: { type: "action" }, multiattack: { sequence: [] }, description: raw }],
    text: { rules: [raw] }
  };
  return baseRecord(name, data, "XMM:shared:multiattack", ["template", "multiattack", "parameterized"]);
}

function legendaryResistanceTemplate(occurrences) {
  const raw = occurrences[0].mechanics.raw || "If the creature fails a saving throw, it can choose to succeed instead.";
  const uses = Math.max(...occurrences.map(item => item.mechanics.dailyUses ?? 3));
  const data = {
    featureKind: "monsterFeature", category: "trait", subtype: "legendaryResistance",
    monsterTemplate: {
      family: "trait",
      parameters: [
        { id: "usesPerDay", name: "Uses per Day", kind: "number", required: true, defaultValue: uses },
        { id: "rulesText", name: "Rules Text", kind: "string", required: true, defaultValue: raw }
      ],
      bindings: [{ parameterId: "rulesText", path: "text.rules.0" }]
    },
    text: { rules: [raw] }
  };
  return baseRecord("Legendary Resistance", data, "XMM:shared:legendary-resistance", ["template", "legendary-resistance", "parameterized"]);
}

async function loadExisting() {
  try {
    return JSON.parse(await fs.readFile(COMPENDIUM_PATH, "utf8"));
  } catch {
    return { items: [] };
  }
}

const response = await fetch(SOURCE_URL, { headers: { "user-agent": "OracleRPG2-SRD-MonsterFeature-Importer" } });
if (!response.ok) throw new Error(`${SOURCE_URL}: ${response.status} ${response.statusText}`);
const source = await response.json();
const monsters = (source.monster ?? []).filter(monster => monster.srd52 === true);

const occurrences = [];
for (const monster of monsters) {
  for (const [field, section] of SECTIONS) {
    for (const feature of monster[field] ?? []) {
      const normalizedName = normalizeName(feature.name ?? "Unnamed Feature");
      const family = classify(feature, section);
      occurrences.push({
        monster: monster.name,
        section,
        name: feature.name ?? "Unnamed Feature",
        normalizedName,
        family,
        fingerprint: fingerprint(feature),
        mechanics: mechanics(feature),
        feature
      });
    }
  }
}

const grouped = new Map();
for (const occurrence of occurrences) {
  const groupName = canonicalGroupName(occurrence);
  const key = groupName.toLowerCase();
  if (!grouped.has(key)) grouped.set(key, { name: groupName, occurrences: [] });
  grouped.get(key).occurrences.push(occurrence);
}

const existing = await loadExisting();
const curatedByName = new Map((existing.items ?? []).map(item => [item.name.toLowerCase(), item]));
const records = [];
const aliases = {};
const generated = [];
const preserved = [];

for (const { name, occurrences: groupOccurrences } of [...grouped.values()].sort((a, b) => a.name.localeCompare(b.name))) {
  const first = groupOccurrences[0];
  let record = curatedByName.get(name.toLowerCase());
  if (record) {
    preserved.push(name);
  } else if (name === "Legendary Resistance") {
    record = legendaryResistanceTemplate(groupOccurrences);
    generated.push(name);
  } else if (first.family === "naturalAttack") {
    record = naturalAttackTemplate(name, first.section, groupOccurrences);
    generated.push(name);
  } else if (first.family === "multiattack") {
    record = multiattackTemplate(name, first.section, groupOccurrences);
    generated.push(name);
  } else {
    record = rulesTemplate(name, first.section, first.family, groupOccurrences);
    generated.push(name);
  }
  records.push(record);

  for (const occurrence of groupOccurrences) {
    aliases[`${occurrence.name}|${occurrence.section}`] = {
      definitionCanonicalId: record.canonicalId,
      definitionName: record.name,
      normalizedName: occurrence.normalizedName,
      family: occurrence.family,
      parameterHints: {
        ...(occurrence.mechanics.attackBonus != null ? { attackBonus: String(occurrence.mechanics.attackBonus) } : {}),
        ...(occurrence.mechanics.damageFormula ? { damageFormula: occurrence.mechanics.damageFormula } : {}),
        ...(occurrence.mechanics.damageType ? { damageType: occurrence.mechanics.damageType } : {}),
        ...(occurrence.mechanics.rechargeMin != null ? { rechargeMin: occurrence.mechanics.rechargeMin, rechargeMax: 6 } : {}),
        ...(occurrence.mechanics.dailyUses != null ? { usesPerDay: occurrence.mechanics.dailyUses } : {}),
        ...(occurrence.mechanics.legendaryActionCost != null ? { legendaryActionCost: occurrence.mechanics.legendaryActionCost } : {}),
        rulesText: occurrence.mechanics.raw
      }
    };
  }
}

records.sort((a, b) => a.name.localeCompare(b.name));
await fs.mkdir(OUT_DIR, { recursive: true });
await fs.writeFile(COMPENDIUM_PATH, JSON.stringify({
  format: "oraclerpg-compendium", version: 1, contentSource: "srd-5.2", entityType: "feature",
  count: records.length, items: records
}, null, 2) + "\n");
await fs.writeFile(ALIASES_PATH, JSON.stringify({
  format: "oraclerpg-monster-feature-aliases", version: 1, contentSource: "srd-5.2",
  occurrenceCount: occurrences.length, definitionCount: records.length, aliases
}, null, 2) + "\n");
await fs.writeFile(REPORT_PATH, JSON.stringify({
  generatedAt: new Date().toISOString(), source: SOURCE_URL, srd52Monsters: monsters.length,
  featureOccurrences: occurrences.length, compendiumDefinitions: records.length,
  curatedDefinitionsPreserved: preserved.length, generatedDefinitions: generated.length,
  preserved, generated,
  families: Object.fromEntries([...occurrences.reduce((m, x) => m.set(x.family, (m.get(x.family) ?? 0) + 1), new Map()).entries()].sort((a, b) => b[1] - a[1]))
}, null, 2) + "\n");

console.log(JSON.stringify({
  srd52Monsters: monsters.length,
  featureOccurrences: occurrences.length,
  compendiumDefinitions: records.length,
  curatedDefinitionsPreserved: preserved.length,
  generatedDefinitions: generated.length,
  aliasCount: Object.keys(aliases).length
}, null, 2));
