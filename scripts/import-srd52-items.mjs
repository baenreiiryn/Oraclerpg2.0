import fs from "node:fs/promises";
import path from "node:path";

const URL_BASE = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/items-base.json";
const URL_ITEMS = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/items.json";
const OUT_DIR = "packages/content/data/srd-5.2";

const DAMAGE = {
  A: "acid", B: "bludgeoning", C: "cold", F: "fire", O: "force", L: "lightning", N: "necrotic",
  P: "piercing", I: "poison", Y: "psychic", R: "radiant", S: "slashing", T: "thunder"
};

const slug = value => String(value)
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "");

const canonicalId = name => `dnd2024:2024:item:${slug(name)}:srd-5.2`;
const parseUidName = uid => String(uid).split("|")[0].trim();
const parseNumber = value => {
  if (value == null) return undefined;
  const n = Number(String(value).replace(/^\+/, ""));
  return Number.isFinite(n) ? n : undefined;
};

function normalizeRich(entry) {
  if (entry == null) return null;
  if (typeof entry === "string") return entry;
  if (typeof entry === "number" || typeof entry === "boolean") return String(entry);
  if (Array.isArray(entry)) {
    const items = entry.map(normalizeRich).filter(Boolean);
    return { type: "list", items };
  }

  const entries = entry.entries ?? entry.items;
  if (entry.type === "table") {
    return {
      type: "table",
      ...(entry.caption ? { caption: String(entry.caption) } : {}),
      columns: (entry.colLabels ?? []).map(String),
      rows: entry.rows ?? []
    };
  }
  if (entry.type === "list") {
    return { type: "list", items: (entry.items ?? []).map(normalizeRich).filter(Boolean) };
  }
  if (Array.isArray(entries)) {
    return {
      type: "entries",
      ...(entry.name ? { name: String(entry.name).replace(/:$/, "") } : {}),
      entries: entries.map(normalizeRich).filter(Boolean)
    };
  }
  if (entry.name) return String(entry.name);
  return null;
}

function sourceText(record) {
  const rules = [...(record.entries ?? []), ...(record.additionalEntries ?? [])]
    .map(normalizeRich)
    .filter(Boolean);
  return rules.length ? { rules } : undefined;
}

function packContents(record) {
  return (record.packContents ?? []).map(it => ({
    item: { canonicalId: canonicalId(parseUidName(it.item)), name: parseUidName(it.item), entityType: "item" },
    quantity: Number(it.quantity ?? 1)
  }));
}

function inferContainerType(name) {
  const n = name.toLowerCase();
  if (n.includes("quiver")) return "quiver";
  if (n.includes("backpack")) return "backpack";
  if (n.includes("pouch")) return "pouch";
  if (n.includes("sack")) return "sack";
  if (n.includes("chest")) return "chest";
  if (n.includes("case")) return "case";
  if (n.includes("bottle") || n.includes("flask") || n.includes("jug") || n.includes("vial") || n.includes("waterskin")) return "vessel";
  return "other";
}

function baseFields(record) {
  return {
    ...(record.weight != null ? { weight: Number(record.weight) } : {}),
    ...(record.value != null ? { price: { amount: Number(record.value), currency: "cp" } } : {}),
    ...(record.rarity && record.rarity !== "none" ? { rarity: record.rarity === "very rare" ? "veryRare" : record.rarity } : {}),
    ...(record.reqAttune ? { attunement: "required" } : {}),
    ...(record.property?.length ? { properties: record.property.map(String) } : {}),
    ...(record.entries || record.additionalEntries ? { text: sourceText(record) } : {})
  };
}

