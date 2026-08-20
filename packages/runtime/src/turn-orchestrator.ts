import {
  DEFAULT_AI_OPERATIONS,
  type ActionExecutorPort,
  type ActionValidatorPort,
  type AiDirectorPort,
  type ContextBuilderPort,
  type ResolvedAction,
  type StateLoaderPort,
  type TurnIdPort,
  type TurnIntent,
  type TurnPersistencePort,
  type TurnRecord,
} from "@oraclerpg/ai";

export interface TurnOrchestratorDependencies {
  stateLoader: StateLoaderPort;
  contextBuilder: ContextBuilderPort;
  aiDirector: AiDirectorPort;
  actionValidator: ActionValidatorPort;
  actionExecutor: ActionExecutorPort;
  persistence: TurnPersistencePort;
  ids: TurnIdPort;
}

export interface ProcessedTurn {
  turnId: string;
  narrative: string;
  resolvedActions: readonly ResolvedAction[];
  stateRevision: number;
}

/**
 * Coordinates a turn without granting the AI authority over state.
 * State is loaded by the runtime, AI emits proposals, validation gates every
 * proposal, and only the runtime-owned executor may apply accepted actions.
 */
export class TurnOrchestrator {
  constructor(private readonly deps: TurnOrchestratorDependencies) {}

  async processTurn(intent: TurnIntent): Promise<ProcessedTurn> {
    this.assertIntent(intent);

    const state = await this.deps.stateLoader.loadTurnState(intent);
    if (state.campaignId !== intent.campaignId || state.actorId !== intent.actorId) {
      throw new Error("Loaded state does not match the authoritative turn intent");
    }

    const context = await this.deps.contextBuilder.buildContext({ intent, state });
    if (
      context.campaignId !== state.campaignId ||
      context.actorId !== state.actorId ||
      context.stateRevision !== state.revision
    ) {
      throw new Error("Context package is not aligned with authoritative state");
    }

    const proposal = await this.deps.aiDirector.generateTurn({
      intent,
      context,
      allowedOperations: DEFAULT_AI_OPERATIONS,
    });

    const resolvedActions: ResolvedAction[] = [];
    for (const action of proposal.actions) {
      if (!DEFAULT_AI_OPERATIONS.includes(action.operation)) {
        resolvedActions.push({
          proposalId: action.proposalId,
          operation: action.operation,
          status: "rejected",
          reason: "operation_not_allowed",
        });
        continue;
      }

      const decision = await this.deps.actionValidator.validate({ proposal: action, state });
      if (!decision.accepted) {
        resolvedActions.push({
          proposalId: action.proposalId,
          operation: action.operation,
          status: "rejected",
          ...(decision.reason ? { reason: decision.reason } : {}),
        });
        continue;
      }

      const result = await this.deps.actionExecutor.execute({ proposal: action, state });
      resolvedActions.push(result);
    }

    const turnId = this.deps.ids.nextTurnId();
    const record: TurnRecord = {
      turnId,
      intent,
      stateRevision: state.revision,
      narrative: proposal.narrativeDraft,
      proposedActions: proposal.actions,
      resolvedActions,
    };
    await this.deps.persistence.persistTurn(record);

    return {
      turnId,
      narrative: proposal.narrativeDraft,
      resolvedActions,
      stateRevision: state.revision,
    };
  }

  private assertIntent(intent: TurnIntent): void {
    if (!intent.campaignId.trim()) throw new Error("campaignId is required");
    if (!intent.actorId.trim()) throw new Error("actorId is required");
    if (!intent.clientRequestId.trim()) throw new Error("clientRequestId is required");
    if (!intent.message.trim()) throw new Error("turn message is required");
  }
}
