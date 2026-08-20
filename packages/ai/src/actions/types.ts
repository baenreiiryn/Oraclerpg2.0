import type { OracleId } from "../contracts.js";

export const AI_ACTION_SCHEMA_VERSION = 1 as const;

export type StructuredAiOperation =
  | "rules.request-evaluation"
  | "dice.request-roll"
  | "state.request-query"
  | "world.suggest-change";

export interface ActionProposalBase<TOperation extends StructuredAiOperation, TPayload> {
  schemaVersion: typeof AI_ACTION_SCHEMA_VERSION;
  proposalId: string;
  operation: TOperation;
  actorId: OracleId;
  targetIds?: readonly OracleId[];
  payload: Readonly<TPayload>;
  rationale?: string;
}

export interface RulesEvaluationPayload {
  actionRef: string;
  featureRef?: string;
  itemRef?: string;
  spellRef?: string;
  requestedResolution?: "LEGALITY" | "ATTACK" | "DAMAGE" | "SAVE" | "CHECK" | "RESOURCE" | "OTHER";
}

export interface DiceRollPayload {
  formula: string;
  purpose: "ATTACK" | "DAMAGE" | "SAVE" | "CHECK" | "HEALING" | "TABLE" | "OTHER";
  label?: string;
}

export interface StateQueryPayload {
  query: "ACTOR" | "ENTITY" | "SCENE" | "RESOURCE" | "ITEM" | "SPELL" | "FEATURE" | "OTHER";
  ref?: string;
}

export interface WorldChangeSuggestionPayload {
  changeType: "SCENE" | "ENTITY" | "RELATIONSHIP" | "QUEST" | "KNOWLEDGE" | "OTHER";
  summary: string;
  evidenceRefs?: readonly string[];
}

export type RulesEvaluationProposal = ActionProposalBase<"rules.request-evaluation", RulesEvaluationPayload>;
export type DiceRollProposal = ActionProposalBase<"dice.request-roll", DiceRollPayload>;
export type StateQueryProposal = ActionProposalBase<"state.request-query", StateQueryPayload>;
export type WorldChangeSuggestionProposal = ActionProposalBase<"world.suggest-change", WorldChangeSuggestionPayload>;

export type StructuredAiActionProposal =
  | RulesEvaluationProposal
  | DiceRollProposal
  | StateQueryProposal
  | WorldChangeSuggestionProposal;

export interface AiActionCapability {
  operation: StructuredAiOperation;
  schemaVersion: typeof AI_ACTION_SCHEMA_VERSION;
  description: string;
  allowedActorIds?: readonly OracleId[];
  allowedTargetIds?: readonly OracleId[];
  allowedRefs?: readonly string[];
}

export interface AiCapabilityManifest {
  version: 1;
  capabilities: readonly AiActionCapability[];
}

export function operationsFromCapabilityManifest(
  manifest: AiCapabilityManifest,
): readonly StructuredAiOperation[] {
  return [...new Set(manifest.capabilities.map((capability) => capability.operation))];
}

export function capabilityAllowsProposal(
  manifest: AiCapabilityManifest,
  proposal: StructuredAiActionProposal,
): boolean {
  return manifest.capabilities.some((capability) => {
    if (capability.operation !== proposal.operation || capability.schemaVersion !== proposal.schemaVersion) return false;
    if (capability.allowedActorIds && !capability.allowedActorIds.includes(proposal.actorId)) return false;
    if (
      capability.allowedTargetIds &&
      (proposal.targetIds ?? []).some((targetId) => !capability.allowedTargetIds?.includes(targetId))
    ) return false;

    if (capability.allowedRefs) {
      const refs = proposalRefs(proposal);
      if (refs.some((ref) => !capability.allowedRefs?.includes(ref))) return false;
    }
    return true;
  });
}

function proposalRefs(proposal: StructuredAiActionProposal): readonly string[] {
  switch (proposal.operation) {
    case "rules.request-evaluation":
      return [
        proposal.payload.actionRef,
        proposal.payload.featureRef,
        proposal.payload.itemRef,
        proposal.payload.spellRef,
      ].filter((value): value is string => Boolean(value));
    case "state.request-query":
      return proposal.payload.ref ? [proposal.payload.ref] : [];
    case "dice.request-roll":
    case "world.suggest-change":
      return [];
  }
}
