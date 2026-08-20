import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { MechanicalStateSnapshot, RulesEvaluationProposal, StateQueryProposal } from "@oraclerpg/ai";
import type { OracleEntity } from "@oraclerpg/core";
import { OracleEntityCompendiumIndex, RulesCompendiumBridge } from "../src/index.js";
import type { ActorRulesState, RulesStateProjectionPort } from "../src/index.js";

function entity(canonicalId: string, name: string, data: Readonly<Record<string, unknown>>): OracleEntity<unknown> {
  return {
    id: canonicalId,
    canonicalId,
    entityType: "test",
    name,
    system: { gameSystem: "dnd-srd-5e", rulesVersion: "5.2" },
    source: { sourceId: "test" },
    provenance: { origin: "oracle" },
    schemaVersion: 1,
    data,
    relations: [],
    metadata: {},
  };
}

const spellRef = "dnd:test:spell:arc-bolt";
const featureRef = "dnd:test:feature:burst";
const targetId = "target-1";

const index = new OracleEntityCompendiumIndex([
  entity(spellRef, "Arc Bolt", {
    level: 1,
    school: "evocation",
    activities: [{
      id: "cast",
      name: "Cast Arc Bolt",
      kind: "damage",
      costs: [{ resource: "spellSlot", amount: 1, level: 1 }],
    }],
  }),
  entity(featureRef, "Burst", {
    featureKind: "classFeature",
    activities: [{
      id: "burst",
      name: "Burst",
      kind: "damage",
      costs: [{ resource: "classResource", amount: 1, resourceId: "burstUses" }],
    }],
  }),
]);

const snapshot: MechanicalStateSnapshot = {
  campaignId: "campaign-1",
  actorId: "actor-1",
  revision: 3,
  data: {},
};

function projector(overrides: Partial<ActorRulesState> = {}): RulesStateProjectionPort {
  return {
    async projectRulesState() {
      return {
        actorId: "actor-1",
        conditions: [],
        resources: { "spellSlot:1": { current: 2, max: 4 }, burstUses: { current: 1, max: 1 } },
        usableFeatureRefs: [featureRef],
        castableSpellRefs: [spellRef],
        usableItemRefs: [],
        availableActionRefs: ["oracle.action:dodge"],
        availableTargetIds: [targetId],
        shortRestAllowed: true,
        longRestAllowed: true,
        ...overrides,
      };
    },
  };
}

function ruleProposal(ref: string, actionRef: string): RulesEvaluationProposal {
  return {
    schemaVersion: 1,
    proposalId: "proposal-1",
    operation: "rules.request-evaluation",
    actorId: "actor-1",
    targetIds: [targetId],
    payload: ref === spellRef
      ? { actionRef, spellRef: ref, requestedResolution: "LEGALITY" }
      : { actionRef, featureRef: ref, requestedResolution: "LEGALITY" },
  };
}

test("resolves a compendium spell activity and checks its slot cost", async () => {
  const bridge = new RulesCompendiumBridge(index, projector());
  const result = await bridge.resolve(ruleProposal(spellRef, "cast"), snapshot);
  assert.equal(result.decision, "LEGAL");
  assert.equal(result.source?.canonicalId, spellRef);
  assert.equal(result.activity?.id, "cast");
  assert.deepEqual(result.requiredResources, [{ resourceId: "spellSlot:1", amount: 1, available: 2 }]);
});

test("rejects an activity when the authoritative resource is exhausted", async () => {
  const bridge = new RulesCompendiumBridge(index, projector({ resources: { "spellSlot:1": { current: 0 } } }));
  const result = await bridge.resolve(ruleProposal(spellRef, "cast"), snapshot);
  assert.equal(result.decision, "ILLEGAL");
  assert.match(result.reason, /insufficient_resource/);
});

test("rejects a real compendium ref that the actor cannot use", async () => {
  const bridge = new RulesCompendiumBridge(index, projector({ usableFeatureRefs: [] }));
  const result = await bridge.resolve(ruleProposal(featureRef, "burst"), snapshot);
  assert.equal(result.decision, "ILLEGAL");
  assert.equal(result.reason, "feature_not_usable");
});

test("rejects targets outside the authoritative scene target set", async () => {
  const bridge = new RulesCompendiumBridge(index, projector({ availableTargetIds: [] }));
  const result = await bridge.resolve(ruleProposal(spellRef, "cast"), snapshot);
  assert.equal(result.decision, "ILLEGAL");
  assert.equal(result.reason, "target_not_available");
});

test("answers compendium state queries without exposing arbitrary entity data", async () => {
  const bridge = new RulesCompendiumBridge(index, projector());
  const proposal: StateQueryProposal = {
    schemaVersion: 1,
    proposalId: "query-1",
    operation: "state.request-query",
    actorId: "actor-1",
    payload: { query: "SPELL", ref: spellRef },
  };
  const result = await bridge.query(proposal);
  assert.equal(result.found, true);
  assert.equal(result.canonicalId, spellRef);
  assert.equal(result.name, "Arc Bolt");
  assert.ok(Array.isArray(result.activities));
  assert.equal("data" in result, false);
});

test("indexes real SRD 5.2 feature, spell, and item records", async () => {
  const paths = [
    new URL("../../content/data/srd-5.2/class-features.json", import.meta.url),
    new URL("../../content/data/srd-5.2/spells.json", import.meta.url),
    new URL("../../content/data/srd-5.2/items.json", import.meta.url),
  ];
  const expectedKinds = ["feature", "spell", "item"] as const;
  for (let i = 0; i < paths.length; i += 1) {
    const parsed = JSON.parse(await readFile(paths[i]!, "utf8")) as unknown;
    const entities = extractEntities(parsed);
    assert.ok(entities.length > 0, `expected compendium records in ${paths[i]!.pathname}`);
    const sample = entities.find((candidate) => candidate && typeof candidate === "object" && "canonicalId" in candidate) as OracleEntity<unknown> | undefined;
    assert.ok(sample?.canonicalId);
    const realIndex = new OracleEntityCompendiumIndex(entities as OracleEntity<unknown>[]);
    const indexed = await realIndex.getByCanonicalId(sample.canonicalId);
    assert.ok(indexed);
    assert.equal(indexed.kind, expectedKinds[i]);
    assert.equal(indexed.name, sample.name);
  }
});

function extractEntities(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["entities", "items", "spells", "features", "data"]) {
      if (Array.isArray(record[key])) return record[key] as unknown[];
    }
  }
  return [];
}
