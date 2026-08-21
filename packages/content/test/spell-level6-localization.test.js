import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath, localizeEntity } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/spells.json"), "utf8"));
const catalog = JSON.parse(fs.readFileSync(path.join(here, "../locales/pt-BR/srd-5.2/spells-level-6.json"), "utf8"));
const spells = canonical.items.filter((spell) => spell.data?.level === 6);

test("PT-BR level-6 catalog exactly covers every canonical level-6 spell", () => {
  const canonicalIds = new Set(spells.map((spell) => spell.canonicalId));
  const localizedIds = Object.keys(catalog.entries);
  const missing = spells.filter((spell) => !catalog.entries[spell.canonicalId]).map((spell) => spell.canonicalId);
  const unexpected = localizedIds.filter((canonicalId) => !canonicalIds.has(canonicalId));

  assert.equal(spells.length, 31);
  assert.equal(localizedIds.length, spells.length);
  assert.deepEqual(missing, []);
  assert.deepEqual(unexpected, []);
});

test("level-6 localization contains only presentation paths", () => {
  for (const [canonicalId, overlay] of Object.entries(catalog.entries)) {
    assert.equal(typeof overlay.name, "string", `${canonicalId}: missing localized name`);
    assert.notEqual(overlay.name.trim(), "", `${canonicalId}: empty localized name`);
    for (const pathKey of Object.keys(overlay)) {
      assert.equal(isPresentationPath(pathKey), true, `${canonicalId}: forbidden localization path ${pathKey}`);
    }
  }
});

test("level-6 localization preserves canonical identity and mechanics", () => {
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
