import fs from "node:fs/promises";
import path from "node:path";

const URL_BASE = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/items-base.json";
const URL_ITEMS = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/items.json";
const OUT_DIR = "packages/content/data/srd-5.2";

const DAMAGE = {
  A: "acid", B: "bludgeoning", C: "cold", F: "fire", O: "force", L: "lightning", N: "necrotic",
  P: "piercing", I: "poison", Y: "psychic", R: "radiant", S: "slashing", T: "thunder"
};

// Fields whose mechanical meaning must not be silently discarded. If a record has one
// of these and the mapper does not explicitly handle it, that record is skipped and
// reported rather than imported partially.
const MECHANICS_FIELDS = new Set([
  "ability", "ac", "ammoType", "armor", "attachedSpells", "bonusAc", "bonusSavingThrow",
  "bonusSpellAttack", "bonusSpellSaveDc", "bonusWeapon", "charges", "conditionImmune",
  "containerCapacity", "dmg1", "dmg2", "dmgType", "immune", "mastery", "packContents",
  "property", "recharge", "rechargeAmount", "resist", "speed", "stealth", "strength",
  "vulnerable", "weapon", "weaponCategory"
]);
const HANDLED_MECHANICS_FIELDS = new Set([
  "ac", "ammoType", "armor", "bonusAc", "bonusSavingThrow", "bonusSpellAttack", "bonusSpellSaveDc",
  "bonusWeapon", "charges", "containerCapacity", "dmg1", "dmg2", "dmgType", "mastery", "packContents",
  "property", "recharge", "rechargeAmount", "stealth", "strength", "weapon", "weaponCategory"
]);

const slug = value => String(value)
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

const canonicalId = name => `dnd2024:2024:item:${slug(name)}:srd-5.2`;
const parseUidName = uid => String(uid ?? "").split("|")[0].trim();
const itemRef = uid => {
  const name = parseUidName(uid);
  return { canonicalId: canonicalId(name), name, entityType: "item" };
};
const parseNumber = value => {
  if (value == null) return undefined;
  const n = Number(String(value).replace(/^\+/, ""));
  return Number.isFinite(n) ? n : undefined;
};
const parseFormula = value => String(value ?? "")
  .replace(/\{@dice\s+([^}]+)\}/gi, "$1")
  .replace(/\{@damage\s+([^}]+)\}/gi, "$1")
  .trim();

function normalizeRich(entry) {
  if (entry == null) return null;
  if (typeof entry === "string") return entry;
  if (typeof entry === "number" || typeof entry === "boolean") return String(entry);
  if (Array.isArray(entry)) return { type: "list", items: entry.map(normalizeRich).filter(Boolean) };
  const entries = entry.entries ?? entry.items;
  if (entry.type === "table") return {
    type: "table", ...(entry.caption ? { caption: String(entry.caption) } : {}),
    columns: (entry.colLabels ?? []).map(String), rows: entry.rows ?? []
  };
  if (entry.type === "list") return { type: "list", items: (entry.items ?? []).map(normalizeRich).filter(Boolean) };
  if (Array.isArray(entries)) return {
    type: "entries", ...(entry.name ? { name: String(entry.name).replace(/:$/, "") } : {}),
    entries: entries.map(normalizeRich).filter(Boolean)
  };
  if (entry.name) return String(entry.name);
  return null;
}

function sourceText(record) {
  const rules = [...(record.entries ?? []), ...(record.additionalEntries ?? [])].map(normalizeRich).filter(Boolean);
  return rules.length ? { rules } : undefined;
}

function normalizeProperty(property) {
  if (typeof property === "string") return parseUidName(property);
  if (property?.name) return String(property.name);
  if (property?.uid) return parseUidName(property.uid);
  if (property?.property) return parseUidName(property.property);
  return JSON.stringify(property);
}

