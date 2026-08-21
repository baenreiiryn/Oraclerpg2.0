import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildMonsterLocalizationCatalog, collectMonsterPresentationStrings } from "../monster-localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const monstersDoc = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monsters.json"), "utf8"));
const featureDoc = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/monster-features.json"), "utf8"));
const localeDir = path.join(here, "../locales/pt-BR/srd-5.2");
const featureCatalogFiles = [
  "monster-features-traits.json",
  "monster-features-actions-01.json",
  "monster-features-actions-02.json",
  "monster-features-actions-03.json",
  "monster-features-actions-04.json",
  "monster-features-bonus-actions.json",
  "monster-features-legendary-actions.json",
  "monster-features-reactions.json"
];
const featureCatalogs = featureCatalogFiles.map((file) => JSON.parse(fs.readFileSync(path.join(localeDir, file), "utf8")));
const nameMap = JSON.parse(fs.readFileSync(path.join(localeDir, "monster-name-map.json"), "utf8"));
const monsters = monstersDoc.items ?? [];
const catalog = buildMonsterLocalizationCatalog({monsters, featureDefinitions: featureDoc.items ?? [], featureCatalogs, nameMap});

function withoutMacros(value) {
  return value.replace(/\{@[^}]+\}/g, " ").replace(/\s+/g, " ").trim();
}

const ENGLISH_MARKER = /\b(?:the|target|creature|creatures|damage|saving|throw|attack|attacks|roll|rolls|within|feet|foot|turn|turns|condition|conditions|until|while|takes|take|has|have|each|another|must|may|makes|make|moves|move|regains|regain|becomes|become|ends|end|starts|start|fails|fail|success|failure|points|speed|spell|weapon|weapons|ally|enemy|enemies|space|spaces|range|reach|underwater|next|this|that|from|with|without|when|whenever|where|which|during|before|after|against|toward|away|only|otherwise|instead|either|both|same|extra|half|double|equal|round|minute|minutes|hour|hours|day|days)\b/i;

test("measure generated monster localization coverage and quality", () => {
  const unresolved = [];
  const englishLeak = [];
  let total = 0;
  let covered = 0;
  for (const monster of monsters) {
    const strings = collectMonsterPresentationStrings(monster);
    const overlay = catalog.entries[monster.canonicalId] ?? {};
    for (const [pathKey, value] of Object.entries(strings)) {
      total += 1;
      const translated = overlay[pathKey];
      if (typeof translated === "string") covered += 1;
      else unresolved.push({canonicalId: monster.canonicalId, monster: monster.name, path: pathKey, value});
      if (typeof translated === "string" && pathKey.endsWith(".description")) {
        const plain = withoutMacros(translated);
        const marker = plain.match(ENGLISH_MARKER)?.[0];
        if (marker) englishLeak.push({canonicalId: monster.canonicalId, monster: monster.name, path: pathKey, marker, translated});
      }
    }
  }
  console.log(`MONSTER_LOCALIZATION_TOTAL=${total}`);
  console.log(`MONSTER_LOCALIZATION_COVERED=${covered}`);
  console.log(`MONSTER_LOCALIZATION_UNRESOLVED=${unresolved.length}`);
  console.log(`MONSTER_ENGLISH_LEAK_COUNT=${englishLeak.length}`);
  for (const row of englishLeak.slice(0, 120)) console.log(`MONSTER_ENGLISH_LEAK=${JSON.stringify(row)}`);
  for (const monster of monsters.filter((_, index) => index % 17 === 0).slice(0, 20)) {
    const overlay = catalog.entries[monster.canonicalId] ?? {};
    const descriptions = Object.entries(overlay).filter(([pathKey]) => pathKey.endsWith(".description")).slice(0, 3);
    console.log(`MONSTER_PT_SAMPLE=${JSON.stringify({monster: monster.name, translatedName: overlay.name, descriptions})}`);
  }
  assert.equal(unresolved.length, 0);
});
