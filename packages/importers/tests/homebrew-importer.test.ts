import assert from "node:assert/strict";
import test from "node:test";
import {
  ConservativeHomebrewCanonicalizer,
  FiveToolsMarkdownHomebrewAdapter,
  FoundryVttHomebrewAdapter,
  HomebrewImportPipeline,
  OracleJsonHomebrewAdapter,
  SequentialHomebrewIds,
  TextAnalysisHomebrewAdapter,
  type CanonicalHomebrewCandidate,
} from "../src/index.js";

const validator = {
  async validate(candidate: CanonicalHomebrewCandidate) {
    return candidate.name.trim() ? [] : [{ severity: "error" as const, code: "name", message: "name required" }];
  },
};

function buildPipeline(analyze: (text: string) => unknown = () => ({ contents: [] })) {
  const ids = new SequentialHomebrewIds();
  const adapters = [
    new OracleJsonHomebrewAdapter(ids),
    new FoundryVttHomebrewAdapter(ids),
    new FiveToolsMarkdownHomebrewAdapter(ids),
    new TextAnalysisHomebrewAdapter(ids, { async analyze({ text }) { return analyze(text); } }),
  ];
  return new HomebrewImportPipeline(adapters, new ConservativeHomebrewCanonicalizer(), validator, ids);
}

test("Oracle JSON stages canonical AI-assisted content as READY", async () => {
  const pipeline = buildPipeline();
  const batch = await pipeline.stage({
    source: { kind: "ORACLE_JSON", fileName: "homebrew.json" },
    systemId: "dnd-srd-5e",
    payload: JSON.stringify({
      format: "oraclerpg-homebrew",
      version: 1,
      contents: [{ type: "feature", name: "Moon Step", confidence: 0.97, data: { canonicalId: "homebrew:moon-step" } }],
    }),
  });
  assert.equal(batch.status, "READY");
  assert.equal(batch.candidates[0]?.type, "feature");
  assert.equal(batch.candidates[0]?.canonicalized, true);
  assert.equal(batch.candidates[0]?.provenance.aiAssisted, true);
});

test("invalid Oracle JSON is rejected", async () => {
  const pipeline = buildPipeline();
  const batch = await pipeline.stage({ source: { kind: "ORACLE_JSON" }, payload: "{nope" });
  assert.equal(batch.status, "REJECTED");
  assert.ok(batch.diagnostics.some((d) => d.code === "invalid_oracle_json"));
});

test("5etools-style Markdown preserves structure and forces source mapping review", async () => {
  const pipeline = buildPipeline();
  const batch = await pipeline.stage({
    source: { kind: "FIVETOOLS_MARKDOWN", fileName: "ember-bolt.md" },
    payload: "# Ember Bolt\n\n**Casting Time:** 1 action\n\n**Range:** 60 feet\n\n**Duration:** Instantaneous\n\n## Effect\nFire erupts at a creature.\n",
  });
  assert.equal(batch.candidates[0]?.type, "spell");
  assert.equal(batch.status, "NEEDS_REVIEW");
  assert.ok(batch.diagnostics.some((d) => d.code === "source_mapping_review"));
});

test("explicit Markdown type directive removes type ambiguity but still reviews canonical mapping", async () => {
  const pipeline = buildPipeline();
  const batch = await pipeline.stage({
    source: { kind: "FIVETOOLS_MARKDOWN" },
    payload: "<!-- oracle:type=item -->\n# Lantern of Dawn\n\nWondrous item.",
  });
  assert.equal(batch.candidates[0]?.type, "item");
  assert.equal(batch.candidates[0]?.provenance.confidence, 1);
  assert.equal(batch.status, "NEEDS_REVIEW");
});

test("Foundry spell is classified but never treated as persistence-ready source data", async () => {
  const pipeline = buildPipeline();
  const batch = await pipeline.stage({
    source: { kind: "FOUNDRY_VTT", fileName: "spell.json" },
    payload: { _id: "abc", name: "Ash Lance", type: "spell", system: { level: 2 }, effects: [] },
  });
  assert.equal(batch.candidates[0]?.type, "spell");
  assert.equal(batch.candidates[0]?.provenance.sourceId, "abc");
  assert.equal(batch.status, "NEEDS_REVIEW");
});

test("text analysis is AI-assisted and low confidence forces review", async () => {
  const pipeline = buildPipeline(() => ({
    contents: [{ type: "monster", name: "Glass Wolf", confidence: 0.7, data: { name: "Glass Wolf" }, notes: ["AC not explicit"] }],
  }));
  const batch = await pipeline.stage({ source: { kind: "TEXT_ANALYSIS" }, payload: "A glass wolf stalks the ruins." });
  assert.equal(batch.candidates[0]?.provenance.aiAssisted, true);
  assert.equal(batch.status, "NEEDS_REVIEW");
  assert.ok(batch.diagnostics.some((d) => d.code === "analysis_low_confidence"));
});

test("empty text analysis is rejected", async () => {
  const pipeline = buildPipeline(() => ({ contents: [] }));
  const batch = await pipeline.stage({ source: { kind: "TEXT_ANALYSIS" }, payload: "ambiguous text" });
  assert.equal(batch.status, "REJECTED");
});
