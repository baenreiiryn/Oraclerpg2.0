import type { OracleId } from "../contracts.js";

export const AI_ACTION_SCHEMA_VERSION = 1 as const;

export type StructuredAiOperation =
  | "rules.request-evaluation"
  | "dice.request-roll"
  | "state.request-query"
  | "state.suggest-mutation"
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

export type CampaignResolutionMethod =
  | "COMBAT"
  | "DIPLOMACY"
  | "STEALTH"
  | "INVESTIGATION"
  | "PUZZLE"
  | "EXPLORATION"
  | "CREATIVE"
  | "MIXED"
  | "OTHER";

export type CampaignStateMutation =
  | { type: "CURRENCY_DELTA"; amountCp: number; reason?: string }
  | { type: "ITEM_ADD"; itemRef?: string; name: string; quantity: number; rarity?: string; magical?: boolean; reason?: string }
  | { type: "ITEM_REMOVE"; itemRef?: string; name?: string; quantity: number; reason?: string }
  | { type: "XP_AWARD"; amount: number; sceneId?: string; resolutionMethod?: CampaignResolutionMethod; reason?: string }
  | { type: "SCENE_RESOLVE"; sceneId: string; meaningful: boolean; xpBudget: number; resolutionMethod: CampaignResolutionMethod; gratuitousCombat?: boolean; reason?: string };

export interface StateMutationSuggestionPayload {
  mutations: readonly CampaignStateMutation[];
  /** The AI proposes changes; the authoritative runtime must validate and apply them. */
  requiresRuntimeValidation: true;
}

export interface WorldChangeSuggestionPayload {
  changeType: "SCENE" | "ENTITY" | "RELATIONSHIP" | "QUEST" | "KNOWLEDGE" | "OTHER";
  summary: string;
  evidenceRefs?: readonly string[];
}

export type RulesEvaluationProposal = ActionProposalBase<"rules.request-evaluation", RulesEvaluationPayload>;
export type DiceRollProposal = ActionProposalBase<"dice.request-roll", DiceRollPayload>;
export type StateQueryProposal = ActionProposalBase<"state.request-query", StateQueryPayload>;
export type StateMutationSuggestionProposal = ActionProposalBase<"state.suggest-mutation", StateMutationSuggestionPayload>;
export type WorldChangeSuggestionProposal = ActionProposalBase<"world.suggest-change", WorldChangeSuggestionPayload>;

export type StructuredAiActionProposal =
  | RulesEvaluationProposal
  | DiceRollProposal
  | StateQueryProposal
  | StateMutationSuggestionProposal
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
    case "state.suggest-mutation":
      return proposal.payload.mutations.flatMap((mutation) => {
        if ((mutation.type === "ITEM_ADD" || mutation.type === "ITEM_REMOVE") && mutation.itemRef) return [mutation.itemRef];
        return [];
      });
    case "dice.request-roll":
    case "world.suggest-change":
      return [];
  }
}
