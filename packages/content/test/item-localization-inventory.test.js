import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/items.json"), "utf8"));

test("inventory SRD 5.2 consumables for PT-BR localization", () => {
  const items = canonical.items.filter((item) => item.data?.itemKind === "consumable");
  console.log(`CONSUMABLE_COUNT=${items.length}`);
  for (let start = 0; start < items.length; start += 10) {
    console.log(`CONSUMABLE_CHUNK_${start / 10}_BEGIN`);
    for (const item of items.slice(start, start + 10)) {
      console.log(JSON.stringify({
        canonicalId: item.canonicalId,
        name: item.name,
        consumableType: item.data?.consumableType,
        text: item.data?.text,
        activities: (item.data?.activities ?? []).map((activity) => ({
          name: activity?.name,
          description: activity?.description,
          effects: activity?.effects?.map((effect) => ({ name: effect?.name, description: effect?.description }))
        }))
      }));
    }
    console.log(`CONSUMABLE_CHUNK_${start / 10}_END`);
  }
});
