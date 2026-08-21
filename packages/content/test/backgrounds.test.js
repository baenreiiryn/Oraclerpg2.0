import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const doc = JSON.parse(fs.readFileSync(path.resolve(here, "../data/srd-5.2/backgrounds.json"), "utf8"));

test("SRD 5.2 backgrounds expose the four canonical origins and their creation choices", () => {
  assert.equal(doc.entityType, "background");
  assert.equal(doc.count, 4);
  assert.deepEqual(doc.items.map((item) => item.name), ["Acolyte", "Criminal", "Sage", "Soldier"]);
  assert.equal(new Set(doc.items.map((item) => item.canonicalId)).size, 4);

  const byName = new Map(doc.items.map((item) => [item.name, item]));
  const expected = {
    Acolyte: { abilities: ["int", "wis", "cha"], skills: ["insight", "religion"], feat: "feat-magic-initiate" },
    Criminal: { abilities: ["dex", "con", "int"], skills: ["sleight of hand", "stealth"], feat: "feat-alert" },
    Sage: { abilities: ["con", "int", "wis"], skills: ["arcana", "history"], feat: "feat-magic-initiate" },
    Soldier: { abilities: ["str", "dex", "con"], skills: ["athletics", "intimidation"], feat: "feat-savage-attacker" }
  };

  for (const [name, values] of Object.entries(expected)) {
    const background = byName.get(name);
    assert.ok(background, `${name} missing`);
    assert.deepEqual(background.data.abilityScoreOptions.options, values.abilities);
    assert.deepEqual(background.data.skillProficiencies, values.skills);
    assert.match(background.data.originFeat.canonicalId, new RegExp(`:${values.feat}:srd-5\\.2$`));
    assert.deepEqual(background.data.equipmentBundles.map((bundle) => bundle.id), ["A", "B"]);
    assert.equal(background.data.equipmentBundles[1].grants[0].currency.amount, 50);
  }

  const soldier = byName.get("Soldier");
  const gamingSet = soldier.data.choices.find((choice) => choice.id === "gaming-set");
  assert.deepEqual(gamingSet.choice.options, ["dice", "dragonchess", "playing-cards", "three-dragon-ante"]);

  const acolyte = byName.get("Acolyte");
  const acolyteSpellList = acolyte.data.choices.find((choice) => choice.id === "magic-initiate-spell-list");
  assert.deepEqual(acolyteSpellList.choice.options, ["cleric"]);

  const sage = byName.get("Sage");
  const sageSpellList = sage.data.choices.find((choice) => choice.id === "magic-initiate-spell-list");
  assert.deepEqual(sageSpellList.choice.options, ["wizard"]);
});
