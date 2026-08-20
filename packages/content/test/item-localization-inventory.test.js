import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/items.json"), "utf8"));

function classify(item) {
  return item.data?.itemKind ?? item.data?.category ?? item.data?.type ?? "unknown";
}

test("inventory SRD 5.2 items for PT-BR localization", () => {
  const items = canonical.items ?? [];
  const counts = {};
  for (const item of items) counts[classify(item)] = (counts[classify(item)] ?? 0) + 1;

  console.log(`ITEM_COUNT=${items.length}`);
  console.log(`ITEM_KIND_COUNTS=${JSON.stringify(counts)}`);
  console.log("ITEM_LIST_BEGIN");
  for (const item of items) {
    console.log(JSON.stringify({
      canonicalId: item.canonicalId,
      name: item.name,
      itemKind: classify(item),
      dataKeys: Object.keys(item.data ?? {}),
      hasText: Boolean(item.data?.text),
      activities: (item.data?.activities ?? []).length,
      contents: (item.data?.contents ?? item.data?.container?.contents ?? []).length
    }));
  }
  console.log("ITEM_LIST_END");
});
