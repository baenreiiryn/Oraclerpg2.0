import assert from "node:assert/strict";
import test from "node:test";
import {
  capabilityAllowsProposal,
  operationsFromCapabilityManifest,
  type AiCapabilityManifest,
  type StructuredAiActionProposal,
} from "../src/index.js";

const manifest: AiCapabilityManifest = {
  version: 1,
  capabilities: [
    {
      operation: "rules.request-evaluation",
      schemaVersion: 1,
      description: "Evaluate one exposed attack",
      allowedActorIds: ["pc-1"],
      allowedTargetIds: ["goblin-1"],
      allowedRefs: ["attack:longsword"],
    },
    {
      operation: "dice.request-roll",
      schemaVersion: 1,
      description: "Roll dice when requested by runtime",
      allowedActorIds: ["pc-1"],
    },
  ],
};

test("manifest exposes only declared structured operations", () => {
  assert.deepEqual(operationsFromCapabilityManifest(manifest), [
    "rules.request-evaluation",
    "dice.request-roll",
  ]);
});

test("capability checks operation, actor, target and references", () => {
  const allowed: StructuredAiActionProposal = {
    schemaVersion: 1,
    proposalId: "p1",
    operation: "rules.request-evaluation",
    actorId: "pc-1",
    targetIds: ["goblin-1"],
    payload: { actionRef: "attack:longsword", requestedResolution: "ATTACK" },
  };
  assert.equal(capabilityAllowsProposal(manifest, allowed), true);

  assert.equal(capabilityAllowsProposal(manifest, { ...allowed, actorId: "npc-1" }), false);
  assert.equal(capabilityAllowsProposal(manifest, { ...allowed, targetIds: ["dragon-1"] }), false);
  assert.equal(
    capabilityAllowsProposal(manifest, {
      ...allowed,
      payload: { actionRef: "spell:wish", requestedResolution: "OTHER" },
    }),
    false,
  );
});
