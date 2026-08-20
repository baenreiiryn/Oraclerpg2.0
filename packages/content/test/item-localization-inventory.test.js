import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/items.json"), "utf8"));
const localeDir = path.join(here, "../locales/pt-BR/srd-5.2");
const localizedFiles = [
  "items-weapons.json",
  "items-armor.json",
  "items-tools.json",
  "items-packs-containers.json",
  "items-mounts.json"
];
const localizedIds = new Set();
for (const file of localizedFiles) {
  const catalog = JSON.parse(fs.readFileSync(path.join(localeDir, file), "utf8"));
  for (const id of Object.keys(catalog.entries)) localizedIds.add(id);
}

test("inventory remaining SRD 5.2 item shapes and transport candidates", () => {
  const remaining = canonical.items.filter((item) => !localizedIds.has(item.canonicalId));
  const shapes = {};
  for (const item of remaining) {
    const shape = JSON.stringify({
      itemKind: item.data?.itemKind ?? null,
      category: item.data?.category ?? null,
      type: item.data?.type ?? null,
      subtype: item.data?.subtype ?? null
    });
    shapes[shape] = (shapes[shape] ?? 0) + 1;
  }

  console.log(`LOCALIZED_ITEM_COUNT=${localizedIds.size}`);
  console.log(`REMAINING_ITEM_COUNT=${remaining.length}`);
  console.log(`REMAINING_SHAPES=${JSON.stringify(shapes)}`);
  console.log("TRANSPORT_CANDIDATES_BEGIN");
  for (const item of remaining) {
    if (/cart|carriage|chariot|boat|ship|wagon|sled|galley|keelboat|longship|rowboat|sailing/i.test(item.name)) {
      console.log(JSON.stringify({
        canonicalId: item.canonicalId,
        name: item.name,
        itemKind: item.data?.itemKind,
        category: item.data?.category,
        type: item.data?.type,
        subtype: item.data?.subtype,
        dataKeys: Object.keys(item.data ?? {})
      }));
    }
  }
  console.log("TRANSPORT_CANDIDATES_END");
});
