import assert from "node:assert/strict";
import test from "node:test";
import { OracleContextEngine } from "@oraclerpg/ai";
import {
  WorldStateConflictError,
  WorldStateContextSource,
  WorldStateService,
  type CampaignWorldState,
  type WorldStateStorePort,
} from "../src/index.js";

class MemoryWorldStore implements WorldStateStorePort {
  constructor(public state: CampaignWorldState) {}

  async loadCampaignWorld(campaignId: string): Promise<CampaignWorldState> {
    if (campaignId !== this.state.campaign.campaignId) throw new Error("campaign not found");
    return this.state;
  }

  async saveCampaignWorld(input: {
    expectedRevision: number;
    state: CampaignWorldState;
  }): Promise<void> {
    if (this.state.revision !== input.expectedRevision) throw new WorldStateConflictError("store conflict");
    this.state = input.state;
  }
}

const initialWorld: CampaignWorldState = {
  revision: 3,
  campaign: {
    campaignId: "campaign-1",
    name: "Avernus",
    systemId: "dnd-srd-5e",
  },
  activeScene: {
    sceneId: "scene-1",
    locationId: "fortress",
    name: "Audience Hall",
    mode: "SOCIAL",
    participantIds: ["pc-1", "pc-2", "duke"],
    threatIds: [],
    openThreads: ["Who serves the cult?"],
    recentEvents: [],
  },
  actors: [
    { actorId: "pc-1", entityId: "pc-1", name: "Hero One", kind: "PC", playerControlled: true, present: true },
    { actorId: "pc-2", entityId: "pc-2", name: "Hero Two", kind: "PC", playerControlled: true, present: true },
    { actorId: "duke", entityId: "duke", name: "The Duke", kind: "NPC", playerControlled: false, present: true },
  ],
  entities: [
    { entityId: "pc-1", kind: "PC", name: "Hero One" },
    { entityId: "pc-2", kind: "PC", name: "Hero Two" },
    { entityId: "duke", kind: "NPC", name: "The Duke" },
    { entityId: "fortress", kind: "LOCATION", name: "Fortress" },
    { entityId: "cult", kind: "FACTION", name: "Hidden Cult" },
  ],
  relationships: [
    {
      relationshipId: "duke-investigates-cult",
      fromEntityId: "duke",
      toEntityId: "cult",
      type: "investigates",
      visibility: "PUBLIC",
    },
    {
      relationshipId: "duke-serves-cult",
      fromEntityId: "duke",
      toEntityId: "cult",
      type: "secretlyServes",
      visibility: "GM_ONLY",
    },
  ],
  facts: [
    {
      factId: "curfew",
      statement: "The fortress is under curfew.",
      secrecy: "PUBLIC",
      active: true,
    },
    {
      factId: "possession",
      statement: "The duke is secretly possessed.",
      entityIds: ["duke"],
      secrecy: "GM_ONLY",
      active: true,
    },
    {
      factId: "secret-route",
      statement: "A hidden passage reaches the cult chamber.",
      entityIds: ["cult", "fortress"],
      secrecy: "HIDDEN",
      active: true,
    },
  ],
  knowledgeGrants: [
    {
      grantId: "pc1-route",
      factId: "secret-route",
      mode: "ACTOR_ONLY",
      actorIds: ["pc-1"],
      learnedAtRevision: 3,
    },
  ],
};

function contextEngine(store: WorldStateStorePort) {
  const source = new WorldStateContextSource(store, {
    async projectMechanicalContext({ intent }) {
      return {
        actorId: intent.actorId,
        conditions: [],
        resources: { hp: 20 },
        equippedItemIds: [],
        availableActionRefs: [],
        state: {},
      };
    },
  });
  return new OracleContextEngine(source);
}

function mechanicalState(actorId: string) {
  return { campaignId: "campaign-1", actorId, revision: 9, data: {} } as const;
}

function intent(actorId: string) {
  return {
    campaignId: "campaign-1",
    actorId,
    message: "What do I know?",
    clientRequestId: `request-${actorId}`,
  } as const;
}

test("objective secrets exist in world state without leaking into player context", async () => {
  const store = new MemoryWorldStore(initialWorld);
  const engine = contextEngine(store);
  const context = await engine.buildContext({ intent: intent("pc-1"), state: mechanicalState("pc-1") });
  if (context.version !== 2) throw new Error("expected v2 context");

  assert.ok(store.state.facts.some((fact) => fact.factId === "possession"));
  assert.deepEqual(
    context.sections.knowledge.facts.map((fact) => fact.factId),
    ["curfew", "secret-route"],
  );
  assert.deepEqual(
    context.sections.relationships.map((relationship) => relationship.relationshipId),
    ["duke-investigates-cult"],
  );
});

test("actor-specific knowledge does not leak to another player", async () => {
  const store = new MemoryWorldStore(initialWorld);
  const engine = contextEngine(store);
  const context = await engine.buildContext({ intent: intent("pc-2"), state: mechanicalState("pc-2") });
  if (context.version !== 2) throw new Error("expected v2 context");

  assert.deepEqual(context.sections.knowledge.facts.map((fact) => fact.factId), ["curfew"]);
});

test("runtime knowledge grants become visible only after authoritative revisioned mutation", async () => {
  const store = new MemoryWorldStore(initialWorld);
  const service = new WorldStateService(store);
  const updated = await service.apply({
    campaignId: "campaign-1",
    expectedRevision: 3,
    mutations: [
      {
        type: "GRANT_KNOWLEDGE",
        grant: {
          grantId: "pc2-route",
          factId: "secret-route",
          mode: "ACTOR_ONLY",
          actorIds: ["pc-2"],
          learnedAtRevision: 4,
        },
      },
      { type: "ADD_RECENT_EVENT", event: "Hero Two discovered the hidden passage." },
    ],
  });

  assert.equal(updated.revision, 4);
  assert.deepEqual(updated.activeScene.recentEvents, ["Hero Two discovered the hidden passage."]);

  const context = await contextEngine(store).buildContext({
    intent: intent("pc-2"),
    state: mechanicalState("pc-2"),
  });
  if (context.version !== 2) throw new Error("expected v2 context");
  assert.deepEqual(context.sections.knowledge.facts.map((fact) => fact.factId), ["curfew", "secret-route"]);
});

test("stale world revisions cannot overwrite newer authoritative state", async () => {
  const store = new MemoryWorldStore(initialWorld);
  const service = new WorldStateService(store);
  await service.apply({
    campaignId: "campaign-1",
    expectedRevision: 3,
    mutations: [{ type: "ADD_RECENT_EVENT", event: "First update" }],
  });

  await assert.rejects(
    () => service.apply({
      campaignId: "campaign-1",
      expectedRevision: 3,
      mutations: [{ type: "ADD_RECENT_EVENT", event: "Stale update" }],
    }),
    WorldStateConflictError,
  );
});

test("world state integrity rejects knowledge grants to unknown facts", async () => {
  const store = new MemoryWorldStore(initialWorld);
  const service = new WorldStateService(store);
  await assert.rejects(
    () => service.apply({
      campaignId: "campaign-1",
      expectedRevision: 3,
      mutations: [{
        type: "GRANT_KNOWLEDGE",
        grant: {
          grantId: "invalid",
          factId: "missing-fact",
          mode: "ACTOR_ONLY",
          actorIds: ["pc-1"],
        },
      }],
    }),
    /references missing fact/,
  );
});
