import fs from "node:fs/promises";

const URLS = [
  "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/items-base.json",
  "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/items.json"
];
const ITEMS_PATH = "packages/content/data/srd-5.2/items.json";
const REPORT_PATH = "packages/content/data/srd-5.2/items-coverage-audit.json";

async function load(url) {
  const response = await fetch(url, { headers: { "user-agent": "OracleRPG2-SRD-Coverage-Audit" } });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

const [base, items, oracle] = await Promise.all([load(URLS[0]), load(URLS[1]), fs.readFile(ITEMS_PATH, "utf8").then(JSON.parse)]);
const upstream = [...(base.baseitem ?? []), ...(items.item ?? [])].filter(x => x.srd52 === true);
const byKey = new Map(oracle.items.map(x => [x.provenance?.sourceKey, x]));
const issues = [];
const coverage = {};

function mark(field, ok, source, detail) {
  coverage[field] ??= { checked: 0, passed: 0, failed: 0 };
  coverage[field].checked++;
  if (ok) coverage[field].passed++;
  else {
    coverage[field].failed++;
    issues.push({ name: source.name, source: source.source, field, detail });
  }
}
const hasModifier = (data, domain, expected) => (data.modifiers ?? []).some(m => m?.target?.domain === domain && (expected == null || Number(m?.value?.value) === Number(expected)));
const attachedSpellCount = value => {
  if (!value) return 0;
  if (Array.isArray(value)) return value.length;
  let n = 0;
  for (const v of Object.values(value)) {
    if (Array.isArray(v)) n += v.length;
    else if (v && typeof v === "object") for (const spells of Object.values(v)) if (Array.isArray(spells)) n += spells.length;
  }
  return n;
};

for (const source of upstream) {
  const key = `${source.name}|${source.source}`;
  const record = byKey.get(key);
  if (!record) { issues.push({ name: source.name, source: source.source, field: "record", detail: "Missing Oracle record" }); continue; }
  const data = record.data;

  if ((source.rarity && source.rarity !== "none") || source.wondrous || source.reqAttune || source.staff || source.rod || source.potion || source.scroll)
    mark("magical", data.magical === true, source, "Magical item is not marked magical");
  if (source.curse === true) mark("curse", data.cursed === true, source, "Curse marker missing");
  if (source.reqAttuneTags) mark("reqAttuneTags", !!data.attunementRequirements, source, "Structured attunement requirements missing");
  if (source.modifySpeed) mark("modifySpeed", Array.isArray(data.movementModifications) && data.movementModifications.length > 0, source, "Movement modification missing");
  if (source.light) mark("light", Array.isArray(data.light) && data.light.length === source.light.length, source, "Light emission missing/incomplete");
  if (source.poisonTypes) mark("poisonTypes", Array.isArray(data.poisonApplicationTypes) && data.poisonApplicationTypes.length === source.poisonTypes.length, source, "Poison application type missing");
  if (source.spellScrollLevel != null) mark("spellScrollLevel", data.spellScrollLevel === Number(source.spellScrollLevel), source, "Spell scroll level missing");
  if (source.focus) mark("focus", Array.isArray(data.spellcastingFocusFor) && data.spellcastingFocusFor.length === source.focus.length, source, "Spellcasting focus class data missing");
  if (source.grantsLanguage === true) mark("grantsLanguage", (data.grants ?? []).some(g => g.kind === "language"), source, "Language grant marker missing");
  if (source.grantsProficiency === true) mark("grantsProficiency", (data.grants ?? []).some(g => g.kind === "proficiency"), source, "Proficiency grant marker missing");
  if (source.bonusAbilityCheck != null) mark("bonusAbilityCheck", hasModifier(data, "abilityCheck", source.bonusAbilityCheck), source, "Ability-check bonus missing");
  if (source.bonusProficiencyBonus != null) mark("bonusProficiencyBonus", hasModifier(data, "proficiencyBonus", source.bonusProficiencyBonus), source, "Proficiency-bonus modifier missing");
  if (source.bonusWeaponDamage != null) mark("bonusWeaponDamage", hasModifier(data, "damageRoll", source.bonusWeaponDamage), source, "Weapon-damage bonus missing");

  if (source.ability) mark("ability", Array.isArray(data.abilityAdjustments) && data.abilityAdjustments.length > 0, source, "Ability adjustment missing");
  if (source.resist) mark("resist", Array.isArray(data.damageResistances) && data.damageResistances.length > 0, source, "Damage resistance missing");
  if (source.immune) mark("immune", Array.isArray(data.damageImmunities) && data.damageImmunities.length > 0, source, "Damage immunity missing");
  if (source.attachedSpells) mark("attachedSpells", (data.activities ?? []).filter(a => a.invocation?.entity).length >= attachedSpellCount(source.attachedSpells), source, "Attached spell relationships missing");
  if (source.charges != null) mark("charges", !!data.uses, source, "Charge resource missing");
  if (source.packContents) mark("packContents", data.itemKind === "pack" && Array.isArray(data.contents) && data.contents.length === source.packContents.length, source, "Pack contents missing/incomplete");

  if (source.containerCapacity) {
    mark("containerCapacity", (data.itemKind === "container" && !!data.capacity) || Array.isArray(data.compartments), source, "Container capacity missing");
    if (source.containerCapacity.volume != null) mark("containerVolumeUnit", data.capacity?.volumeUnit === "cubicFoot", source, "Container volume lacks unit");
    if (source.containerCapacity.weightless === true) mark("containerWeightless", data.capacity?.contentsWeightless === true, source, "Weightless container rule missing");
    if (Array.isArray(source.containerCapacity.item)) {
      const expected = source.containerCapacity.item.reduce((n, g) => n + Object.keys(g ?? {}).length, 0);
      const actual = (data.compartments ?? []).reduce((n, c) => n + (c.acceptedItemLimits?.length ?? 0), 0);
      mark("containerItemLimits", actual === expected, source, `Expected ${expected} per-item limits, got ${actual}`);
    }
  }

  const isShip = String(source.type ?? "").split("|")[0] === "SHP" || source.vehAc != null || source.seeAlsoVehicle;
  if (isShip) {
    mark("vehiclePurchase", data.itemKind === "vehiclePurchase" && !!data.vehicle && data.equipmentType == null, source, "Vehicle purchase/reference missing or retains incompatible equipment fields");
    if (source.vehAc != null) mark("vehAc", data.armorClass === Number(source.vehAc), source, "Vehicle AC missing");
    if (source.vehHp != null) mark("vehHp", data.hitPoints === Number(source.vehHp), source, "Vehicle HP missing");
    if (source.vehDmgThresh != null) mark("vehDmgThresh", data.damageThreshold === Number(source.vehDmgThresh), source, "Vehicle damage threshold missing");
    if (source.vehSpeed != null) mark("vehSpeed", data.speed === Number(source.vehSpeed), source, "Vehicle speed missing");
    if (source.crew != null) mark("crew", data.crew === Number(source.crew), source, "Vehicle crew missing");
    if (source.capPassenger != null) mark("capPassenger", data.passengers === Number(source.capPassenger), source, "Passenger capacity missing");
    if (source.capCargo != null) mark("capCargo", data.cargoCapacity === Number(source.capCargo), source, "Cargo capacity missing");
  }

  const unexpectedZero = (data.modifiers ?? []).filter(m => {
    const domain = m?.target?.domain;
    if (!["abilityCheck", "proficiencyBonus", "damageRoll"].includes(domain)) return false;
    if (Number(m?.value?.value) !== 0) return false;
    if (domain === "abilityCheck") return source.bonusAbilityCheck == null;
    if (domain === "proficiencyBonus") return source.bonusProficiencyBonus == null;
    return source.bonusWeaponDamage == null;
  });
  if (unexpectedZero.length) issues.push({ name: source.name, source: source.source, field: "spuriousModifier", detail: "Generated zero-value modifier without an upstream mechanic" });
}

const report = {
  generatedAt: new Date().toISOString(),
  upstreamCount: upstream.length,
  oracleCount: oracle.items.length,
  issueCount: issues.length,
  status: issues.length ? "partial" : "supported",
  coverage,
  issues
};
await fs.writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + "\n");
console.log(`SRD item structural coverage: ${issues.length ? "PARTIAL" : "SUPPORTED"} (${issues.length} issues).`);
if (issues.length) process.exitCode = 1;
