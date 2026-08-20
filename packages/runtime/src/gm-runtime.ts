import {
  capabilityAllowsProposal,
  type ActionExecutorPort,
  type ActionValidatorPort,
  type AiCapabilityManifest,
  type AiTurnProposal,
  type CapabilityBuilderPort,
  type ContextBuilderPort,
  type MechanicalStateSnapshot,
  type OracleAiOperationRouterPort,
  type OracleContextPackage,
  type ResolvedAction,
  type StateLoaderPort,
  type StructuredAiActionProposal,
  type TurnIdPort,
  type TurnIntent,
  type TurnPersistencePort,
  type TurnRecord,
} from "@oraclerpg/ai";
import type { MemoryCandidate } from "./memory/types.js";
import type { RetrievalQuery, RetrievalResult } from "./retrieval/types.js";

export interface GmRetrievalPort {
  retrieve(query: RetrievalQuery): Promise<RetrievalResult>;
}

export interface AiProposalDecoderPort {
  decode(input: unknown): AiTurnProposal;
}

export interface GmMemoryExtractionPort {
  extract(input: {
    turnId: string;
    intent: TurnIntent;
    context: OracleContextPackage;
    retrieval: RetrievalResult;
    finalNarrative: string;
    proposedActions: readonly StructuredAiActionProposal[];
    resolvedActions: readonly ResolvedAction[];
  }): Promise<readonly MemoryCandidate[]>;
}

export interface GmMemoryWriterPort {
  ingest(input: {
    campaignId: string;
    sessionId?: string;
    worldRevision: number;
    candidates: readonly MemoryCandidate[];
  }): Promise<void>;
}

export interface GmSessionWriterPort {
  recordTurn(input: {
    campaignId: string;
    sessionId: string;
    turnId: string;
  }): Promise<void>;
}

export interface OracleGmRuntimeDependencies {
  stateLoader: StateLoaderPort;
  contextBuilder: ContextBuilderPort;
  capabilityBuilder: CapabilityBuilderPort;
  retrieval: GmRetrievalPort;
  operationRouter: OracleAiOperationRouterPort;
  proposalDecoder: AiProposalDecoderPort;
  actionValidator: ActionValidatorPort;
  actionExecutor: ActionExecutorPort;
  memoryExtractor: GmMemoryExtractionPort;
  memoryWriter: GmMemoryWriterPort;
  sessionWriter: GmSessionWriterPort;
  persistence: TurnPersistencePort;
  ids: TurnIdPort;
}

export interface OracleGmRuntimeOptions {
  retrievalMaxTokens?: number;
  proposalMaxOutputTokens?: number;
  narrationMaxOutputTokens?: number;
}

export interface CompletedGmTurn {
  turnId: string;
  narrative: string;
  stateRevision: number;
  retrieval: RetrievalResult;
  capabilityManifest: AiCapabilityManifest;
  proposedActions: readonly StructuredAiActionProposal[];
  resolvedActions: readonly ResolvedAction[];
  extractedMemoryCount: number;
}

export class OracleGmRuntime {
  private readonly retrievalMaxTokens: number;
  private readonly proposalMaxOutputTokens: number;
  private readonly narrationMaxOutputTokens: number;

  constructor(
    private readonly deps: OracleGmRuntimeDependencies,
    options: OracleGmRuntimeOptions = {},
  ) {
    this.retrievalMaxTokens = options.retrievalMaxTokens ?? 2400;
    this.proposalMaxOutputTokens = options.proposalMaxOutputTokens ?? 1400;
    this.narrationMaxOutputTokens = options.narrationMaxOutputTokens ?? 1200;
  }

