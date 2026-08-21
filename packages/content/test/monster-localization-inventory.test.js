import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const monstersDoc = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monsters.json"), "utf8"));
const featureDoc = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monster-features.json"), "utf8"));
const monsters = monstersDoc.items ?? [];
const featuresById = new Map((featureDoc.items ?? []).map((feature) => [feature.canonicalId, feature]));

function canonicalDescription(definition) {
  return definition?.data?.text?.description ?? definition?.data?.text?.rules?.[0] ?? "";
}

test("cluster monster localization variants", () => {
  const byDefinition = new Map();
  const byFamily = new Map();
  for (const monster of monsters) {
    for (const instance of monster.data?.features ?? []) {
      const definition = featuresById.get(instance.definition?.canonicalId);
      if (!definition) continue;
      const source = canonicalDescription(definition);
      const value = instance.text?.description ?? "";
      if (!value || !source || value === source) continue;
      const id = instance.definition.canonicalId;
      const row = byDefinition.get(id) ?? {name: definition.name, family: definition.data?.monsterTemplate?.family ?? "<none>", count: 0, values: new Set()};
      row.count += 1;
      row.values.add(value);
      byDefinition.set(id, row);
      const family = row.family;
      byFamily.set(family, (byFamily.get(family) ?? 0) + 1);
    }
  }
  console.log(`VARIANT_DEFINITION_COUNT=${byDefinition.size}`);
  console.log(`VARIANT_FAMILY_COUNTS=${JSON.stringify(Object.fromEntries([...byFamily].sort()))}`);
  console.log(`VARIANT_DEFINITION_COUNTS=${JSON.stringify(Object.fromEntries([...byDefinition].map(([id,row]) => [id,{name:row.name,family:row.family,count:row.count,unique:row.values.size}]).sort()))}`);
  for (const [id, row] of [...byDefinition].filter(([,r]) => r.values.size <= 8).sort((a,b) => b[1].count - a[1].count)) {
    console.log(`VARIANT_VALUES=${JSON.stringify({id,name:row.name,family:row.family,count:row.count,values:[...row.values]})}`);
  }
});
