import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath, localizeEntity } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/spells.json"), "utf8"));
const primary = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/spells-level-5.json"), "utf8"));
const supplement = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/spells-level-5-supplement.json"), "utf8"));
const catalog = { ...primary, entries: { ...primary.entries, ...supplement.entries } };
const spells = canonical.items.filter((spell) => spell.data?.level === 5);

test("PT-BR level-5 catalog exactly covers every canonical level-5 spell", () => {
  const canonicalIds = new Set(spells.map((spell) => spell.canonicalId));
  const localizedIds = Object.keys(catalog.entries);
  const missing = spells.filter((spell) => !catalog.entries[spell.canonicalId]).map((spell) => spell.canonicalId);
  const unexpected = localizedIds.filter((canonicalId) => !canonicalIds.has(canonicalId));
  console.log("LEVEL5_UNEXPECTED", JSON.stringify(unexpected));
  console.log("LEVEL5_MISSING", JSON.stringify(missing));

  assert.equal(spells.length, 38);
  assert.deepEqual(missing, []);
  assert.deepEqual(unexpected, []);
  assert.equal(localizedIds.length, spells.length);
});

test("level-5 localization contains only presentation paths", () => {
  for (const [canonicalId, overlay] of Object.entries(catalog.entries)) {
    assert.equal(typeof overlay.name, "string", `${canonicalId}: missing localized name`);
    assert.notEqual(overlay.name.trim(), "", `${canonicalId}: empty localized name`);
    for (const pathKey of Object.keys(overlay)) {
      assert.equal(isPresentationPath(pathKey), true, `${canonicalId}: forbidden localization path ${pathKey}`);
    }
  }
});

test("level-5 localization preserves canonical identity and mechanics", () => {
  for (const spell of spells) {
    const before = structuredClone(spell);
    const localized = localizeEntity(spell, catalog);
    assert.equal(localized.id, spell.id);
    assert.equal(localized.canonicalId, spell.canonicalId);
    assert.deepEqual(localized.system, spell.system);
    assert.equal(localized.schemaVersion, spell.schemaVersion);
    assert.equal(localized.data?.level, spell.data?.level);
    assert.deepEqual(localized.data?.school, spell.data?.school);
    assert.deepEqual(localized.data?.components, spell.data?.components);
    assert.deepEqual(localized.data?.range, spell.data?.range);
    assert.deepEqual(localized.data?.duration, spell.data?.duration);
    assert.deepEqual(spell, before, `${spell.canonicalId}: canonical source was mutated`);
  }
});
