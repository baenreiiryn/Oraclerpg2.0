import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { isPresentationPath, localizeEntity } from "../localization.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const canonical = JSON.parse(fs.readFileSync(path.join(here, "../data/srd-5.2/spells.json"), "utf8"));
const localeDir = path.join(here, "../locales/pt-BR/srd-5.2");

const levels = [
  { level: 0, file: "spells-cantrips.json", count: 27 },
  { level: 1, file: "spells-level-1.json", count: 57 },
  { level: 2, file: "spells-level-2.json", count: 58 },
  { level: 3, file: "spells-level-3.json", count: 42 },
  { level: 4, file: "spells-level-4.json", count: 34 },
  { level: 5, file: "spells-level-5.json", count: 38 },
  { level: 6, file: "spells-level-6.json", count: 31 },
  { level: 7, file: "spells-level-7.json", count: 20 },
  { level: 8, file: "spells-level-8.json", count: 17 },
  { level: 9, file: "spells-level-9.json", count: 16 }
].map((entry) => ({
  ...entry,
  catalog: JSON.parse(fs.readFileSync(path.join(localeDir, entry.file), "utf8"))
}));

function getPath(root, pathKey) {
  return pathKey.split(".").reduce((cursor, part) => cursor?.[part], root);
}

function setExistingStringPath(root, pathKey, value) {
  const parts = pathKey.split(".");
  let cursor = root;
  for (let index = 0; index < parts.length - 1; index += 1) {
    cursor = cursor?.[parts[index]];
    if (cursor == null || typeof cursor !== "object") return false;
  }
  const leaf = parts.at(-1);
  if (typeof cursor?.[leaf] !== "string") return false;
  cursor[leaf] = value;
  return true;
}

function markupIsBalanced(value) {
  if (typeof value !== "string") return true;

  const fiveEToolsOpen = value.match(/\{@/g)?.length ?? 0;
  const fiveEToolsComplete = value.match(/\{@[^{}]+\}/g)?.length ?? 0;
  if (fiveEToolsOpen !== fiveEToolsComplete) return false;

  const foundryOpen = value.match(/\[\[/g)?.length ?? 0;
  const foundryClose = value.match(/\]\]/g)?.length ?? 0;
  if (foundryOpen !== foundryClose) return false;

  const references = value.match(/&Reference\[/g)?.length ?? 0;
  const completeReferences = value.match(/&Reference\[[^\]]+\]/g)?.length ?? 0;
  return references === completeReferences;
}

test("PT-BR spell catalogs from cantrips through level 9 cover all 340 canonical spells exactly once", () => {
  assert.equal(canonical.items.length, 340);

  const seen = new Map();
  for (const { level, count, catalog } of levels) {
    const canonicalAtLevel = canonical.items.filter((spell) => spell.data?.level === level);
    const localizedIds = Object.keys(catalog.entries);

    assert.equal(canonicalAtLevel.length, count, `unexpected canonical count at spell level ${level}`);
    assert.equal(localizedIds.length, count, `unexpected PT-BR count at spell level ${level}`);
    assert.equal(catalog.locale, "pt-BR");
    assert.equal(catalog.entityType, "spell");

    const expectedIds = new Set(canonicalAtLevel.map((spell) => spell.canonicalId));
    assert.deepEqual(localizedIds.filter((id) => !expectedIds.has(id)), [], `orphan/wrong-level entries in level ${level}`);
    assert.deepEqual(canonicalAtLevel.filter((spell) => !catalog.entries[spell.canonicalId]).map((spell) => spell.canonicalId), [], `missing entries in level ${level}`);

    for (const canonicalId of localizedIds) {
      assert.equal(seen.has(canonicalId), false, `${canonicalId}: appears in more than one spell catalog`);
      seen.set(canonicalId, level);
    }
  }

  assert.equal(seen.size, 340);
  assert.deepEqual(canonical.items.filter((spell) => !seen.has(spell.canonicalId)).map((spell) => spell.canonicalId), []);
});

test("every spell overlay path is presentation-only and stale paths are harmless no-ops", () => {
  const byId = new Map(canonical.items.map((spell) => [spell.canonicalId, spell]));
  const stale = [];

  for (const { level, catalog } of levels) {
    for (const [canonicalId, overlay] of Object.entries(catalog.entries)) {
      const spell = byId.get(canonicalId);
      assert.ok(spell, `${canonicalId}: missing canonical spell`);
      assert.equal(typeof overlay.name, "string", `${canonicalId}: missing localized name`);
      assert.notEqual(overlay.name.trim(), "", `${canonicalId}: empty localized name`);

      const localized = localizeEntity(spell, catalog);
      for (const [pathKey, translatedValue] of Object.entries(overlay)) {
        assert.equal(isPresentationPath(pathKey), true, `${canonicalId}: forbidden localization path ${pathKey}`);
        assert.equal(typeof translatedValue, "string", `${canonicalId}: localized value at ${pathKey} must be a string`);

        const sourceValue = getPath(spell, pathKey);
        if (typeof sourceValue !== "string") {
          stale.push(`level ${level} ${canonicalId}: ${pathKey}`);
          assert.deepEqual(
            getPath(localized, pathKey),
            sourceValue,
            `${canonicalId}: stale/non-string overlay path changed canonical structure at ${pathKey}`
          );
        }
      }
    }
  }

  console.log(`SPELL_LOCALIZATION_STALE_PATHS=${stale.length}`);
  for (const entry of stale) console.log(`SPELL_LOCALIZATION_STALE_PATH=${entry}`);
});

test("localizing all 340 spells changes only existing string presentation leaves and never mutates canonical data", () => {
  const catalogById = new Map();
  for (const { catalog } of levels) {
    for (const [canonicalId, overlay] of Object.entries(catalog.entries)) catalogById.set(canonicalId, { catalog, overlay });
  }

  for (const spell of canonical.items) {
    const before = structuredClone(spell);
    const { catalog, overlay } = catalogById.get(spell.canonicalId);
    const localized = localizeEntity(spell, catalog);

    assert.deepEqual(spell, before, `${spell.canonicalId}: canonical spell was mutated`);

    const restored = structuredClone(localized);
    for (const pathKey of Object.keys(overlay)) {
      const sourceValue = getPath(spell, pathKey);
      if (typeof sourceValue === "string") {
        assert.equal(
          setExistingStringPath(restored, pathKey, sourceValue),
          true,
          `${spell.canonicalId}: failed to restore presentation leaf ${pathKey}`
        );
      }
    }

    assert.deepEqual(
      restored,
      spell,
      `${spell.canonicalId}: localization changed structure or mechanics outside existing string presentation leaves`
    );
  }
});

test("all localized spell strings keep 5etools and Foundry markup syntactically balanced", () => {
  const malformed = [];
  for (const { level, catalog } of levels) {
    for (const [canonicalId, overlay] of Object.entries(catalog.entries)) {
      for (const [pathKey, translatedValue] of Object.entries(overlay)) {
        if (!markupIsBalanced(translatedValue)) malformed.push(`level ${level} ${canonicalId}: ${pathKey}`);
      }
    }
  }
  assert.deepEqual(malformed, []);
});
