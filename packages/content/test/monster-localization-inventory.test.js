import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monsters.json"), "utf8"));
const monsters = canonical.items ?? [];

function collectPresentationStrings(root, prefix = "", out = {}) {
  if (typeof root === "string") {
    if (
      isPresentationPath(prefix) &&
      !prefix.includes(".monsterTemplate.") &&
      !prefix.endsWith(".invocation.entity.name")
    ) out[prefix] = root;
    return out;
  }
  if (root == null || typeof root !== "object") return out;
  if (Array.isArray(root)) {
    root.forEach((value, index) => collectPresentationStrings(value, prefix ? `${prefix}.${index}` : String(index), out));
    return out;
  }
  for (const [key, value] of Object.entries(root)) {
    collectPresentationStrings(value, prefix ? `${prefix}.${key}` : key, out);
  }
  return out;
}

function normalizePath(pathKey) {
  return pathKey.split(".").map((part) => /^\d+$/.test(part) ? "*" : part).join(".");
}

test("inventory monster localization presentation fields", () => {
  const shapes = new Map();
  let totalStrings = 0;
  let monstersWithProse = 0;
  for (const monster of monsters) {
    const strings = collectPresentationStrings(monster);
    totalStrings += Object.keys(strings).length;
    if (Object.keys(strings).some((key) => key !== "name")) monstersWithProse += 1;
    for (const pathKey of Object.keys(strings)) {
      const shape = normalizePath(pathKey);
      shapes.set(shape, (shapes.get(shape) ?? 0) + 1);
    }
  }
  console.log(`MONSTER_COUNT=${monsters.length}`);
  console.log(`MONSTER_PRESENTATION_STRING_COUNT=${totalStrings}`);
  console.log(`MONSTERS_WITH_NON_NAME_PRESENTATION=${monstersWithProse}`);
  console.log(`MONSTER_PRESENTATION_PATH_SHAPES=${JSON.stringify(Object.fromEntries([...shapes].sort()))}`);
  for (const monster of monsters.slice(0, 40)) {
    console.log("MONSTER_SAMPLE=" + JSON.stringify({
      canonicalId: monster.canonicalId,
      name: monster.name,
      strings: collectPresentationStrings(monster)
    }));
  }
});
