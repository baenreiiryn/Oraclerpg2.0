import assert from "node:assert/strict";
import test from "node:test";
import type {
  ActionExecutorPort,
  ActionValidatorPort,
  AiDirectorPort,
  ContextBuilderPort,
  StateLoaderPort,
  TurnPersistencePort,
} from "@oraclerpg/ai";
import { TurnOrchestrator } from "../src/turn-orchestrator.js";

const intent = {
  campaignId: "campaign-1",
  actorId: "pc-1",
  message: "I attack the goblin.",
  clientRequestId: "request-1",
} as const;

const state = {
  campaignId: "campaign-1",
  actorId: "pc-1",
  revision: 7,
  data: Object.freeze({ hp: 12 }),
} as const;

function baseDeps() {
  const persisted: unknown[] = [];
  let executions = 0;

  const stateLoader: StateLoaderPort = {
    async loadTurnState() {
      return state;
    },
  };
  const contextBuilder: ContextBuilderPort = {
    async buildContext() {
      return {
        version: 1,
        campaignId: state.campaignId,
        actorId: state.actorId,
        stateRevision: state.revision,
        sections: {},
      };
    },
  };
  const aiDirector: AiDirectorPort = {
    async generateTurn() {
      return {
        narrativeDraft: "You raise your weapon.",
        actions: [
          {
            proposalId: "p1",
            operation: "rules.request-evaluation",
            actorId: "pc-1",
            targetIds: ["goblin-1"],
            payload: { action: "attack" },
          },
        ],
      };
    },
  };
  const actionExecutor: ActionExecutorPort = {
    async execute({ proposal }) {
      executions += 1;
      return {
        proposalId: proposal.proposalId,
        operation: proposal.operation,
        status: "applied",
        result: { resolved: true },
      };
    },
  };
  const persistence: TurnPersistencePort = {
    async persistTurn(record) {
      persisted.push(record);
    },
  };

  return {
    stateLoader,
    contextBuilder,
    aiDirector,
    actionExecutor,
    persistence,
    ids: { nextTurnId: () => "turn-1" },
    persisted,
    getExecutions: () => executions,
  };
}

test("rejected AI proposals never reach the state executor", async () => {
  const deps = baseDeps();
  const actionValidator: ActionValidatorPort = {
    async validate({ proposal }) {
      return { proposalId: proposal.proposalId, accepted: false, reason: "not_legal" };
    },
  };
  const orchestrator = new TurnOrchestrator({ ...deps, actionValidator });
  const result = await orchestrator.processTurn(intent);

  assert.equal(deps.getExecutions(), 0);
  assert.equal(result.resolvedActions[0]?.status, "rejected");
  assert.equal(deps.persisted.length, 1);
});

test("accepted proposals execute only after validation", async () => {
  const deps = baseDeps();
  let validations = 0;
  const actionValidator: ActionValidatorPort = {
    async validate({ proposal }) {
      validations += 1;
      return { proposalId: proposal.proposalId, accepted: true };
    },
  };
  const orchestrator = new TurnOrchestrator({ ...deps, actionValidator });
  const result = await orchestrator.processTurn(intent);

  assert.equal(validations, 1);
  assert.equal(deps.getExecutions(), 1);
  assert.equal(result.resolvedActions[0]?.status, "applied");
});

test("context from a stale or foreign state revision is rejected before AI generation", async () => {
  const deps = baseDeps();
  let aiCalls = 0;
  deps.contextBuilder.buildContext = async () => ({
    version: 1,
    campaignId: state.campaignId,
    actorId: state.actorId,
    stateRevision: 999,
    sections: {},
  });
  deps.aiDirector.generateTurn = async () => {
    aiCalls += 1;
    return { narrativeDraft: "should not run", actions: [] };
  };
  const actionValidator: ActionValidatorPort = {
    async validate({ proposal }) {
      return { proposalId: proposal.proposalId, accepted: true };
    },
  };
  const orchestrator = new TurnOrchestrator({ ...deps, actionValidator });

  await assert.rejects(() => orchestrator.processTurn(intent), /not aligned/);
  assert.equal(aiCalls, 0);
});
