import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/items.json"), "utf8"));

function presentationStrings(root, prefix = "", out = {}) {
  if (typeof root === "string") {
    if (isPresentationPath(prefix)) out[prefix] = root;
    return out;
  }
  if (root == null || typeof root !== "object") return out;
  if (Array.isArray(root)) {
    root.forEach((value, index) => presentationStrings(value, prefix ? `${prefix}.${index}` : String(index), out));
    return out;
  }
  for (const [key, value] of Object.entries(root)) {
    const next = prefix ? `${prefix}.${key}` : key;
    presentationStrings(value, next, out);
  }
  return out;
}

test("inventory SRD 5.2 rare wondrous item presentation strings", () => {
  const items = canonical.items.filter((item) =>
    item.data?.itemKind === "equipment" &&
    item.data?.equipmentType === "wondrous" &&
    item.data?.rarity === "rare"
  );
  console.log(`WONDROUS_RARE_COUNT=${items.length}`);
  for (let start = 0; start < items.length; start += 5) {
    console.log(`WONDROUS_RARE_CHUNK_${start / 5}_BEGIN`);
    for (const item of items.slice(start, start + 5)) {
      console.log(JSON.stringify({ canonicalId: item.canonicalId, attunement: item.data?.attunement, strings: presentationStrings(item) }));
    }
    console.log(`WONDROUS_RARE_CHUNK_${start / 5}_END`);
  }
});
