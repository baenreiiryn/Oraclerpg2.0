import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/spells.json"), "utf8"));
const localeDir = path.join(here, "../locales/pt-BR/srd-5.2");
const localeFiles = ["spells-level-3.json", "spells-level-5.json", "spells-level-6.json", "spells-level-8.json", "spells-level-9.json"];
const localeEntries = Object.assign({}, ...localeFiles.map((file) => JSON.parse(fs.readFileSync(path.join(localeDir, file), "utf8")).entries));
const ids = [
  "clairvoyance","glyph-of-warding","magic-circle","sleet-storm","spirit-guardians","stinking-cloud","tiny-hut",
  "animate-objects","arcane-hand","awaken","cloudkill","commune","conjure-elemental","contact-other-plane","contagion","creation","dispel-evil-and-good","dominate-person","dream","geas","greater-restoration","mass-cure-wounds","mislead","planar-binding","raise-dead","reincarnate","scrying","seeming","summon-dragon","telepathic-bond","teleportation-circle","wall-of-force","wall-of-stone",
  "blade-barrier","flesh-to-stone","freezing-sphere","guards-and-wards","irresistible-dance","magic-jar","planar-ally",
  "antimagic-field","antipathy-sympathy","clone","control-weather","demiplane","earthquake","holy-aura","incendiary-cloud","sunburst","tsunami","wish"
].map((slug) => `dnd2024:2024:spell:${slug}:srd-5.2`);

function selectCanonical(spell) {
  return {
    canonicalId: spell.canonicalId,
    name: spell.name,
    level: spell.data?.level,
    text: spell.data?.text,
    higherLevelText: spell.data?.higherLevelText,
    activities: (spell.data?.activities ?? []).map((activity) => ({
      id: activity.id,
      name: activity.name,
      description: activity.description,
      effects: (activity.effects ?? []).map((effect) => ({ id: effect.id, name: effect.name, description: effect.description }))
    }))
  };
}

test("debug flagged SRD localization records", () => {
  const byId = new Map(canonical.items.map((spell) => [spell.canonicalId, spell]));
  for (const id of ids) {
    const spell = byId.get(id);
    if (!spell) continue;
    console.log(`SRD_DEBUG=${JSON.stringify({ canonical: selectCanonical(spell), overlay: localeEntries[id] ?? null })}`);
  }
});
