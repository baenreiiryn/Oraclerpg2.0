import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/spells.json"), "utf8"));

function presentationSnapshot(spell) {
  return {
    canonicalId: spell.canonicalId,
    name: spell.name,
    level: spell.data?.level,
    text: spell.data?.text,
    activities: (spell.data?.activities ?? []).map((activity) => ({
      name: activity?.name,
      description: activity?.description
    }))
  };
}

test("inventory SRD 5.2 level-2 spells for PT-BR localization", () => {
  const spells = canonical.items.filter((spell) => spell.data?.level === 2);
  console.log("LEVEL2_INVENTORY_BEGIN");
  console.log(JSON.stringify(spells.map(presentationSnapshot)));
  console.log("LEVEL2_INVENTORY_END");
  console.log(`LEVEL2_COUNT=${spells.length}`);
});
