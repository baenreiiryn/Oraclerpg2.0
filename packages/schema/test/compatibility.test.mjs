import test from "node:test";
import assert from "node:assert/strict";

import {
  classCompatibilityFixtures,
  validateCanonicalContent
} from "../dist/index.js";

test("audited class compatibility fixtures validate", () => {
  for (const [type, fixture] of classCompatibilityFixtures) {
    const result = validateCanonicalContent(type, fixture);
    assert.equal(result.ok, true, `${type} fixture failed: ${JSON.stringify(result.issues)}`);
  }
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
