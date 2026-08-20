import assert from "node:assert/strict";
import test from "node:test";
import {
  MemoryStateConflictError,
  OracleMemoryService,
  OracleSessionStateService,
  SessionStateConflictError,
  type CampaignMemoryState,
  type MemoryStateStorePort,
  type OracleSessionState,
  type SessionStateStorePort,
} from "../src/index.js";

class MemoryStore implements MemoryStateStorePort {
  constructor(public state: CampaignMemoryState) {}
  async loadCampaignMemory(campaignId: string) {
    if (campaignId !== this.state.campaignId) throw new Error("campaign not found");
    return this.state;
  }
  async saveCampaignMemory(input: { expectedRevision: number; state: CampaignMemoryState }) {
    if (this.state.revision !== input.expectedRevision) throw new MemoryStateConflictError("store conflict");
    this.state = input.state;
  }
}

class SessionStore implements SessionStateStorePort {
  constructor(public state: OracleSessionState) {}
  async loadSession(campaignId: string, sessionId: string) {
    if (campaignId !== this.state.campaignId || sessionId !== this.state.sessionId) throw new Error("session not found");
    return this.state;
  }
  async saveSession(input: { expectedRevision: number; state: OracleSessionState }) {
    if (this.state.revision !== input.expectedRevision) throw new SessionStateConflictError("store conflict");
    this.state = input.state;
  }
}

const emptyMemory: CampaignMemoryState = { campaignId: "campaign-1", revision: 0, records: [] };
const activeSession: OracleSessionState = {
  campaignId: "campaign-1",
  sessionId: "session-1",
  revision: 0,
  status: "ACTIVE",
  turnCount: 0,
  openThreadMemoryIds: [],
  summaryBlocks: [],
};

test("episodic memory appends while semantic memory consolidates by semanticKey", async () => {
  const store = new MemoryStore(emptyMemory);
  const service = new OracleMemoryService(store);
  const first = await service.ingestCandidates({
    campaignId: "campaign-1",
    sessionId: "session-1",
    expectedRevision: 0,
    worldRevision: 10,
    candidates: [
      {
        candidateId: "episode-1",
        kind: "EPISODIC",
        summary: "The duke entered the hall.",
        visibility: "PUBLIC",
        importance: 0.4,
        source: { turnId: "turn-1", sceneId: "scene-1" },
      },
      {
        candidateId: "cult-symbol-v1",
        kind: "SEMANTIC",
        semanticKey: "cult:symbol",
        summary: "The cult uses an eye symbol.",
        visibility: "ACTOR_ONLY",
        actorIds: ["pc-1"],
        entityIds: ["cult"],
        importance: 0.8,
        source: { worldFactId: "cult-symbol" },
      },
    ],
  });
  assert.equal(first.records.length, 2);

  const second = await service.ingestCandidates({
    campaignId: "campaign-1",
    sessionId: "session-1",
    expectedRevision: 1,
    worldRevision: 11,
    candidates: [
      {
        candidateId: "cult-symbol-v2",
        kind: "SEMANTIC",
        semanticKey: "cult:symbol",
        summary: "The cult symbol is an eye containing a hand.",
        visibility: "ACTOR_ONLY",
        actorIds: ["pc-1"],
        entityIds: ["cult"],
        importance: 0.9,
        source: { worldFactId: "cult-symbol" },
      },
    ],
  });

  assert.equal(second.records.length, 2);
  const semantic = second.records.find((record) => record.semanticKey === "cult:symbol")!;
  assert.equal(semantic.memoryId, "cult-symbol-v1");
  assert.equal(semantic.summary, "The cult symbol is an eye containing a hand.");
  assert.equal(semantic.createdAtMemoryRevision, 1);
  assert.equal(semantic.updatedAtMemoryRevision, 2);
});

