import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const contentRoot = path.resolve(here, "..");
const repoRoot = path.resolve(contentRoot, "../..");
const outputRoot = path.join(repoRoot, "public/compendium/srd");
const script = path.join(contentRoot, "scripts/build-compendium-browser.mjs");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

test("compendium browser build exposes the complete SRD in English and PT-BR without changing canonical identity", () => {
  const result = spawnSync(process.execPath, [script], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const manifests = ["en", "pt-BR"].map((locale) => readJson(path.join(outputRoot, locale, "manifest.json")));
  for (const manifest of manifests) {
    assert.equal(manifest.contentSource, "srd-5.2");
    assert.equal(manifest.total, 1984);
    assert.equal(manifest.categories.length, 10);
    assert.equal(manifest.categories.reduce((sum, category) => sum + category.count, 0), 1984);
  }

  assert.deepEqual(
    manifests[0].categories.map(({ id, count }) => ({ id, count })),
    manifests[1].categories.map(({ id, count }) => ({ id, count }))
  );

  let translatedNames = 0;
  let checked = 0;
  for (const { id } of manifests[0].categories) {
    const english = readJson(path.join(outputRoot, "en", `${id}.json`));
    const portuguese = readJson(path.join(outputRoot, "pt-BR", `${id}.json`));
    assert.equal(english.count, portuguese.count, `${id}: locale count mismatch`);

    const ptById = new Map(portuguese.items.map((record) => [record.canonicalId, record]));
    for (const record of english.items) {
      const localized = ptById.get(record.canonicalId);
      assert.ok(localized, `${id}: missing PT-BR record ${record.canonicalId}`);
      assert.equal(record.entity.canonicalId, record.canonicalId);
      assert.equal(localized.entity.canonicalId, record.canonicalId);
      assert.equal(localized.entityType, record.entityType);
      if (localized.name !== record.name) translatedNames += 1;
      checked += 1;
    }
  }

  assert.equal(checked, 1984);
  assert.ok(translatedNames > 0, "PT-BR browser output should contain translated presentation names");
  assert.match(result.stdout, /COMPENDIUM_BROWSER_SRD_ENTITIES=1984/);
});