  async processTurn(intent: TurnIntent): Promise<CompletedGmTurn> {
    this.assertIntent(intent);
    const state = await this.deps.stateLoader.loadTurnState(intent);
    this.assertState(intent, state);

    const context = await this.deps.contextBuilder.buildContext({ intent, state });
    this.assertContext(state, context);

    const retrieval = await this.deps.retrieval.retrieve({
      campaignId: intent.campaignId,
      actorId: intent.actorId,
      text: intent.message,
      maxTokens: this.retrievalMaxTokens,
    });

    const capabilityManifest = await this.deps.capabilityBuilder.buildCapabilities({ intent, state, context });

    const proposalResponse = await this.deps.operationRouter.run({
      requestId: `${intent.clientRequestId}:proposal`,
      operation: "gm.interpret-turn",
      input: JSON.stringify({ message: intent.message, context, retrievedContext: retrieval.items, capabilityManifest }),
      maxOutputTokens: this.proposalMaxOutputTokens,
      campaignId: intent.campaignId,
      actorId: intent.actorId,
      tags: ["runtime:gm-turn", "stage:proposal"],
    });

    const proposal = this.deps.proposalDecoder.decode(proposalResponse.structuredOutput ?? proposalResponse.output);
    const resolvedActions = await this.resolveActions(proposal.actions, capabilityManifest, state);

    const narrationResponse = await this.deps.operationRouter.run({
      requestId: `${intent.clientRequestId}:narration`,
      operation: "gm.narrate",
      input: JSON.stringify({ playerMessage: intent.message, narrativeDraft: proposal.narrativeDraft, context, retrievedContext: retrieval.items, resolvedActions }),
      maxOutputTokens: this.narrationMaxOutputTokens,
      campaignId: intent.campaignId,
      actorId: intent.actorId,
      tags: ["runtime:gm-turn", "stage:narration"],
    });

    const finalNarrative = narrationResponse.output;
    const turnId = this.deps.ids.nextTurnId();
    const record: TurnRecord = { turnId, intent, stateRevision: state.revision, narrative: finalNarrative, capabilityManifest, proposedActions: proposal.actions, resolvedActions };
    await this.deps.persistence.persistTurn(record);

    const memories = await this.deps.memoryExtractor.extract({ turnId, intent, context, retrieval, finalNarrative, proposedActions: proposal.actions, resolvedActions });
    await this.deps.memoryWriter.ingest({ campaignId: intent.campaignId, ...(intent.sessionId ? { sessionId: intent.sessionId } : {}), worldRevision: state.revision, candidates: memories });

    if (intent.sessionId) {
      await this.deps.sessionWriter.recordTurn({ campaignId: intent.campaignId, sessionId: intent.sessionId, turnId });
    }

    return { turnId, narrative: finalNarrative, stateRevision: state.revision, retrieval, capabilityManifest, proposedActions: proposal.actions, resolvedActions, extractedMemoryCount: memories.length };
  }

  private async resolveActions(actions: readonly StructuredAiActionProposal[], manifest: AiCapabilityManifest, state: MechanicalStateSnapshot): Promise<ResolvedAction[]> {
    const resolved: ResolvedAction[] = [];
    for (const action of actions) {
      if (!capabilityAllowsProposal(manifest, action)) {
        resolved.push({ proposalId: action.proposalId, operation: action.operation, status: "rejected", reason: "capability_not_exposed" });
        continue;
      }
      const decision = await this.deps.actionValidator.validate({ proposal: action, state });
      if (!decision.accepted) {
        resolved.push({ proposalId: action.proposalId, operation: action.operation, status: "rejected", ...(decision.reason ? { reason: decision.reason } : {}) });
        continue;
      }
      resolved.push(await this.deps.actionExecutor.execute({ proposal: action, state }));
    }
    return resolved;
  }

  private assertIntent(intent: TurnIntent): void {
    if (!intent.campaignId.trim()) throw new Error("campaignId is required");
    if (!intent.actorId.trim()) throw new Error("actorId is required");
    if (!intent.clientRequestId.trim()) throw new Error("clientRequestId is required");
    if (!intent.message.trim()) throw new Error("turn message is required");
  }

  private assertState(intent: TurnIntent, state: MechanicalStateSnapshot): void {
    if (state.campaignId !== intent.campaignId || state.actorId !== intent.actorId) throw new Error("Loaded state does not match the authoritative turn intent");
  }

  private assertContext(state: MechanicalStateSnapshot, context: OracleContextPackage): void {
    if (context.campaignId !== state.campaignId || context.actorId !== state.actorId || context.stateRevision !== state.revision) throw new Error("Context package is not aligned with authoritative state");
  }
}