function mapRecord(record, baseLookup) {
  const inherited = record.baseItem ? baseLookup.get(String(record.baseItem).toLowerCase()) : undefined;
  const r = inherited ? { ...inherited, ...record, entries: record.entries ?? inherited.entries } : record;
  const common = baseFields(record);

  if (record.packContents?.length) {
    return { itemKind: "pack", packType: record.arrow ? "ammunition" : "equipment", contents: packContents(record), unpackBehavior: "replacePack", ...common };
  }

  const nameLower = record.name.toLowerCase();
  const isContainer = Boolean(record.containerCapacity) || /\b(quiver|backpack|pouch|sack|chest|case|bottle|flask|jug|vial|waterskin)\b/i.test(record.name);
  if (isContainer && !r.weapon && !r.armor && !r.dmg1 && !r.ac) {
    const cap = record.containerCapacity ?? {};
    const weight = Array.isArray(cap.weight) ? cap.weight[0] : cap.weight;
    const volume = Array.isArray(cap.volume) ? cap.volume[0] : cap.volume;
    return {
      itemKind: "container",
      containerType: inferContainerType(record.name),
      ...(weight != null || volume != null ? { capacity: { ...(weight != null ? { weight: Number(weight) } : {}), ...(volume != null ? { volume: Number(volume) } : {}) } } : {}),
      ...common
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
      damage: {
        base: [{ formula: String(r.dmg1 ?? "1"), damageType: dmgType }],
        ...(r.dmg2 ? { versatile: [{ formula: String(r.dmg2), damageType: dmgType }] } : {})
      },
      ...(range.length || reach ? { range: { ...(range[0] ? { normal: range[0] } : {}), ...(range[1] ? { long: range[1] } : {}), ...(reach ? { reach } : {}), unit: "ft" } } : {}),
      ...(r.mastery?.length ? { mastery: parseUidName(r.mastery[0]) } : {}),
      ...(r.ammoType ? { ammunitionType: parseUidName(r.ammoType) } : {}),
      ...(parseNumber(record.bonusWeapon) != null ? { magicalBonus: { formula: String(parseNumber(record.bonusWeapon)) } } : {}),
      ...common
    };
  }

  if (r.armor || r.ac != null || ["LA", "MA", "HA", "S"].includes(type)) {
    const category = type === "LA" ? "light" : type === "MA" ? "medium" : type === "HA" ? "heavy" : type === "S" ? "shield" : "other";
    return {
      itemKind: "armor",
      category,
      armorClass: {
        base: Number(r.ac ?? 10),
        dexterity: category === "light" ? "full" : category === "medium" ? "capped" : "none",
        ...(category === "medium" ? { dexterityCap: 2 } : {}),
        ...(parseNumber(record.bonusAc) != null ? { bonus: { formula: String(parseNumber(record.bonusAc)) } } : {})
      },
      ...(r.strength != null ? { strengthRequirement: Number(r.strength) } : {}),
      ...(r.stealth ? { stealthDisadvantage: true } : {}),
      ...common
    };
  }

  if (["AT", "INS", "GS", "T"].includes(type)) {
    return { itemKind: "tool", toolType: type, ...common };
  }

  if (type === "P" || record.potion) return { itemKind: "consumable", consumableType: "potion", consumeOnUse: true, ...common };
  if (type === "SC" || record.scroll) return { itemKind: "consumable", consumableType: "scroll", consumeOnUse: true, ...common };
  if (type === "A" || record.arrow || record.ammo) return { itemKind: "consumable", consumableType: "ammo", ...common };
  if (record.poison) return { itemKind: "consumable", consumableType: "poison", consumeOnUse: true, ...common };

  return { itemKind: "equipment", equipmentType: type || (record.wondrous ? "wondrous" : "gear"), magical: Boolean(record.wondrous || record.staff || record.rod || record.reqAttune || record.rarity !== "none"), ...common };
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

for (const source of candidates) {
  const key = `${source.name}|${source.source}`;
  if (seen.has(key)) continue;
  seen.add(key);
  try {
    const data = mapRecord(source, baseLookup);
    records.push({
      id: canonicalId(source.name),
      canonicalId: canonicalId(source.name),
      entityType: "item",
      name: source.name,
      system: { gameSystem: "dnd2024", rulesVersion: "2024" },
      source: {
        sourceId: "srd-5.2",
        book: source.source,
        ...(source.page != null ? { page: source.page } : {}),
        license: "CC-BY-4.0",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/"
      },
      provenance: {
        origin: "import",
        provider: "5etools",
        sourceKey: key,
        importedAt: new Date().toISOString(),
        adapterVersion: "0.1.0",
        mapperVersion: "0.1.0"
      },
      schemaVersion: 1,
      data,
      relations: data.itemKind === "pack" ? data.contents.map(c => ({ type: "contains", targetCanonicalId: c.item.canonicalId, metadata: { quantity: c.quantity } })) : [],
      metadata: { tags: ["srd-5.2", "5etools", data.itemKind] }
    });
  } catch (error) {
    diagnostics.push({ name: source.name, source: source.source, error: error instanceof Error ? error.message : String(error) });
  }
}

records.sort((a, b) => a.name.localeCompare(b.name));
await fs.mkdir(OUT_DIR, { recursive: true });
await fs.writeFile(path.join(OUT_DIR, "items.json"), JSON.stringify({ format: "oraclerpg-compendium", version: 1, contentSource: "srd-5.2", entityType: "item", count: records.length, items: records }, null, 2) + "\n");
await fs.writeFile(path.join(OUT_DIR, "items-import-report.json"), JSON.stringify({ generatedAt: new Date().toISOString(), upstream: [URL_BASE, URL_ITEMS], sourceCandidates: candidates.length, imported: records.length, failed: diagnostics.length, diagnostics }, null, 2) + "\n");

console.log(`SRD 5.2 items: ${records.length} imported, ${diagnostics.length} failed.`);
if (diagnostics.length) process.exitCode = 2;
