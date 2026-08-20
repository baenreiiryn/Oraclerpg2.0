import assert from "node:assert/strict";
import test from "node:test";
import {
  HOME_BREW_CREATOR_FORMS,
  HomebrewCreatorService,
  IdentityHomebrewCanonicalizer,
  SequentialHomebrewIds,
  getHomebrewCreatorForm,
  listHomebrewCreatorForms,
  type CanonicalHomebrewCandidate,
  type HomebrewCandidateValidatorPort,
} from "../src/index.js";

const expectedTypes = [
  "monster", "vehicle", "item", "spell", "feature", "class", "subclass",
  "species", "background", "rule", "table", "condition",
] as const;

test("creator registry covers every canonical content category", () => {
  const forms = listHomebrewCreatorForms();
  assert.equal(forms.length, expectedTypes.length);
  assert.deepEqual(new Set(forms.map((form) => form.type)), new Set(expectedTypes));
  for (const type of expectedTypes) {
    const form = getHomebrewCreatorForm(type);
    assert.equal(form.type, type);
    assert.ok(form.sections.length > 0);
    assert.ok(form.sections.some((section) => section.fields.length > 0));
  }
});

test("item creator exposes conditional schemas for weapon armor container and pack", () => {
  const item = HOME_BREW_CREATOR_FORMS.item;
  assert.ok(item.sections.some((section) => section.condition?.equals === "weapon"));
  assert.ok(item.sections.some((section) => section.condition?.equals === "armor"));
  assert.ok(item.sections.some((section) => section.condition?.equals === "container"));
  assert.ok(item.sections.some((section) => section.condition?.equals === "pack"));
});

test("class and spell creator expose their canonical structural fields", () => {
  const classPaths = HOME_BREW_CREATOR_FORMS.class.sections.flatMap((section) => section.fields.map((field) => field.path));
  assert.ok(classPaths.includes("hitDie"));
  assert.ok(classPaths.includes("advancement"));
  assert.ok(classPaths.includes("spellcasting"));

  const spellPaths = HOME_BREW_CREATOR_FORMS.spell.sections.flatMap((section) => section.fields.map((field) => field.path));
  for (const requiredPath of ["level", "school", "castingTimes", "range", "durations", "components", "activities"]) {
    assert.ok(spellPaths.includes(requiredPath));
  }
});

test("manual creator stages through canonicalization and validation", async () => {
  const validator: HomebrewCandidateValidatorPort = {
    async validate(candidate: CanonicalHomebrewCandidate) {
      return candidate.name.trim() ? [] : [{ severity: "error" as const, code: "name_required", message: "Name is required" }];
    },
  };
  const creator = new HomebrewCreatorService(new IdentityHomebrewCanonicalizer(), validator, new SequentialHomebrewIds());
  const result = await creator.stageDraft({
    type: "spell",
    name: "Arc Lightning",
    systemId: "dnd-srd-5e",
    data: {
      level: 1,
      school: "evocation",
      castingTimes: [{ amount: 1, unit: "action" }],
      range: { type: "point", distance: { type: "feet", amount: 60 } },
      durations: [{ type: "instant" }],
      components: { verbal: true, somatic: true },
      activities: [],
    },
  });

  assert.equal(result.status, "READY");
  assert.equal(result.source.kind, "MANUAL_CREATOR");
  assert.equal(result.candidates[0]?.canonicalized, true);
  assert.equal(result.candidates[0]?.provenance.aiAssisted, false);
  assert.equal(result.candidates[0]?.systemId, "dnd-srd-5e");
});

test("manual creator rejects invalid drafts through the shared validator", async () => {
  const validator: HomebrewCandidateValidatorPort = {
    async validate() {
      return [{ severity: "error" as const, code: "invalid_data", path: "level", message: "Invalid level" }];
    },
  };
  const creator = new HomebrewCreatorService(new IdentityHomebrewCanonicalizer(), validator, new SequentialHomebrewIds());
  const result = await creator.stageDraft({ type: "spell", name: "Bad Spell", data: { level: 99 } });
  assert.equal(result.status, "REJECTED");
  assert.equal(result.diagnostics[0]?.code, "invalid_data");
});
