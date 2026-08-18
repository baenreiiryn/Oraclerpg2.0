import fs from "node:fs/promises";

const URLS = [
  "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/items-base.json",
  "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/items.json"
];
const ITEMS_PATH = "packages/content/data/srd-5.2/items.json";

const slug = value => String(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const itemId = name => `dnd2024:2024:item:${slug(name)}:srd-5.2`;
const vehicleId = name => `dnd2024:2024:vehicle:${slug(name)}:srd-5.2`;
const itemRef = uid => { const name = String(uid).split("|")[0]; return { canonicalId: itemId(name), name, entityType: "item" }; };
const vehicleRef = name => ({ canonicalId: vehicleId(name), name, entityType: "vehicle" });
const num = value => { const n = Number(String(value ?? "").replace(/^\+/, "")); return Number.isFinite(n) ? n : undefined; };

async function load(url) {
  const response = await fetch(url, { headers: { "user-agent": "OracleRPG2-SRD-Enricher" } });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

function movementMods(value) {
  if (!value || typeof value !== "object") return undefined;
  const out = [];
  for (const [mode, entries] of Object.entries(value)) {
    if (!entries || typeof entries !== "object") continue;
    for (const [movement, raw] of Object.entries(entries)) {
      if (mode === "equal") out.push({ movement, mode: "equal", equalTo: String(raw), unit: "ft" });
      else if (mode === "multiply") out.push({ movement, mode: "multiply", value: Number(raw), unit: "ft" });
      else if (mode === "static") out.push({ movement, mode: "set", value: Number(raw), unit: "ft" });
      else if (mode === "bonus") out.push({ movement, mode: "bonus", value: Number(raw), unit: "ft" });
    }
  }
  return out.length ? out : undefined;
}

function attunementRequirements(tags) {
  if (!Array.isArray(tags)) return undefined;
  const races = [...new Set(tags.map(x => x?.race).filter(Boolean).map(String))];
  const classes = [...new Set(tags.map(x => x?.class).filter(Boolean).map(String))];
  const requiresSpellcasting = tags.some(x => x?.spellcasting === true);
  return races.length || classes.length || requiresSpellcasting
    ? { ...(races.length ? { races } : {}), ...(classes.length ? { classes } : {}), ...(requiresSpellcasting ? { requiresSpellcasting: true } : {}) }
    : undefined;
}

function addModifier(data, domain, value, predicate) {
  const n = num(value);
  if (n == null) return;
  data.modifiers ??= [];
  if (data.modifiers.some(m => m?.target?.domain === domain && m?.value?.value === n)) return;
  data.modifiers.push({ target: { domain }, mode: "bonus", value: { type: "constant", value: n }, ...(predicate ? { predicate } : {}) });
}

function enrichContainer(data, source) {
  const cap = source.containerCapacity;
  if (!cap || data.itemKind !== "container") return;
  data.capacity ??= {};
  if (cap.volume != null) data.capacity.volumeUnit = "cubicFoot";
  if (cap.weightless === true) data.capacity.contentsWeightless = true;
  if (Array.isArray(cap.item)) {
    data.compartments = cap.item.map((group, index) => {
      const entries = Object.entries(group ?? {});
      const quantities = entries.map(([, q]) => Number(q));
      const same = quantities.length > 0 && quantities.every(q => q === quantities[0]);
      return {
        id: `${slug(source.name)}-compartment-${index + 1}`,
        ...(same ? { maxItems: quantities[0] } : {}),
        acceptedItems: entries.map(([uid]) => itemRef(uid)),
        acceptedItemLimits: entries.map(([uid, q]) => ({ item: itemRef(uid), maxQuantity: Number(q) }))
      };
    });
  }
}

const [base, items, oracle] = await Promise.all([load(URLS[0]), load(URLS[1]), fs.readFile(ITEMS_PATH, "utf8").then(JSON.parse)]);
const upstream = [...(base.baseitem ?? []), ...(items.item ?? [])].filter(x => x.srd52 === true);
const byKey = new Map(upstream.map(x => [`${x.name}|${x.source}`, x]));

for (const record of oracle.items) {
  const source = byKey.get(record.provenance?.sourceKey);
  if (!source) continue;
  const data = record.data;

  if ((source.rarity && source.rarity !== "none") || source.wondrous || source.reqAttune || source.staff || source.rod || source.potion || source.scroll) data.magical = true;
  if (source.curse === true) data.cursed = true;

  const requirements = attunementRequirements(source.reqAttuneTags);
  if (requirements) data.attunementRequirements = requirements;

  const movement = movementMods(source.modifySpeed);
  if (movement) data.movementModifications = movement;

  if (Array.isArray(source.light)) data.light = source.light.map(light => ({
    ...(light.bright != null ? { bright: Number(light.bright) } : {}),
    ...(light.dim != null ? { dim: Number(light.dim) } : {}),
    shape: light.shape === "cone" ? "cone" : "radius",
    unit: "ft"
  }));

  if (source.grantsLanguage === true) {
    data.grants ??= [];
    data.grants.push({ kind: "language", mode: "rulesText" });
  }
  if (source.grantsProficiency === true) {
    data.grants ??= [];
    data.grants.push({ kind: "proficiency", mode: "rulesText" });
  }
  if (Array.isArray(source.focus)) data.spellcastingFocusFor = source.focus.map(x => String(x).toLowerCase());

  addModifier(data, "abilityCheck", source.bonusAbilityCheck);
  addModifier(data, "proficiencyBonus", source.bonusProficiencyBonus);
  addModifier(data, "damageRoll", source.bonusWeaponDamage, { type: "hasTag", tags: ["weapon"] });

  if (data.itemKind === "consumable") {
    if (Array.isArray(source.poisonTypes)) data.poisonApplicationTypes = source.poisonTypes.map(String);
    if (source.spellScrollLevel != null) data.spellScrollLevel = Number(source.spellScrollLevel);
  }

  enrichContainer(data, source);

  const isShip = String(source.type ?? "").split("|")[0] === "SHP" || source.vehAc != null || source.seeAlsoVehicle;
  if (isShip) {
    data.itemKind = "vehiclePurchase";
    data.vehicle = vehicleRef(source.seeAlsoVehicle?.[0] ?? source.name);
    if (source.vehAc != null) data.armorClass = Number(source.vehAc);
    if (source.vehHp != null) data.hitPoints = Number(source.vehHp);
    if (source.vehDmgThresh != null) data.damageThreshold = Number(source.vehDmgThresh);
    if (source.vehSpeed != null) { data.speed = Number(source.vehSpeed); data.speedUnit = "mph"; }
    if (source.crew != null) data.crew = Number(source.crew);
    if (source.capPassenger != null) data.passengers = Number(source.capPassenger);
    if (source.capCargo != null) data.cargoCapacity = Number(source.capCargo);
    record.relations ??= [];
    if (!record.relations.some(r => r.type === "represents" && r.targetCanonicalId === data.vehicle.canonicalId)) {
      record.relations.push({ type: "represents", targetCanonicalId: data.vehicle.canonicalId });
    }
    if (record.metadata?.tags) record.metadata.tags = [...new Set([...record.metadata.tags.filter(t => t !== "equipment"), "vehiclePurchase"])];
  }

  if (source.attachedSpells && data.activities?.length) {
    const chargeActivities = data.activities.filter(a => a.costs?.some(c => c.resource === "itemCharge"));
    if (chargeActivities.length) {
      data.manualAdjudication ??= {
        required: true,
        reason: "The structured attachedSpells data identifies spell relationships and base charge costs, while the item rules text may define variable charge spending, upcasting, or additional activation constraints.",
        fallback: "promptGM"
      };
    }
  }
}

await fs.writeFile(ITEMS_PATH, JSON.stringify(oracle, null, 2) + "\n");
console.log(`Enriched ${oracle.items.length} SRD 5.2 item records.`);
