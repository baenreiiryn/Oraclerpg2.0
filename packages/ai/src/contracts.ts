import type { AiCapabilityManifest, StructuredAiActionProposal, StructuredAiOperation } from "./actions/types.js";
import type { OracleContextSections } from "./context/types.js";

export type OracleId = string;

export interface TurnIntent {
  campaignId: OracleId;
  actorId: OracleId;
  message: string;
  clientRequestId: string;
  sessionId?: OracleId;
}

export interface MechanicalStateSnapshot {
  campaignId: OracleId;
  revision: number;
  actorId: OracleId;
  data: Readonly<Record<string, unknown>>;
}

/** Legacy compatibility contract from AI-1. New Context Engine implementations emit v2. */
export interface OracleContextPackageV1 {
  version: 1;
  campaignId: OracleId;
  actorId: OracleId;
  stateRevision: number;
  sections: Readonly<Record<string, unknown>>;
}

/** Typed Context Engine 2.0 contract. */
export interface OracleContextPackageV2 {
  version: 2;
  campaignId: OracleId;
  actorId: OracleId;
  stateRevision: number;
  sections: OracleContextSections;
}

export type OracleContextPackage = OracleContextPackageV1 | OracleContextPackageV2;

/** Narrative operations are model tasks, not executable state actions. */
export type AiNarrativeOperation = "gm.interpret-turn" | "gm.narrate" | "gm.npc-dialogue";
export type AiOperation = AiNarrativeOperation | StructuredAiOperation;

/** @deprecated AI-3 uses StructuredAiActionProposal. */
export type AiActionProposal = StructuredAiActionProposal;

/**
 * The AI may propose structured actions, but proposals are never authoritative state changes.
 * Mechanical mutations are deliberately absent from this contract.
 */
export interface AiTurnProposal {
  narrativeDraft: string;
  actions: readonly StructuredAiActionProposal[];
}

export interface AiTurnRequest {
  intent: TurnIntent;
  context: OracleContextPackage;
  capabilityManifest: AiCapabilityManifest;
}

export interface AiDirectorPort {
  generateTurn(request: AiTurnRequest): Promise<AiTurnProposal>;
}

export interface ContextBuilderPort {
  buildContext(input: {
    intent: TurnIntent;
    state: MechanicalStateSnapshot;
  }): Promise<OracleContextPackage>;
}

export interface CapabilityBuilderPort {
  buildCapabilities(input: {
    intent: TurnIntent;
    state: MechanicalStateSnapshot;
    context: OracleContextPackage;
  }): Promise<AiCapabilityManifest>;
}

export interface StateLoaderPort {
  loadTurnState(intent: TurnIntent): Promise<MechanicalStateSnapshot>;
}

export interface ActionValidationDecision {
  proposalId: string;
  accepted: boolean;
  reason?: string;
}

export interface ActionValidatorPort {
  validate(input: {
    proposal: StructuredAiActionProposal;
    state: MechanicalStateSnapshot;
  }): Promise<ActionValidationDecision>;
}

export interface ResolvedAction {
  proposalId: string;
  operation: StructuredAiOperation;
  status: "applied" | "rejected";
  reason?: string;
  result?: Readonly<Record<string, unknown>>;
}

export interface ActionExecutorPort {
  execute(input: {
    proposal: StructuredAiActionProposal;
    state: MechanicalStateSnapshot;
  }): Promise<ResolvedAction>;
}

export interface TurnRecord {
  turnId: string;
  intent: TurnIntent;
  stateRevision: number;
  narrative: string;
  capabilityManifest: AiCapabilityManifest;
  proposedActions: readonly StructuredAiActionProposal[];
  resolvedActions: readonly ResolvedAction[];
}

export interface TurnPersistencePort {
  persistTurn(record: TurnRecord): Promise<void>;
}

export interface TurnIdPort {
  nextTurnId(): string;
}