function packContents(record) {
  return (record.packContents ?? []).map(raw => {
    const uid = typeof raw === "string" ? raw : raw.item;
    return { item: itemRef(uid), quantity: Number(typeof raw === "string" ? 1 : raw.quantity ?? 1) };
  });
}

function containerCompartments(record) {
  const groups = record.containerCapacity?.item;
  if (!Array.isArray(groups)) return undefined;
  return groups.map((group, index) => {
    const entries = Object.entries(group ?? {});
    const limits = entries.map(([, quantity]) => Number(quantity)).filter(Number.isFinite);
    const sameLimit = limits.length && limits.every(v => v === limits[0]);
    return {
      id: `${slug(record.name)}-compartment-${index + 1}`,
      ...(sameLimit ? { maxItems: limits[0] } : {}),
      acceptedItems: entries.map(([uid]) => itemRef(uid)),
      ...(!sameLimit ? { description: entries.map(([uid, qty]) => `${parseUidName(uid)}: ${qty}`).join(", ") } : {})
    };
  });
}

function inferContainerType(name) {
  const n = name.toLowerCase();
  if (n.includes("quiver")) return "quiver";
  if (n.includes("backpack")) return "backpack";
  if (n.includes("pouch")) return "pouch";
  if (n.includes("sack")) return "sack";
  if (n.includes("chest")) return "chest";
  if (n.includes("case")) return "case";
  if (/bottle|flask|jug|vial|waterskin/.test(n)) return "vessel";
  return "other";
}

function itemUses(record) {
  if (record.charges == null) return undefined;
  const recovery = [];
  if (record.recharge === "dawn") recovery.push({ period: "dawn", amount: record.rechargeAmount ? { formula: parseFormula(record.rechargeAmount) } : "all" });
  else if (record.recharge) recovery.push({ period: "special", amount: record.rechargeAmount ? { formula: parseFormula(record.rechargeAmount) } : "all" });
  return { max: Number(record.charges), recovery };
}

function commonModifiers(record, itemKind) {
  const modifiers = [];
  const add = (domain, value, predicate) => {
    const n = parseNumber(value);
    if (n == null) return;
    modifiers.push({ target: { domain }, mode: "bonus", value: { type: "constant", value: n }, ...(predicate ? { predicate } : {}) });
  };
  if (itemKind !== "armor") add("armorClass", record.bonusAc);
  add("savingThrow", record.bonusSavingThrow);
  add("attackRoll", record.bonusSpellAttack, { type: "hasTag", tags: ["spell"] });
  add("spellcasting", record.bonusSpellSaveDc, { type: "hasTag", tags: ["spellSaveDc"] });
  return modifiers.length ? modifiers : undefined;
}

function baseFields(record, itemKind) {
  const modifiers = commonModifiers(record, itemKind);
  const uses = itemUses(record);
  return {
    ...(record.weight != null ? { weight: Number(record.weight) } : {}),
    ...(record.value != null ? { price: { amount: Number(record.value), currency: "cp" } } : {}),
    ...(record.rarity && record.rarity !== "none" ? { rarity: record.rarity === "very rare" ? "veryRare" : record.rarity } : {}),
    ...(record.reqAttune ? { attunement: "required" } : {}),
    ...(record.property?.length ? { properties: record.property.map(normalizeProperty) } : {}),
    ...(uses ? { uses } : {}),
    ...(modifiers ? { modifiers } : {}),
    ...(record.entries || record.additionalEntries ? { text: sourceText(record) } : {})
  };
}

function unresolvedMechanics(record) {
  return [...MECHANICS_FIELDS].filter(key => record[key] != null && !HANDLED_MECHANICS_FIELDS.has(key));
}

