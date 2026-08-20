import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/spells.json"), "utf8"));
const spells = canonical.items.filter((spell) => spell.data?.level === 7);

test("inventory level-7 spells", () => {
  console.log("LEVEL7_COUNT", spells.length);
  for (const spell of spells) {
    console.log("LEVEL7_SPELL", JSON.stringify({
      canonicalId: spell.canonicalId,
      name: spell.name,
      text: spell.data?.text,
      activities: spell.data?.activities
    }));
  }
});
