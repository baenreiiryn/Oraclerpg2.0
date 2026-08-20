import assert from "node:assert/strict";
import test from "node:test";
import {
  OracleGmRuntime,
  type CompletedGmTurn,
} from "../src/index.js";
import type {
  AiCapabilityManifest,
  AiTurnProposal,
  MechanicalStateSnapshot,
  OracleAiGatewayRequest,
  OracleAiGatewayResponse,
  OracleContextPackage,
  StructuredAiActionProposal,
  TurnIntent,
  TurnRecord,
} from "@oraclerpg/ai";

const intent: TurnIntent = {
  campaignId: "c1",
  actorId: "pc1",
  message: "I attack the goblin.",
  clientRequestId: "req1",
  sessionId: "s1",
};

const state: MechanicalStateSnapshot = {
  campaignId: "c1",
  actorId: "pc1",
  revision: 7,
  data: {},
};

const context: OracleContextPackage = {
  version: 1,
  campaignId: "c1",
  actorId: "pc1",
  stateRevision: 7,
  sections: {},
};

const manifest: AiCapabilityManifest = {
  version: 1,
  capabilities: [
    {
      operation: "rules.request-evaluation",
      schemaVersion: 1,
      description: "attack",
      allowedActorIds: ["pc1"],
      allowedTargetIds: ["goblin1"],
      allowedRefs: ["attack:sword"],
    },
  ],
};

const action: StructuredAiActionProposal = {
  schemaVersion: 1,
  proposalId: "p1",
  operation: "rules.request-evaluation",
  actorId: "pc1",
  targetIds: ["goblin1"],
  payload: { actionRef: "attack:sword", requestedResolution: "ATTACK" },
};

function buildRuntime(options: { reject?: boolean; outOfCapability?: boolean } = {}) {
  const calls: string[] = [];
  const records: TurnRecord[] = [];
  const proposal: AiTurnProposal = {
    narrativeDraft: "draft",
    actions: [options.outOfCapability ? { ...action, targetIds: ["dragon"] } : action],
  };

  const gateway = {
    async generate(request: OracleAiGatewayRequest): Promise<OracleAiGatewayResponse> {
      calls.push(`gateway:${request.operation}`);
      if (request.operation === "gm.interpret-turn") {
        return {
          requestId: request.requestId,
          alias: request.alias,
          output: JSON.stringify(proposal),
          structuredOutput: proposal,
          usage: {},
        };
      }
      return { requestId: request.requestId, alias: request.alias, output: "Final narration", usage: {} };
    },
  };

  const runtime = new OracleGmRuntime({
    stateLoader: { async loadTurnState() { calls.push("state"); return state; } },
    contextBuilder: { async buildContext() { calls.push("context"); return context; } },
    capabilityBuilder: { async buildCapabilities() { calls.push("capabilities"); return manifest; } },
    retrieval: {
      async retrieve(query) {
        calls.push("retrieval");
        return { query, items: [], usedTokens: 0, remainingTokens: query.maxTokens, droppedForBudget: 0, droppedForVisibility: 0 };
      },
    },
    gateway,
    proposalDecoder: { decode(input) { calls.push("decode"); return input as AiTurnProposal; } },
    actionValidator: {
      async validate() {
        calls.push("validate");
        return { proposalId: "p1", accepted: !options.reject, ...(options.reject ? { reason: "illegal" } : {}) };
      },
    },
    actionExecutor: {
      async execute() {
        calls.push("execute");
        return { proposalId: "p1", operation: "rules.request-evaluation", status: "applied", result: { hit: true } };
      },
    },
    memoryExtractor: {
      async extract() {
        calls.push("memory-extract");
        return [{ candidateId: "m1", kind: "EPISODIC", summary: "A goblin was attacked.", visibility: "PUBLIC", importance: 0.5, source: {} }];
      },
    },
    memoryWriter: { async ingest() { calls.push("memory-write"); } },
    sessionWriter: { async recordTurn() { calls.push("session"); } },
    persistence: { async persistTurn(record) { calls.push("persist"); records.push(record); } },
    ids: { nextTurnId() { return "turn1"; } },
  }, { retrievalMaxTokens: 100 });

  return { runtime, calls, records };
}

test("AI-9 executes a complete authoritative GM turn", async () => {
  const { runtime, calls, records } = buildRuntime();
  const result: CompletedGmTurn = await runtime.processTurn(intent);

  assert.equal(result.narrative, "Final narration");
  assert.equal(result.extractedMemoryCount, 1);
  assert.equal(result.resolvedActions[0]?.status, "applied");
  assert.equal(records[0]?.narrative, "Final narration");
  assert.ok(calls.indexOf("validate") < calls.indexOf("execute"));
  assert.ok(calls.indexOf("execute") < calls.indexOf("gateway:gm.narrate"));
  assert.ok(calls.indexOf("persist") < calls.indexOf("memory-extract"));
  assert.ok(calls.includes("session"));
});

test("proposal outside capability never reaches validator or executor", async () => {
  const { runtime, calls } = buildRuntime({ outOfCapability: true });
  const result = await runtime.processTurn(intent);
  assert.equal(result.resolvedActions[0]?.reason, "capability_not_exposed");
  assert.equal(calls.includes("validate"), false);
  assert.equal(calls.includes("execute"), false);
});

test("validator rejection prevents authoritative execution", async () => {
  const { runtime, calls } = buildRuntime({ reject: true });
  const result = await runtime.processTurn(intent);
  assert.equal(result.resolvedActions[0]?.status, "rejected");
  assert.equal(calls.includes("validate"), true);
  assert.equal(calls.includes("execute"), false);
});

test("misaligned context aborts before Gateway generation", async () => {
  const { runtime, calls } = buildRuntime();
  (runtime as any).deps.contextBuilder = { async buildContext() { calls.push("context"); return { ...context, stateRevision: 999 }; } };
  await assert.rejects(() => runtime.processTurn(intent), /not aligned/);
  assert.equal(calls.some((call) => call.startsWith("gateway:")), false);
});
