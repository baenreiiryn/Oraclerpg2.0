import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const monstersDoc = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monsters.json"), "utf8"));
const featureDoc = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monster-features.json"), "utf8"));
const monsters = monstersDoc.items ?? [];
const definitions = featureDoc.items ?? [];

function stripLongStrings(value) {
  if (typeof value === "string") return value.length > 120 ? `<string:${value.length}>` : value;
  if (Array.isArray(value)) return value.map(stripLongStrings);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, stripLongStrings(v)]));
  return value;
}

test("inspect monster feature materialization", () => {
  const first = monsters[0];
  console.log(`MONSTER_COUNT=${monsters.length}`);
  console.log(`FEATURE_DEFINITION_COUNT=${definitions.length}`);
  console.log(`FIRST_MONSTER_FEATURE_KEYS=${JSON.stringify(Object.keys(first.data.features[0]))}`);
  console.log(`FIRST_MONSTER_FEATURE=${JSON.stringify(stripLongStrings(first.data.features[0]))}`);

  const allInstances = monsters.flatMap((monster) => monster.data?.features ?? []);
  const refShapes = new Map();
  for (const instance of allInstances) {
    for (const key of Object.keys(instance)) refShapes.set(key, (refShapes.get(key) ?? 0) + 1);
  }
  console.log(`FEATURE_INSTANCE_COUNT=${allInstances.length}`);
  console.log(`FEATURE_INSTANCE_KEY_COUNTS=${JSON.stringify(Object.fromEntries([...refShapes].sort()))}`);

  const definitionIds = new Set(definitions.map((feature) => feature.canonicalId));
  const possibleRefKeys = ["canonicalId", "definitionId", "featureId", "ref", "id"];
  for (const key of possibleRefKeys) {
    const values = allInstances.map((x) => x?.[key]).filter((v) => typeof v === "string");
    if (values.length) console.log(`REF_KEY_${key}=${values.length}/${values.filter((v) => definitionIds.has(v)).length}`);
  }
});
