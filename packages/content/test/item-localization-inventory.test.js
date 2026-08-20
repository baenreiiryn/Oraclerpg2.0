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

test("inventory SRD 5.2 item kinds and magic implements", () => {
  const groups = new Map();
  for (const item of canonical.items) {
    const key = `${item.data?.itemKind ?? "<none>"}|${item.data?.equipmentType ?? "<none>"}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  console.log("ITEM_TYPE_COUNTS=" + JSON.stringify(Object.fromEntries([...groups].sort())));

  const targets = canonical.items.filter((item) => {
    const kind = String(item.data?.itemKind ?? "").toLowerCase();
    const type = String(item.data?.equipmentType ?? "").toLowerCase();
    const name = String(item.name ?? "").toLowerCase();
    return [kind, type].some((value) => /ring|rod|staff|wand|focus/.test(value)) || /\b(ring|rod|staff|wand|focus)\b/.test(name);
  });
  console.log(`MAGIC_IMPLEMENT_CANDIDATE_COUNT=${targets.length}`);
  for (const item of targets) {
    console.log(JSON.stringify({
      canonicalId: item.canonicalId,
      name: item.name,
      itemKind: item.data?.itemKind,
      equipmentType: item.data?.equipmentType,
      rarity: item.data?.rarity,
      attunement: item.data?.attunement,
      strings: presentationStrings(item),
    }));
  }

  const foci = canonical.items.filter(
    (item) => item.data?.itemKind === "equipment" && item.data?.equipmentType === "SCF"
  );
  console.log(`SPELLCASTING_FOCI_COUNT=${foci.length}`);
  for (const item of foci) {
    console.log("SPELLCASTING_FOCUS=" + JSON.stringify({
      canonicalId: item.canonicalId,
      name: item.name,
      rarity: item.data?.rarity,
      attunement: item.data?.attunement,
      strings: presentationStrings(item),
    }));
  }
});
