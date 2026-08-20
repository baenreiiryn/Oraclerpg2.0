import assert from "node:assert/strict";
import test from "node:test";
import {
  HybridRetrievalEngine,
  MemoryRetrievalSource,
  WorldStateRetrievalSource,
  type CampaignMemoryState,
  type CampaignWorldState,
  type MemoryStateStorePort,
  type RetrievalSourcePort,
  type WorldStateStorePort,
} from "../src/index.js";

class MemoryStore implements MemoryStateStorePort {
  constructor(public state: CampaignMemoryState) {}
  async loadCampaignMemory(campaignId: string) {
    if (campaignId !== this.state.campaignId) throw new Error("missing campaign");
    return this.state;
  }
  async saveCampaignMemory(): Promise<void> {}
}

class WorldStore implements WorldStateStorePort {
  constructor(public state: CampaignWorldState) {}
  async loadCampaignWorld(campaignId: string) {
    if (campaignId !== this.state.campaign.campaignId) throw new Error("missing campaign");
    return this.state;
  }
  async saveCampaignWorld(): Promise<void> {}
}

const memory: CampaignMemoryState = {
  campaignId: "campaign-1",
  revision: 8,
  records: [
    {
      memoryId: "public-event",
      campaignId: "campaign-1",
      kind: "EPISODIC",
      summary: "The party found a crimson sigil beneath the fortress.",
      visibility: "PUBLIC",
      importance: 0.8,
      source: { sceneId: "scene-1", entityIds: ["fortress"] },
      entityIds: ["fortress"],
      createdAtMemoryRevision: 5,
      updatedAtMemoryRevision: 5,
    },
    {
      memoryId: "pc1-secret",
      campaignId: "campaign-1",
      kind: "DISCOVERY",
      summary: "The hidden passage opens behind the crimson sigil.",
      visibility: "ACTOR_ONLY",
      actorIds: ["pc-1"],
      importance: 1,
      source: { worldFactId: "secret-route" },
      entityIds: ["fortress"],
      createdAtMemoryRevision: 8,
      updatedAtMemoryRevision: 8,
    },
    {
      memoryId: "gm-secret",
      campaignId: "campaign-1",
      kind: "SEMANTIC",
      summary: "The duke serves the cult.",
      semanticKey: "duke:allegiance",
      visibility: "GM_ONLY",
      importance: 1,
      source: { worldFactId: "duke-cult" },
      entityIds: ["duke", "cult"],
      createdAtMemoryRevision: 8,
      updatedAtMemoryRevision: 8,
    },
  ],
};

const world: CampaignWorldState = {
  revision: 10,
  campaign: { campaignId: "campaign-1", name: "Avernus" },
  activeScene: {
    sceneId: "scene-1",
    locationId: "fortress",
    participantIds: ["pc-1", "pc-2", "duke"],
    threatIds: [],
    openThreads: [],
    recentEvents: [],
  },
  actors: [
    { actorId: "pc-1", entityId: "pc-1", name: "Hero One", kind: "PC", playerControlled: true, present: true },
    { actorId: "pc-2", entityId: "pc-2", name: "Hero Two", kind: "PC", playerControlled: true, present: true },
  ],
  entities: [
    { entityId: "fortress", kind: "LOCATION", name: "Fortress", summary: "A military fortress over old catacombs." },
    { entityId: "duke", kind: "NPC", name: "The Duke" },
    { entityId: "cult", kind: "FACTION", name: "Hidden Cult" },
  ],
  relationships: [],
  facts: [
    { factId: "curfew", statement: "The fortress is under curfew.", secrecy: "PUBLIC", active: true },
    { factId: "secret-route", statement: "A hidden passage opens behind the crimson sigil.", entityIds: ["fortress"], secrecy: "HIDDEN", active: true },
    { factId: "duke-cult", statement: "The duke serves the hidden cult.", entityIds: ["duke", "cult"], secrecy: "GM_ONLY", active: true },
  ],
  knowledgeGrants: [
    { grantId: "pc1-route", factId: "secret-route", mode: "ACTOR_ONLY", actorIds: ["pc-1"], learnedAtRevision: 10 },
  ],
};

function engine(extra: readonly RetrievalSourcePort[] = []) {
  return new HybridRetrievalEngine([
    new MemoryRetrievalSource(new MemoryStore(memory)),
    new WorldStateRetrievalSource(new WorldStore(world)),
    ...extra,
  ]);
}

test("hybrid retrieval keeps GM and hidden knowledge out of player results", async () => {
  const result = await engine().retrieve({
    campaignId: "campaign-1",
    actorId: "pc-2",
    text: "cult duke hidden passage crimson sigil",
    entityIds: ["duke", "fortress"],
    maxTokens: 500,
  });

  assert.equal(result.items.some((item) => item.retrievalId === "memory:gm-secret"), false);
  assert.equal(result.items.some((item) => item.retrievalId === "fact:duke-cult"), false);
  assert.equal(result.items.some((item) => item.retrievalId === "fact:secret-route"), false);
  assert.ok(result.droppedForVisibility >= 3);
});

test("actor-only memory and fact are retrievable only for the granted actor", async () => {
  const result = await engine().retrieve({
    campaignId: "campaign-1",
    actorId: "pc-1",
    text: "hidden passage crimson sigil",
    entityIds: ["fortress"],
    maxTokens: 500,
  });

  assert.ok(result.items.some((item) => item.retrievalId === "memory:pc1-secret"));
  assert.ok(result.items.some((item) => item.retrievalId === "fact:secret-route"));
});

test("context budget is a hard ceiling even when high-ranked items do not fit", async () => {
  const result = await engine().retrieve({
    campaignId: "campaign-1",
    actorId: "pc-1",
    text: "fortress crimson sigil",
    entityIds: ["fortress"],
    maxTokens: 12,
  });

  assert.ok(result.usedTokens <= 12);
  assert.equal(result.remainingTokens, 12 - result.usedTokens);
  assert.ok(result.droppedForBudget > 0);
});

test("hybrid ranking combines semantic signals with entity relevance", async () => {
  const external: RetrievalSourcePort = {
    async retrieve() {
      return [
        {
          retrievalId: "document:weak",
          source: "DOCUMENT",
          text: "General history of the fortress.",
          visibility: "PUBLIC",
          semanticScore: 0.2,
          entityIds: ["fortress"],
          importance: 0.3,
        },
        {
          retrievalId: "document:strong",
          source: "DOCUMENT",
          text: "Cult symbols and passages beneath the fortress.",
          visibility: "PUBLIC",
          semanticScore: 0.95,
          entityIds: ["fortress", "cult"],
          importance: 0.9,
        },
      ];
    },
  };

  const result = await engine([external]).retrieve({
    campaignId: "campaign-1",
    actorId: "pc-1",
    text: "cult passage fortress",
    entityIds: ["fortress", "cult"],
    maxTokens: 500,
  });

  const strong = result.items.find((item) => item.retrievalId === "document:strong");
  const weak = result.items.find((item) => item.retrievalId === "document:weak");
  assert.ok(strong && weak);
  assert.ok(strong.score > weak.score);
  assert.ok(strong.scoreBreakdown.semantic > weak.scoreBreakdown.semantic);
});

test("allowedSources can constrain retrieval to a requested context class", async () => {
  const result = await engine().retrieve({
    campaignId: "campaign-1",
    actorId: "pc-1",
    text: "fortress",
    maxTokens: 500,
    allowedSources: ["WORLD_FACT"],
  });

  assert.ok(result.items.length > 0);
  assert.ok(result.items.every((item) => item.source === "WORLD_FACT"));
});
