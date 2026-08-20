import {
  capabilityAllowsProposal,
  type ActionExecutorPort,
  type ActionValidatorPort,
  type AiDirectorPort,
  type CapabilityBuilderPort,
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
  capabilityBuilder: CapabilityBuilderPort;
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
 * AI-3 adds a second gate: the runtime publishes an explicit capability manifest
 * for the turn, and proposals outside that manifest never reach validation/execution.
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

    const capabilityManifest = await this.deps.capabilityBuilder.buildCapabilities({
      intent,
      state,
      context,
    });

    const proposal = await this.deps.aiDirector.generateTurn({
      intent,
      context,
      capabilityManifest,
    });

    const resolvedActions: ResolvedAction[] = [];
    for (const action of proposal.actions) {
      if (!capabilityAllowsProposal(capabilityManifest, action)) {
        resolvedActions.push({
          proposalId: action.proposalId,
          operation: action.operation,
          status: "rejected",
          reason: "capability_not_exposed",
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
      capabilityManifest,
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
