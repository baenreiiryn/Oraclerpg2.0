import assert from "node:assert/strict";
import test from "node:test";
import { OracleContextEngine, type ContextSourcePort } from "../src/index.js";

const intent = {
  campaignId: "campaign-1",
  actorId: "pc-1",
  message: "I ask the duke about the cult.",
  clientRequestId: "request-1",
} as const;

const state = {
  campaignId: "campaign-1",
  actorId: "pc-1",
  revision: 12,
  data: Object.freeze({ hp: 18 }),
} as const;

function sourcePort(): ContextSourcePort {
  return {
    async loadContextSource() {
      return {
        campaign: {
          campaignId: "campaign-1",
          name: "Avernus",
          systemId: "dnd-srd-5e",
        },
        scene: {
          sceneId: "scene-1",
          locationId: "location-fortress",
          name: "Audience Hall",
          mode: "SOCIAL",
          participantIds: ["pc-1", "npc-duke"],
          threatIds: [],
          openThreads: ["Who serves the hidden cult?"],
          recentEvents: ["The duke entered the hall."],
        },
        actors: [
          {
            actorId: "pc-1",
            entityId: "pc-1",
            name: "Hero",
            kind: "PC",
            playerControlled: true,
            present: true,
          },
          {
            actorId: "npc-duke",
            entityId: "npc-duke",
            name: "The Duke",
            kind: "NPC",
            playerControlled: false,
            present: true,
          },
          {
            actorId: "npc-distant",
            entityId: "npc-distant",
            name: "Distant Spy",
            kind: "NPC",
            playerControlled: false,
            present: false,
          },
        ],
        entities: [
          { entityId: "pc-1", kind: "PC", name: "Hero" },
          { entityId: "npc-duke", kind: "NPC", name: "The Duke" },
          { entityId: "npc-distant", kind: "NPC", name: "Distant Spy" },
          { entityId: "location-fortress", kind: "LOCATION", name: "Fortress" },
          { entityId: "cult", kind: "FACTION", name: "Hidden Cult" },
        ],
        relationships: [
          {
            relationshipId: "rel-public",
            fromEntityId: "npc-duke",
            toEntityId: "cult",
            type: "investigates",
            visibility: "PUBLIC",
          },
          {
            relationshipId: "rel-hidden",
            fromEntityId: "npc-duke",
            toEntityId: "cult",
            type: "secretlyServes",
            visibility: "GM_ONLY",
          },
        ],
        knowledge: [
          {
            factId: "fact-public",
            statement: "The fortress is under curfew.",
            visibility: "PUBLIC",
          },
          {
            factId: "fact-discovered",
            statement: "The cult symbol is an eye and hand.",
            visibility: "DISCOVERED",
            entityIds: ["cult"],
          },
          {
            factId: "fact-actor",
            statement: "The hero alone heard the duke whisper a name.",
            visibility: "ACTOR_ONLY",
            actorIds: ["pc-1"],
          },
          {
            factId: "fact-other-actor",
            statement: "Another PC knows a secret entrance.",
            visibility: "ACTOR_ONLY",
            actorIds: ["pc-2"],
          },
          {
            factId: "fact-gm",
            statement: "The duke is secretly possessed.",
            visibility: "GM_ONLY",
          },
          {
            factId: "fact-hidden",
            statement: "The cult leader is behind the throne.",
            visibility: "HIDDEN",
          },
        ],
        mechanics: {
          actorId: "pc-1",
          conditions: [],
          resources: { hp: 18 },
          equippedItemIds: ["sword-1"],
          availableActionRefs: ["attack", "dash"],
          state: { armorClass: 17 },
        },
      };
    },
  };
}

test("Context Engine emits a typed v2 package aligned to authoritative state", async () => {
  const engine = new OracleContextEngine(sourcePort());
  const context = await engine.buildContext({ intent, state });

  assert.equal(context.version, 2);
  assert.equal(context.campaignId, state.campaignId);
  assert.equal(context.actorId, state.actorId);
  assert.equal(context.stateRevision, state.revision);
  assert.equal(context.sections.mechanics.actorId, "pc-1");
});

test("player context excludes GM-only, hidden, and other-actor knowledge", async () => {
  const engine = new OracleContextEngine(sourcePort());
  const context = await engine.buildContext({ intent, state });
  if (context.version !== 2) throw new Error("expected v2 context");

  const factIds = context.sections.knowledge.facts.map((fact) => fact.factId);
  assert.deepEqual(factIds, ["fact-public", "fact-discovered", "fact-actor"]);
});

test("relationship projection excludes GM-only relationships", async () => {
  const engine = new OracleContextEngine(sourcePort());
  const context = await engine.buildContext({ intent, state });
  if (context.version !== 2) throw new Error("expected v2 context");

  assert.deepEqual(
    context.sections.relationships.map((relationship) => relationship.relationshipId),
    ["rel-public"],
  );
});

test("context projection excludes non-present actors and unrelated entities by default", async () => {
  const engine = new OracleContextEngine(sourcePort());
  const context = await engine.buildContext({ intent, state });
  if (context.version !== 2) throw new Error("expected v2 context");

  assert.deepEqual(
    context.sections.actors.map((actor) => actor.actorId),
    ["pc-1", "npc-duke"],
  );
  assert.deepEqual(
    context.sections.entities.map((entity) => entity.entityId),
    ["pc-1", "npc-duke", "location-fortress", "cult"],
  );
});

test("context source cannot substitute another campaign or actor", async () => {
  const source = sourcePort();
  const original = source.loadContextSource.bind(source);
  source.loadContextSource = async (input) => {
    const result = await original(input);
    return {
      ...result,
      campaign: { ...result.campaign, campaignId: "foreign-campaign" },
    };
  };

  const engine = new OracleContextEngine(source);
  await assert.rejects(
    () => engine.buildContext({ intent, state }),
    /campaign does not match authoritative state/,
  );
});
