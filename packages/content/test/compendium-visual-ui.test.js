import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const publicRoot = path.join(repoRoot, "public");

const uiScript = fs.readFileSync(path.join(publicRoot, "compendium-ui.js"), "utf8");
const uiStyles = fs.readFileSync(path.join(publicRoot, "compendium-ui.css"), "utf8");
const portugueseHtml = fs.readFileSync(path.join(publicRoot, "compendium.html"), "utf8");
const englishHtml = fs.readFileSync(path.join(publicRoot, "en/compendium.html"), "utf8");

const categories = [
  "classes",
  "subclasses",
  "class-features",
  "species",
  "species-features",
  "feats",
  "items",
  "spells",
  "monster-features",
  "monsters"
];

test("shared visual compendium script is valid JavaScript", () => {
  assert.doesNotThrow(() => new vm.Script(uiScript));
});

test("PT-BR and English compendium pages use the shared visual renderer", () => {
  for (const html of [portugueseHtml, englishHtml]) {
    assert.match(html, /id="viewerVisual"/);
    assert.match(html, /href="\/compendium-ui\.css"/);
    assert.match(html, /src="\/compendium-ui\.js"/);
    assert.match(html, /id="viewerJson"/);
  }
  assert.match(portugueseHtml, /lang="pt-BR"/);
  assert.match(englishHtml, /lang="en"/);
});

test("all canonical browser categories have visual identities and render paths", () => {
  for (const category of categories) {
    assert.ok(uiScript.includes(`'${category}'`), `missing visual category ${category}`);
  }
  for (const renderer of [
    "renderClass",
    "renderSubclass",
    "renderFeature",
    "renderSpecies",
    "renderItem",
    "renderSpell",
    "renderMonster"
  ]) {
    assert.ok(uiScript.includes(`function ${renderer}`), `missing ${renderer}`);
  }
});

test("visual compendium keeps canonical SRD data read-only and edits only Homebrew storage", () => {
  assert.match(uiScript, /fetch\(`\$\{base\}\/\$\{category\}\.json`\)/);
  assert.match(uiScript, /localStorage\.setItem\(homebrewKey/);
  assert.match(uiScript, /sourceCanonicalId/);
  assert.doesNotMatch(uiScript, /fetch\([^\n]+method\s*:\s*['"](?:POST|PUT|PATCH|DELETE)/i);
});

test("visual styles include cards, stat blocks, abilities and class progression", () => {
  for (const selector of [
    ".entry-art",
    ".detail-hero",
    ".metric-grid",
    ".monster-core",
    ".ability-grid",
    ".level-card",
    ".feature-card"
  ]) {
    assert.ok(uiStyles.includes(selector), `missing style ${selector}`);
  }
});
