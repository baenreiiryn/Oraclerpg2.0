import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/items.json"), "utf8"));
const rings = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/items-rings.json"), "utf8"));
const rods = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/items-rods.json"), "utf8"));
const wands = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/items-wands.json"), "utf8"));
const mundane = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/items-equipment-mundane.json"), "utf8"));
const magicFoci = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/items-spellcasting-foci-magic.json"), "utf8"));

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

function isProtectedOrStructural(pathKey, value) {
  if (pathKey.endsWith(".invocation.entity.name")) return true;
  if (/^\{#itemEntry [^}]+\}$/.test(value)) return true;
  return false;
}

test("inventory remaining untranslated presentation strings in rings rods wands and foci", () => {
  const groups = new Map();
  for (const item of canonical.items) {
    const key = `${item.data?.itemKind ?? "<none>"}|${item.data?.equipmentType ?? "<none>"}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  console.log("ITEM_TYPE_COUNTS=" + JSON.stringify(Object.fromEntries([...groups].sort())));

  const targets = canonical.items.filter((item) =>
    item.data?.itemKind === "equipment" && ["RG", "RD", "WD", "SCF"].includes(item.data?.equipmentType)
  );
  let missingCount = 0;
  for (const item of targets) {
    const catalog = item.data?.equipmentType === "RG" ? rings
      : item.data?.equipmentType === "RD" ? rods
      : item.data?.equipmentType === "WD" ? wands
      : magicFoci.entries[item.canonicalId] ? magicFoci
      : mundane;
    const overlay = catalog.entries[item.canonicalId] ?? {};
    for (const [pathKey, value] of Object.entries(presentationStrings(item))) {
      if (Object.hasOwn(overlay, pathKey) || isProtectedOrStructural(pathKey, value)) continue;
      missingCount += 1;
      console.log("UNLOCALIZED_TARGET_PATH=" + JSON.stringify({ canonicalId: item.canonicalId, pathKey, value }));
    }
  }
  console.log(`UNLOCALIZED_TARGET_COUNT=${missingCount}`);
});
