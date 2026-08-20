import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/items.json"), "utf8"));

test("inventory SRD 5.2 mundane equipment presentation data", () => {
  const items = canonical.items.filter((item) => item.data?.itemKind === "equipment" && item.data?.magical === false);
  console.log(`MUNDANE_EQUIPMENT_COUNT=${items.length}`);
  for (let start = 0; start < items.length; start += 15) {
    console.log(`MUNDANE_EQUIPMENT_CHUNK_${start / 15}_BEGIN`);
    for (const item of items.slice(start, start + 15)) {
      console.log(JSON.stringify({
        canonicalId: item.canonicalId,
        name: item.name,
        equipmentType: item.data?.equipmentType,
        text: item.data?.text,
        activities: (item.data?.activities ?? []).map((activity) => ({ name: activity?.name, description: activity?.description }))
      }));
    }
    console.log(`MUNDANE_EQUIPMENT_CHUNK_${start / 15}_END`);
  }
});
