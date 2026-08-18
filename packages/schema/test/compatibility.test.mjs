import test from "node:test";
import assert from "node:assert/strict";

import {
  classCompatibilityFixtures,
  validateCanonicalContent,
  validateInventoryItemInstance
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
