import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/items.json"), "utf8"));

test("inventory SRD 5.2 packs and containers for PT-BR localization", () => {
  const items = canonical.items.filter((item) => ["pack", "container"].includes(item.data?.itemKind));
  console.log(`PACK_CONTAINER_COUNT=${items.length}`);
  console.log("PACK_CONTAINER_INVENTORY_BEGIN");
  for (const item of items) {
    console.log(JSON.stringify({
      canonicalId: item.canonicalId,
      name: item.name,
      itemKind: item.data?.itemKind,
      text: item.data?.text,
      contents: item.data?.contents,
      container: item.data?.container,
      activities: (item.data?.activities ?? []).map((activity) => ({ name: activity?.name, description: activity?.description }))
    }));
  }
  console.log("PACK_CONTAINER_INVENTORY_END");
});
