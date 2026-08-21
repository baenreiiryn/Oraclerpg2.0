import assert from "node:assert/strict";
import test from "node:test";
import {
  getHomebrewCreatorSubform,
  getResolvedHomebrewCreatorForm,
  listHomebrewCreatorSubforms,
} from "../src/index.js";

test("creator exposes reusable structured subforms", () => {
  const ids = new Set(listHomebrewCreatorSubforms().map((item) => item.id));
  for (const id of ["activity", "uses", "advancement", "grant", "predicate", "trigger", "effect", "damagePart", "spellRange", "containerCompartment"]) {
    assert.ok(ids.has(id as never), `missing subform ${id}`);
  }
});

test("activity subform composes nested mechanical editors", () => {
  const activity = getHomebrewCreatorSubform("activity");
  const byPath = new Map(activity.fields.map((field) => [field.path, field]));
  assert.equal(byPath.get("damage")?.kind, "subformCollection");
  assert.equal(byPath.get("damage")?.subformId, "damagePart");
  assert.equal(byPath.get("uses")?.subformId, "uses");
  assert.equal(byPath.get("effects")?.subformId, "effect");
  assert.equal(byPath.get("triggers")?.subformId, "trigger");
});

test("resolved spell form replaces complex JSON fields with subforms", () => {
  const spell = getResolvedHomebrewCreatorForm("spell");
  const fields = spell.sections.flatMap((section) => section.fields);
  const byPath = new Map(fields.map((field) => [field.path, field]));
  assert.equal(byPath.get("castingTimes")?.subformId, "spellCastingTime");
  assert.equal(byPath.get("range")?.subformId, "spellRange");
  assert.equal(byPath.get("durations")?.subformId, "spellDuration");
  assert.equal(byPath.get("components")?.subformId, "spellComponents");
  assert.equal(byPath.get("activities")?.subformId, "activity");
});

test("resolved class form uses advancement and grant editors", () => {
  const klass = getResolvedHomebrewCreatorForm("class");
  const fields = klass.sections.flatMap((section) => section.fields);
  const byPath = new Map(fields.map((field) => [field.path, field]));
  assert.equal(byPath.get("advancement")?.kind, "subformCollection");
  assert.equal(byPath.get("advancement")?.subformId, "advancement");
  assert.equal(byPath.get("startingEquipment")?.subformId, "grant");
});

test("resolved item form uses structured item mechanics editors", () => {
  const item = getResolvedHomebrewCreatorForm("item");
  const fields = item.sections.flatMap((section) => section.fields);
  const find = (path: string) => fields.find((field) => field.path === path);
  assert.equal(find("weight")?.subformId, "weight");
  assert.equal(find("price")?.subformId, "price");
  assert.equal(find("uses")?.subformId, "uses");
  assert.equal(find("activities")?.subformId, "activity");
  assert.equal(find("compartments")?.subformId, "containerCompartment");
});

test("resolved monster and vehicle forms expose action and station editors", () => {
  const monster = getResolvedHomebrewCreatorForm("monster");
  const monsterFields = monster.sections.flatMap((section) => section.fields);
  assert.equal(monsterFields.find((field) => field.path === "actions")?.subformId, "activity");
  assert.equal(monsterFields.find((field) => field.path === "armorClass")?.subformId, "monsterArmorClass");
  assert.equal(monsterFields.find((field) => field.path === "movement")?.subformId, "monsterMovement");

  const vehicle = getResolvedHomebrewCreatorForm("vehicle");
  const vehicleFields = vehicle.sections.flatMap((section) => section.fields);
  assert.equal(vehicleFields.find((field) => field.path === "stations")?.subformId, "vehicleStation");
  assert.equal(vehicleFields.find((field) => field.path === "activities")?.subformId, "activity");
});
