import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { applyLocalization, isPresentationPath } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/spells.json"), "utf8"));
const locale = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/spells-level-3.json"), "utf8"));
const level3 = canonical.items.filter((spell) => spell.data?.level === 3);

function mechanicalSnapshot(spell) {
  return {
    id: spell.id,
    canonicalId: spell.canonicalId,
    system: spell.system,
    level: spell.data?.level,
    school: spell.data?.school,
    components: spell.data?.components,
    range: spell.data?.range,
    duration: spell.data?.duration
  };
}

test("PT-BR level-3 catalog exactly covers every canonical level-3 spell", () => {
  const canonicalIds = level3.map((spell) => spell.canonicalId).sort();
  const localeIds = Object.keys(locale.entries).sort();
  assert.equal(level3.length, 42);
  assert.deepEqual(localeIds, canonicalIds);
});

test("level-3 localization contains only presentation paths", () => {
  for (const translation of Object.values(locale.entries)) {
    for (const key of Object.keys(translation)) assert.equal(isPresentationPath(key), true, `non-presentation path: ${key}`);
  }
});

test("level-3 localization preserves canonical identity and mechanics", () => {
  for (const spell of level3) {
    const before = mechanicalSnapshot(spell);
    const localized = applyLocalization(spell, locale);
    assert.deepEqual(mechanicalSnapshot(localized), before);
    assert.deepEqual(mechanicalSnapshot(spell), before);
  }
});
