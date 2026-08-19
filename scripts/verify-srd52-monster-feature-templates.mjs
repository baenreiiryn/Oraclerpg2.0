import fs from "node:fs/promises";
import assert from "node:assert/strict";
import {
  materializeMonsterFeature,
  validateCanonicalContent,
  validateMonsterFeatureDefinition,
  validateMonsterFeatureInstance
} from "../packages/schema/dist/index.js";

const FILE = "packages/content/data/srd-5.2/monster-features.json";
const compendium = JSON.parse(await fs.readFile(FILE, "utf8"));
assert.equal(compendium.entityType, "feature");
assert.equal(compendium.count, compendium.items.length);
assert.ok(compendium.items.length >= 8);

for (const record of compendium.items) {
  const canonical = validateCanonicalContent("feature", record.data);
  assert.equal(canonical.ok, true, `${record.name}: ${JSON.stringify(canonical.issues)}`);
  const templateIssues = validateMonsterFeatureDefinition(record.data);
  assert.deepEqual(templateIssues, [], `${record.name}: ${JSON.stringify(templateIssues)}`);
}

const byName = new Map(compendium.items.map((item) => [item.name, item]));
const breath = byName.get("Draconic Breath Weapon");
const bite = byName.get("Bite");
const multiattack = byName.get("Multiattack");
assert.ok(breath && bite && multiattack);

const refOf = (record) => ({ canonicalId: record.canonicalId, entityType: "feature", name: record.name });

const brass = materializeMonsterFeature(refOf(breath), breath.data, "adult-brass-dragon-fire-breath", {
  damageType: "fire",
  damageFormula: "10d8",
  areaShape: "line",
  areaLength: { value: 60, unit: "ft" },
  areaWidth: { value: 5, unit: "ft" },
  saveAbility: "dex",
  saveDc: 18,
  rechargeMin: 5,
  rechargeMax: 6
}).instance;
assert.deepEqual(validateMonsterFeatureInstance(brass), []);
assert.equal(brass.data.activities[0].target.area.shape, "line");
assert.deepEqual(brass.data.activities[0].target.area.length, { value: 60, unit: "ft" });
assert.deepEqual(brass.data.activities[0].target.area.width, { value: 5, unit: "ft" });
assert.equal(brass.data.activities[0].damage[0].damageType, "fire");
assert.equal(brass.data.activities[0].damage[0].formula, "10d8");
assert.equal(brass.data.activities[0].save.ability, "dex");
assert.equal(brass.data.activities[0].save.dc.value, 18);
assert.deepEqual(brass.data.activities[0].recharge, {
  timing: "turnStart", roll: { formula: "1d6" }, success: { min: 5, max: 6 }, restores: "all"
});

const gold = materializeMonsterFeature(refOf(breath), breath.data, "adult-gold-dragon-fire-breath", {
  damageType: "fire",
  damageFormula: "12d10",
  areaShape: "cone",
  areaSize: { value: 60, unit: "ft" },
  saveAbility: "dex",
  saveDc: 21
}).instance;
assert.equal(gold.data.activities[0].target.area.shape, "cone");
assert.deepEqual(gold.data.activities[0].target.area.size, { value: 60, unit: "ft" });
assert.equal(gold.data.activities[0].damage[0].formula, "12d10");
assert.equal(gold.data.activities[0].save.dc.value, 21);

const hyena = materializeMonsterFeature(refOf(bite), bite.data, "hyena-bite", {
  attackBonus: "+2",
  reach: 5,
  damageFormula: "1d6",
  damageType: "piercing"
}).instance;
assert.equal(hyena.data.activities[0].attack.bonus.formula, "+2");
assert.equal(hyena.data.activities[0].range.reach.value, 5);
assert.equal(hyena.data.activities[0].damage[0].formula, "1d6");
assert.equal(hyena.data.activities[0].damage[0].damageType, "piercing");

// Actor-owned copies are snapshots: mutate one without touching another instance or the compendium definition.
brass.data.activities[0].damage[0].formula = "99d99";
assert.equal(gold.data.activities[0].damage[0].formula, "12d10");
assert.equal(breath.data.activities[0].damage[0].formula, "1d6");

const mammothMultiattack = materializeMonsterFeature(refOf(multiattack), multiattack.data, "mammoth-multiattack").instance;
mammothMultiattack.data.activities[0].multiattack.sequence.push({ activityId: "gore", count: 2 });
assert.deepEqual(mammothMultiattack.data.activities[0].multiattack.sequence, [{ activityId: "gore", count: 2 }]);
assert.deepEqual(multiattack.data.activities[0].multiattack.sequence, []);

console.log(JSON.stringify({
  status: "SUPPORTED",
  templateCount: compendium.items.length,
  regressions: ["Hyena Bite", "Adult Brass Dragon Fire Breath", "Adult Gold Dragon Fire Breath", "Mammoth Multiattack"],
  copyIsolation: true,
  recharge: "5-6 on 1d6 at turn start"
}, null, 2));