test("actor-only and GM-only memories do not leak through player projection", async () => {
  const store = new MemoryStore(emptyMemory);
  const service = new OracleMemoryService(store);
  const state = await service.ingestCandidates({
    campaignId: "campaign-1",
    expectedRevision: 0,
    candidates: [
      { candidateId: "public", kind: "DISCOVERY", summary: "The gate is locked.", visibility: "PUBLIC", importance: 0.2, source: {} },
      { candidateId: "pc1", kind: "DISCOVERY", summary: "A whispered password.", visibility: "ACTOR_ONLY", actorIds: ["pc-1"], importance: 0.7, source: {} },
      { candidateId: "gm", kind: "SEMANTIC", semanticKey: "duke:possessed", summary: "The duke is possessed.", visibility: "GM_ONLY", importance: 1, source: { worldFactId: "possession" } },
    ],
  });

  assert.deepEqual(service.projectForActor(state, "pc-1").map((r) => r.memoryId), ["public", "pc1", "gm"].filter((id) => id !== "gm"));
  assert.deepEqual(service.projectForActor(state, "pc-2").map((r) => r.memoryId), ["public"]);
});

test("memory writes cannot mutate authoritative world state", async () => {
  const world = Object.freeze({ revision: 7, facts: Object.freeze([{ factId: "truth", statement: "The duke is possessed." }]) });
  const before = JSON.stringify(world);
  const store = new MemoryStore(emptyMemory);
  const service = new OracleMemoryService(store);
  await service.ingestCandidates({
    campaignId: "campaign-1",
    expectedRevision: 0,
    worldRevision: 7,
    candidates: [{ candidateId: "memory-1", kind: "SEMANTIC", semanticKey: "duke:state", summary: "The hero suspects the duke.", visibility: "ACTOR_ONLY", actorIds: ["pc-1"], importance: 0.7, source: { worldFactId: "truth" } }],
  });
  assert.equal(JSON.stringify(world), before);
});

test("stale memory revisions cannot overwrite newer memory state", async () => {
  const store = new MemoryStore(emptyMemory);
  const service = new OracleMemoryService(store);
  await service.ingestCandidates({ campaignId: "campaign-1", expectedRevision: 0, candidates: [] });
  await assert.rejects(
    () => service.ingestCandidates({ campaignId: "campaign-1", expectedRevision: 0, candidates: [] }),
    MemoryStateConflictError,
  );
});

test("session state tracks turns, open threads, compact summaries, and closure", async () => {
  const store = new SessionStore(activeSession);
  const service = new OracleSessionStateService(store);
  const updated = await service.apply({
    campaignId: "campaign-1",
    sessionId: "session-1",
    expectedRevision: 0,
    mutations: [
      { type: "RECORD_TURN", turnId: "turn-1" },
      { type: "OPEN_THREAD", memoryId: "thread-cult" },
      { type: "ADD_SUMMARY", block: { summaryId: "summary-1", text: "The heroes questioned the duke about the hidden cult.", memoryIds: ["thread-cult"] } },
    ],
  });
  assert.equal(updated.turnCount, 1);
  assert.equal(updated.lastTurnId, "turn-1");
  assert.deepEqual(updated.openThreadMemoryIds, ["thread-cult"]);
  assert.equal(updated.summaryBlocks.length, 1);

  const closed = await service.apply({
    campaignId: "campaign-1",
    sessionId: "session-1",
    expectedRevision: 1,
    mutations: [{ type: "CLOSE_THREAD", memoryId: "thread-cult" }, { type: "CLOSE_SESSION", endedAt: "2026-08-20T10:00:00+09:00" }],
  });
  assert.equal(closed.status, "CLOSED");
  assert.deepEqual(closed.openThreadMemoryIds, []);
  await assert.rejects(
    () => service.apply({ campaignId: "campaign-1", sessionId: "session-1", expectedRevision: 2, mutations: [{ type: "RECORD_TURN", turnId: "turn-2" }] }),
    /closed session/,
  );
});
