import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/items.json"), "utf8"));

test("inventory SRD 5.2 equipment structure for PT-BR localization", () => {
  const items = canonical.items.filter((item) => item.data?.itemKind === "equipment");
  const distributions = {};
  for (const item of items) {
    const key = JSON.stringify({
      equipmentType: item.data?.equipmentType ?? null,
      rarity: item.data?.rarity ?? null,
      attunement: item.data?.attunement ?? null,
      magical: item.data?.magical ?? item.data?.magic ?? null
    });
    distributions[key] = (distributions[key] ?? 0) + 1;
  }
  console.log(`EQUIPMENT_COUNT=${items.length}`);
  console.log(`EQUIPMENT_DISTRIBUTIONS=${JSON.stringify(distributions)}`);
  console.log("EQUIPMENT_NAME_MAP_BEGIN");
  for (const item of items) {
    console.log(JSON.stringify({
      canonicalId: item.canonicalId,
      name: item.name,
      equipmentType: item.data?.equipmentType,
      rarity: item.data?.rarity,
      attunement: item.data?.attunement,
      magical: item.data?.magical ?? item.data?.magic,
      hasText: Boolean(item.data?.text?.rules?.length),
      activities: (item.data?.activities ?? []).length,
      tags: item.data?.tags
    }));
  }
  console.log("EQUIPMENT_NAME_MAP_END");
});
