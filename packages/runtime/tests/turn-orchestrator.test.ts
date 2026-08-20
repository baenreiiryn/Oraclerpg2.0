import assert from "node:assert/strict";
import test from "node:test";
import type {
  ActionExecutorPort,
  ActionValidatorPort,
  AiDirectorPort,
  CapabilityBuilderPort,
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
  let validations = 0;

  const stateLoader: StateLoaderPort = {
    async loadTurnState() { return state; },
  };
  const contextBuilder: ContextBuilderPort = {
    async buildContext() {
      return { version: 1, campaignId: state.campaignId, actorId: state.actorId, stateRevision: state.revision, sections: {} };
    },
  };
  const capabilityBuilder: CapabilityBuilderPort = {
    async buildCapabilities() {
      return {
        version: 1,
        capabilities: [{
          operation: "rules.request-evaluation",
          schemaVersion: 1,
          description: "Evaluate the exposed attack action",
          allowedActorIds: ["pc-1"],
          allowedTargetIds: ["goblin-1"],
          allowedRefs: ["attack:longsword"],
        }],
      };
    },
  };
  const aiDirector: AiDirectorPort = {
    async generateTurn() {
      return {
        narrativeDraft: "You raise your weapon.",
        actions: [{
          schemaVersion: 1,
          proposalId: "p1",
          operation: "rules.request-evaluation",
          actorId: "pc-1",
          targetIds: ["goblin-1"],
          payload: { actionRef: "attack:longsword", requestedResolution: "ATTACK" },
        }],
      };
    },
  };
  const actionValidator: ActionValidatorPort = {
    async validate({ proposal }) {
      validations += 1;
      return { proposalId: proposal.proposalId, accepted: true };
    },
  };
  const actionExecutor: ActionExecutorPort = {
    async execute({ proposal }) {
      executions += 1;
      return { proposalId: proposal.proposalId, operation: proposal.operation, status: "applied", result: { resolved: true } };
    },
  };
  const persistence: TurnPersistencePort = {
    async persistTurn(record) { persisted.push(record); },
  };

  return {
    stateLoader, contextBuilder, capabilityBuilder, aiDirector, actionValidator,
    actionExecutor, persistence, ids: { nextTurnId: () => "turn-1" }, persisted,
    getExecutions: () => executions, getValidations: () => validations,
  };
}

test("accepted structured proposal executes only after capability and validation gates", async () => {
  const deps = baseDeps();
  const result = await new TurnOrchestrator(deps).processTurn(intent);
  assert.equal(deps.getValidations(), 1);
  assert.equal(deps.getExecutions(), 1);
  assert.equal(result.resolvedActions[0]?.status, "applied");
  assert.equal(deps.persisted.length, 1);
});

test("validator rejection prevents structured proposal execution", async () => {
  const deps = baseDeps();
  deps.actionValidator.validate = async ({ proposal }) => ({ proposalId: proposal.proposalId, accepted: false, reason: "not_legal" });
  const result = await new TurnOrchestrator(deps).processTurn(intent);
  assert.equal(deps.getExecutions(), 0);
  assert.equal(result.resolvedActions[0]?.status, "rejected");
  assert.equal(result.resolvedActions[0]?.reason, "not_legal");
});

test("proposal outside the turn capability manifest never reaches validation or execution", async () => {
  const deps = baseDeps();
  deps.aiDirector.generateTurn = async () => ({
    narrativeDraft: "You consider another target.",
    actions: [{
      schemaVersion: 1,
      proposalId: "p-outside",
      operation: "rules.request-evaluation",
      actorId: "pc-1",
      targetIds: ["dragon-1"],
      payload: { actionRef: "attack:forbidden", requestedResolution: "ATTACK" },
    }],
  });
  const result = await new TurnOrchestrator(deps).processTurn(intent);
  assert.equal(deps.getValidations(), 0);
  assert.equal(deps.getExecutions(), 0);
  assert.equal(result.resolvedActions[0]?.reason, "capability_not_exposed");
});

test("context from a stale or foreign state revision is rejected before AI generation", async () => {
  const deps = baseDeps();
  let aiCalls = 0;
  deps.contextBuilder.buildContext = async () => ({ version: 1, campaignId: state.campaignId, actorId: state.actorId, stateRevision: 999, sections: {} });
  deps.aiDirector.generateTurn = async () => { aiCalls += 1; return { narrativeDraft: "should not run", actions: [] }; };
  await assert.rejects(() => new TurnOrchestrator(deps).processTurn(intent), /not aligned/);
  assert.equal(aiCalls, 0);
});
