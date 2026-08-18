import fs from "node:fs/promises";

const urls = [
  "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/items-base.json",
  "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/items.json"
];

// Audit fields which either are not currently represented by the Oracle item mapper,
// or whose current representation may be lossy/ambiguous.
const fields = [
  "ability", "attachedSpells", "resist", "immune", "speed",
  "modifySpeed", "light", "poisonTypes", "reqAttune", "reqAttuneTags",
  "bonusAbilityCheck", "bonusProficiencyBonus", "bonusWeaponDamage",
  "grantsLanguage", "grantsProficiency", "spellScrollLevel", "focus",
  "carryingCapacity", "capCargo", "capPassenger", "crew", "vehAc", "vehHp",
  "vehSpeed", "vehDmgThresh", "seeAlsoVehicle", "seeAlsoDeck", "curse",
  "atomicPackContents", "containerCapacity", "packContents", "property",
  "ammoType", "mastery", "bonusAc", "bonusSavingThrow", "bonusSpellAttack",
  "bonusSpellSaveDc", "bonusWeapon", "charges", "recharge", "rechargeAmount"
];

const payloads = await Promise.all(urls.map(async url => {
  const response = await fetch(url, { headers: { "user-agent": "OracleRPG2-SRD-Field-Probe" } });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}));

const records = [...(payloads[0].baseitem ?? []), ...(payloads[1].item ?? [])].filter(it => it.srd52 === true);
const output = {};
for (const field of fields) {
  output[field] = records
    .filter(record => record[field] != null)
    .map(record => ({ name: record.name, source: record.source, type: record.type, value: record[field] }));
}
await fs.mkdir("packages/content/data/srd-5.2", { recursive: true });
await fs.writeFile("packages/content/data/srd-5.2/item-field-shapes.json", JSON.stringify(output, null, 2) + "\n");
console.log(Object.fromEntries(fields.map(field => [field, output[field].length])));