function mapRecord(record, baseLookup) {
  const inherited = record.baseItem ? baseLookup.get(String(record.baseItem).toLowerCase()) : undefined;
  const r = inherited ? { ...inherited, ...record, entries: record.entries ?? inherited.entries } : record;

  if (record.packContents?.length) {
    return { itemKind: "pack", packType: record.arrow ? "ammunition" : "equipment", contents: packContents(record), unpackBehavior: "replacePack", ...baseFields(record, "pack") };
  }

  const isContainer = Boolean(record.containerCapacity) || /\b(quiver|backpack|pouch|sack|chest|case|bottle|flask|jug|vial|waterskin)\b/i.test(record.name);
  if (isContainer && !r.weapon && !r.armor && !r.dmg1 && !r.ac) {
    const cap = record.containerCapacity ?? {};
    const weight = Array.isArray(cap.weight) ? cap.weight[0] : cap.weight;
    const volume = Array.isArray(cap.volume) ? cap.volume[0] : cap.volume;
    const compartments = containerCompartments(record);
    return {
      itemKind: "container", containerType: inferContainerType(record.name),
      ...(weight != null || volume != null ? { capacity: { ...(weight != null ? { weight: Number(weight) } : {}), ...(volume != null ? { volume: Number(volume) } : {}) } } : {}),
      ...(compartments?.length ? { compartments } : {}),
      ...baseFields(record, "container")
    };
  }

  const type = String(r.type ?? "").split("|")[0];
  if (r.weapon || r.weaponCategory || r.dmg1) {
    const range = typeof r.range === "string" ? r.range.split("/").map(Number) : [];
    const reach = r.reach != null ? Number(r.reach) : undefined;
    const dmgType = DAMAGE[r.dmgType] ?? "bludgeoning";
    return {
      itemKind: "weapon",
      category: r.weaponCategory === "martial" ? "martial" : r.weaponCategory === "simple" ? "simple" : "special",
      mode: type === "R" || range.length ? "ranged" : "melee",
      damage: { base: [{ formula: String(r.dmg1 ?? "1"), damageType: dmgType }], ...(r.dmg2 ? { versatile: [{ formula: String(r.dmg2), damageType: dmgType }] } : {}) },
      ...(range.length || reach ? { range: { ...(range[0] ? { normal: range[0] } : {}), ...(range[1] ? { long: range[1] } : {}), ...(reach ? { reach } : {}), unit: "ft" } } : {}),
      ...(r.mastery?.length ? { mastery: parseUidName(r.mastery[0]) } : {}),
      ...(r.ammoType ? { ammunitionType: parseUidName(r.ammoType) } : {}),
      ...(parseNumber(record.bonusWeapon) != null ? { magicalBonus: { formula: String(parseNumber(record.bonusWeapon)) } } : {}),
      ...baseFields(record, "weapon")
    };
  }

  if (r.armor || r.ac != null || ["LA", "MA", "HA", "S"].includes(type)) {
    const category = type === "LA" ? "light" : type === "MA" ? "medium" : type === "HA" ? "heavy" : type === "S" ? "shield" : "other";
    const magicBonus = parseNumber(record.bonusAc) ?? 0;
    return {
      itemKind: "armor", category,
      armorClass: category === "shield"
        ? { base: 0, dexterity: "none", bonus: { formula: String(Number(r.ac ?? 2) + magicBonus) } }
        : { base: Number(r.ac ?? 10), dexterity: category === "light" ? "full" : category === "medium" ? "capped" : "none", ...(category === "medium" ? { dexterityCap: 2 } : {}), ...(magicBonus ? { bonus: { formula: String(magicBonus) } } : {}) },
      ...(r.strength != null ? { strengthRequirement: Number(r.strength) } : {}),
      ...(r.stealth ? { stealthDisadvantage: true } : {}),
      ...baseFields(record, "armor")
    };
  }

  if (["AT", "INS", "GS", "T"].includes(type)) return { itemKind: "tool", toolType: type, ...baseFields(record, "tool") };
  if (type === "P" || record.potion) return { itemKind: "consumable", consumableType: "potion", consumeOnUse: true, ...baseFields(record, "consumable") };
  if (type === "SC" || record.scroll) return { itemKind: "consumable", consumableType: "scroll", consumeOnUse: true, ...baseFields(record, "consumable") };
  if (type === "A" || record.arrow || record.ammo) return { itemKind: "consumable", consumableType: "ammo", ...baseFields(record, "consumable") };
  if (record.poison) return { itemKind: "consumable", consumableType: "poison", consumeOnUse: true, ...baseFields(record, "consumable") };

  return { itemKind: "equipment", equipmentType: type || (record.wondrous ? "wondrous" : "gear"), magical: Boolean(record.wondrous || record.staff || record.rod || record.reqAttune || (record.rarity && record.rarity !== "none")), ...baseFields(record, "equipment") };
}

