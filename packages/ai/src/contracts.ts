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

export interface OracleContextPackage {
  version: 1;
  campaignId: OracleId;
  actorId: OracleId;
  stateRevision: number;
  sections: Readonly<Record<string, unknown>>;
}

export type AiOperation =
  | "gm.interpret-turn"
  | "gm.narrate"
  | "gm.npc-dialogue"
  | "rules.request-evaluation"
  | "dice.request-roll"
  | "state.request-query"
  | "world.suggest-change";

export interface AiActionProposal {
  proposalId: string;
  operation: AiOperation;
  actorId: OracleId;
  targetIds?: readonly OracleId[];
  payload: Readonly<Record<string, unknown>>;
  rationale?: string;
}

/**
 * The AI may propose actions, but proposals are never authoritative state changes.
 * Mechanical mutations are deliberately absent from this contract.
 */
export interface AiTurnProposal {
  narrativeDraft: string;
  actions: readonly AiActionProposal[];
}

export interface AiTurnRequest {
  intent: TurnIntent;
  context: OracleContextPackage;
  allowedOperations: readonly AiOperation[];
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
    proposal: AiActionProposal;
    state: MechanicalStateSnapshot;
  }): Promise<ActionValidationDecision>;
}

export interface ResolvedAction {
  proposalId: string;
  operation: AiOperation;
  status: "applied" | "rejected";
  reason?: string;
  result?: Readonly<Record<string, unknown>>;
}

export interface ActionExecutorPort {
  execute(input: {
    proposal: AiActionProposal;
    state: MechanicalStateSnapshot;
  }): Promise<ResolvedAction>;
}

export interface TurnRecord {
  turnId: string;
  intent: TurnIntent;
  stateRevision: number;
  narrative: string;
  proposedActions: readonly AiActionProposal[];
  resolvedActions: readonly ResolvedAction[];
}

export interface TurnPersistencePort {
  persistTurn(record: TurnRecord): Promise<void>;
}

export interface TurnIdPort {
  nextTurnId(): string;
}

export const DEFAULT_AI_OPERATIONS: readonly AiOperation[] = [
  "gm.interpret-turn",
  "gm.narrate",
  "gm.npc-dialogue",
  "rules.request-evaluation",
  "dice.request-roll",
  "state.request-query",
  "world.suggest-change",
];
