import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const monstersDoc = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monsters.json"), "utf8"));
const featureDoc = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monster-features.json"), "utf8"));
const monsters = monstersDoc.items ?? [];
const featuresById = new Map((featureDoc.items ?? []).map((feature) => [feature.canonicalId, feature]));

function strip(value) {
  if (typeof value === "string") return value.length > 500 ? `<string:${value.length}>` : value;
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, strip(v)]));
  return value;
}

test("inspect monster localization variants", () => {
  const examples = [];
  for (const monster of monsters) {
    for (const instance of monster.data?.features ?? []) {
      const definition = featuresById.get(instance.definition?.canonicalId);
      if (!definition) continue;
      const sourceDescription = definition.data?.text?.description ?? definition.data?.text?.rules?.[0] ?? "";
      const instanceDescription = instance.text?.description ?? "";
      if (instanceDescription && sourceDescription && instanceDescription !== sourceDescription) {
        examples.push({
          monster: monster.name,
          monsterId: monster.canonicalId,
          definitionId: instance.definition.canonicalId,
          instanceName: instance.name,
          parameters: instance.parameters,
          sourceDescription,
          instanceDescription,
          definitionMonsterTemplate: definition.data?.monsterTemplate
        });
      }
    }
  }
  console.log(`VARIANT_DESCRIPTION_COUNT=${examples.length}`);
  for (const example of examples.slice(0, 20)) console.log(`VARIANT_EXAMPLE=${JSON.stringify(strip(example))}`);
});
