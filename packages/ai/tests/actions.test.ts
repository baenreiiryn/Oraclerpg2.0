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
    {
      operation: "state.suggest-mutation",
      schemaVersion: 1,
      description: "Propose validated campaign inventory/currency/XP changes",
      allowedActorIds: ["oracle-gm"],
      allowedRefs: ["item:potion-of-healing"],
    },
  ],
};

test("manifest exposes only declared structured operations", () => {
  assert.deepEqual(operationsFromCapabilityManifest(manifest), [
    "rules.request-evaluation",
    "dice.request-roll",
    "state.suggest-mutation",
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

test("state mutation proposal remains a proposal and respects exposed item refs", () => {
  const allowed: StructuredAiActionProposal = {
    schemaVersion: 1,
    proposalId: "p2",
    operation: "state.suggest-mutation",
    actorId: "oracle-gm",
    payload: {
      requiresRuntimeValidation: true,
      mutations: [
        { type: "CURRENCY_DELTA", amountCp: -3000, reason: "player paid 30 gp" },
        { type: "ITEM_ADD", itemRef: "item:potion-of-healing", name: "Potion of Healing", quantity: 1 },
        { type: "SCENE_RESOLVE", sceneId: "tavern-negotiation", meaningful: true, xpBudget: 100, resolutionMethod: "DIPLOMACY" },
      ],
    },
  };
  assert.equal(capabilityAllowsProposal(manifest, allowed), true);

  const forbidden: StructuredAiActionProposal = {
    ...allowed,
    proposalId: "p3",
    payload: {
      requiresRuntimeValidation: true,
      mutations: [{ type: "ITEM_ADD", itemRef: "item:vorpal-sword", name: "Vorpal Sword", quantity: 1 }],
    },
  };
  assert.equal(capabilityAllowsProposal(manifest, forbidden), false);
});
