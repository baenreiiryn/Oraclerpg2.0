import test from "node:test";
import assert from "node:assert/strict";

import {
  classCompatibilityFixtures,
  materializeMonsterFeature,
  validateCanonicalContent,
  validateInventoryItemInstance,
  validateMonsterFeatureDefinition,
  validateMonsterFeatureInstance
} from "../dist/index.js";

test("audited class compatibility fixtures validate", () => {
  for (const [type, fixture] of classCompatibilityFixtures) {
    const result = validateCanonicalContent(type, fixture);
    assert.equal(result.ok, true, `${type} fixture failed: ${JSON.stringify(result.issues)}`);
  }
});

test("inventory item instance keeps runtime state separate from canonical item definition", () => {
  const issues = validateInventoryItemInstance({
    id: "inventory-item-1",
    definition: { canonicalId: "dnd2024:2024:item:longsword:srd-5.2", entityType: "item" },
    quantity: 1,
    equipped: true,
    attuned: false,
    identified: true,
    containerInstanceId: "scabbard-instance-1",
    currentUses: { value: 3, max: 5 }
  });
  assert.deepEqual(issues, []);
});

test("inventory validator rejects canonical ids used as container instance ids only when blank/runtime data is malformed", () => {
  const issues = validateInventoryItemInstance({ id: "x", definition: {}, quantity: -1, containerInstanceId: "", currentUses: { value: -1 } });
  assert.ok(issues.length >= 4);
});

test("monster feature template materializes isolated breath-weapon copies", () => {
  const definition = {
    featureKind: "monsterFeature",
    category: "action",
    monsterTemplate: {
      family: "breathWeapon",
      parameters: [
        { id: "damageType", name: "Damage Type", kind: "damageType", required: true },
        { id: "damageFormula", name: "Damage", kind: "damageFormula", required: true },
        { id: "areaShape", name: "Area Shape", kind: "areaShape", required: true, allowedValues: ["cone", "line"] },
        { id: "areaSize", name: "Area Size", kind: "distance", required: true },
        { id: "saveDc", name: "Save DC", kind: "saveDc", required: true }
      ],
      bindings: [
        { parameterId: "damageType", path: "activities.0.damage.0.damageType" },
        { parameterId: "damageFormula", path: "activities.0.damage.0.formula" },
        { parameterId: "areaShape", path: "activities.0.target.area.shape" },
        { parameterId: "areaSize", path: "activities.0.target.area.size" },
        { parameterId: "saveDc", path: "activities.0.save.dc" }
      ]
    },
    activities: [{
      id: "breath",
      name: "Breath Weapon",
      kind: "save",
      target: { type: "special", area: { shape: "cone", size: { value: 15, unit: "ft" } } },
      save: { ability: "dex", dc: { type: "fixed", value: 10 }, onSuccess: "half" },
      damage: [{ damageType: "fire", formula: "1d6" }]
    }]
  };

  assert.deepEqual(validateMonsterFeatureDefinition(definition), []);

  const ref = { canonicalId: "dnd2024:feature:breath-weapon:srd-5.2", entityType: "feature", name: "Breath Weapon" };
  const fire = materializeMonsterFeature(ref, definition, "red-dragon-breath", {
    damageType: "fire",
    damageFormula: "12d6",
    areaShape: "cone",
    areaSize: { value: 60, unit: "ft" },
    saveDc: { type: "fixed", value: 21 }
  });
  const cold = materializeMonsterFeature(ref, definition, "white-dragon-breath", {
    damageType: "cold",
    damageFormula: "12d8",
    areaShape: "cone",
    areaSize: { value: 60, unit: "ft" },
    saveDc: { type: "fixed", value: 20 }
  });

  assert.deepEqual(fire.unboundParameters, []);
  assert.deepEqual(cold.unboundParameters, []);
  assert.equal(fire.instance.data.activities[0].damage[0].damageType, "fire");
  assert.equal(cold.instance.data.activities[0].damage[0].damageType, "cold");
  assert.equal(fire.instance.data.activities[0].damage[0].formula, "12d6");
  assert.equal(cold.instance.data.activities[0].damage[0].formula, "12d8");
  assert.equal(definition.activities[0].damage[0].formula, "1d6", "compendium template must stay untouched");

  fire.instance.data.activities[0].damage[0].formula = "99d99";
  assert.equal(cold.instance.data.activities[0].damage[0].formula, "12d8", "instances must not share mutable state");
  assert.equal(definition.activities[0].damage[0].formula, "1d6", "editing an embedded copy must not mutate compendium content");
  assert.deepEqual(validateMonsterFeatureInstance(fire.instance), []);
});

test("monster feature template reports missing required parameters", () => {
  const definition = {
    featureKind: "monsterFeature",
    monsterTemplate: {
      family: "naturalAttack",
      parameters: [{ id: "damageFormula", name: "Damage", kind: "damageFormula", required: true }],
      bindings: [{ parameterId: "damageFormula", path: "activities.0.damage.0.formula" }]
    },
    activities: [{ id: "bite", name: "Bite", kind: "attack", damage: [{ damageType: "piercing", formula: "1" }] }]
  };
  const result = materializeMonsterFeature(
    { canonicalId: "dnd2024:feature:bite:srd-5.2", entityType: "feature", name: "Bite" },
    definition,
    "hyena-bite"
  );
  assert.deepEqual(result.unboundParameters, ["damageFormula"]);
});

test("validator rejects unknown content type", () => {
  const result = validateCanonicalContent("unknownType", {});
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((it) => it.path === "type" && it.code === "enum"));
});

test("validator rejects invalid monster enums", () => {
  const result = validateCanonicalContent("monster", {
    creatureType: "spaceship",
    size: "colossal",
    armorClass: [],
    movement: [{ type: "teleport", speed: 30, unit: "ft" }]
  });
  assert.equal(result.ok, false);
  assert.ok(result.issues.length >= 3);
});

test("validator rejects invalid feature activity kind", () => {
  const result = validateCanonicalContent("feature", {
    featureKind: "classFeature",
    activities: [{ id: "x", name: "Broken", kind: "not-an-activity" }]
  });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((it) => it.path.endsWith(".kind")));
});

test("validator rejects malformed advanced class rules", () => {
  const result = validateCanonicalContent("class", {
    hitDie: 8,
    advancement: [],
    classRules: {
      rollDiceCosts: [{ sourceRoll: "sneakAttack", dice: null, timing: "beforeRoll" }],
      effectStackingPolicies: [{ key: "aura", policy: "impossible" }],
      createdEntityCollections: [{ collectionId: "items", entityType: "item", maximumActive: null }],
      informationReveals: [{ trigger: {}, fields: [], revealMode: "exact" }]
    }
  });
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((it) => it.path.includes("rollDiceCosts")));
  assert.ok(result.issues.some((it) => it.path.endsWith(".policy")));
  assert.ok(result.issues.some((it) => it.path.includes("createdEntityCollections")));
  assert.ok(result.issues.some((it) => it.path.endsWith(".fields")));
});
