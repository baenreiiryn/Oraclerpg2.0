import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/items.json"), "utf8"));

test("inventory SRD 5.2 weapons for PT-BR localization", () => {
  const items = (canonical.items ?? []).filter((item) => item.data?.itemKind === "weapon");
  console.log(`WEAPON_COUNT=${items.length}`);
  console.log("WEAPON_INVENTORY_BEGIN");
  for (const item of items) {
    console.log(JSON.stringify({
      canonicalId: item.canonicalId,
      name: item.name,
      text: item.data?.text,
      activities: (item.data?.activities ?? []).map((activity) => ({
        name: activity?.name,
        description: activity?.description,
        effects: activity?.effects?.map((effect) => ({ name: effect?.name, description: effect?.description }))
      }))
    }));
  }
  console.log("WEAPON_INVENTORY_END");
});
