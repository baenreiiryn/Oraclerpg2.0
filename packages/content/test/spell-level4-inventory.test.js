import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/spells.json"), "utf8"));
const spells = canonical.items.filter((spell) => spell.data?.level === 4);

test("inventory level-4 spells", () => {
  console.log("LEVEL4_COUNT", spells.length);
  console.log("LEVEL4_JSON", JSON.stringify(spells.map((spell) => ({canonicalId: spell.canonicalId, name: spell.name, data: {text: spell.data?.text, activities: spell.data?.activities}}))));
});