async function load(url) {
  const response = await fetch(url, { headers: { "user-agent": "OracleRPG2-SRD-Importer" } });
  if (!response.ok) throw new Error(`${url}: ${response.status} ${response.statusText}`);
  return response.json();
}

const [baseData, itemData] = await Promise.all([load(URL_BASE), load(URL_ITEMS)]);
const allBase = baseData.baseitem ?? [];
const baseLookup = new Map();
for (const b of allBase) {
  baseLookup.set(`${b.name}|${b.source}`.toLowerCase(), b);
  baseLookup.set(b.name.toLowerCase(), b);
}

const candidates = [...allBase, ...(itemData.item ?? [])].filter(it => it.srd52 === true);
const seen = new Set();
const records = [];
const diagnostics = [];
const fieldCoverage = new Map();

for (const source of candidates) {
  const key = `${source.name}|${source.source}`;
  if (seen.has(key)) continue;
  seen.add(key);
  Object.keys(source).forEach(k => fieldCoverage.set(k, (fieldCoverage.get(k) ?? 0) + 1));
  const unresolved = unresolvedMechanics(source);
  if (unresolved.length) {
    diagnostics.push({ name: source.name, source: source.source, status: "unsupported-mechanics", fields: unresolved });
    continue;
  }
  try {
    const data = mapRecord(source, baseLookup);
    records.push({
      id: canonicalId(source.name), canonicalId: canonicalId(source.name), entityType: "item", name: source.name,
      system: { gameSystem: "dnd2024", rulesVersion: "2024" },
      source: { sourceId: "srd-5.2", book: source.source, ...(source.page != null ? { page: source.page } : {}), license: "CC-BY-4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" },
      provenance: { origin: "import", provider: "5etools", sourceKey: key, importedAt: new Date().toISOString(), adapterVersion: "0.2.0", mapperVersion: "0.2.0" },
      schemaVersion: 1, data,
      relations: data.itemKind === "pack" ? data.contents.map(c => ({ type: "contains", targetCanonicalId: c.item.canonicalId, metadata: { quantity: c.quantity } })) : [],
      metadata: { tags: ["srd-5.2", "5etools", data.itemKind] }
    });
  } catch (error) {
    diagnostics.push({ name: source.name, source: source.source, status: "mapper-error", error: error instanceof Error ? error.message : String(error) });
  }
}

records.sort((a, b) => a.name.localeCompare(b.name));
await fs.mkdir(OUT_DIR, { recursive: true });
await fs.writeFile(path.join(OUT_DIR, "items.json"), JSON.stringify({ format: "oraclerpg-compendium", version: 1, contentSource: "srd-5.2", entityType: "item", count: records.length, items: records }, null, 2) + "\n");
await fs.writeFile(path.join(OUT_DIR, "items-import-report.json"), JSON.stringify({
  generatedAt: new Date().toISOString(), upstream: [URL_BASE, URL_ITEMS], sourceCandidates: candidates.length,
  imported: records.length, skipped: diagnostics.length, diagnostics,
  fieldCoverage: Object.fromEntries([...fieldCoverage.entries()].sort((a, b) => a[0].localeCompare(b[0])))
}, null, 2) + "\n");

console.log(`SRD 5.2 items: ${records.length} imported, ${diagnostics.length} skipped for review.`);
