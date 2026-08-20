import type {
  ActionExecutorPort,
  ActionValidationDecision,
  ActionValidatorPort,
  MechanicalStateSnapshot,
  ResolvedAction,
  RulesEvaluationProposal,
  StateQueryProposal,
  StructuredAiActionProposal,
} from "@oraclerpg/ai";
import type { ActivityData, ResourceCost, RuntimeValueRef } from "@oraclerpg/schema";
import type {
  ActorRulesState,
  CompendiumLookupPort,
  ResourceRequirement,
  RulesCompendiumRecord,
  RulesResolution,
  RulesStateProjectionPort,
} from "./types.js";

export class RulesCompendiumBridge {
  constructor(
    private readonly compendium: CompendiumLookupPort,
    private readonly stateProjection: RulesStateProjectionPort,
  ) {}

  async resolve(proposal: RulesEvaluationProposal, state: MechanicalStateSnapshot): Promise<RulesResolution> {
    const rulesState = await this.stateProjection.projectRulesState(state);
    if (rulesState.actorId !== state.actorId || proposal.actorId !== state.actorId) {
      return illegal(proposal, rulesState, "actor_not_authoritative");
    }

    const invalidTarget = (proposal.targetIds ?? []).find((id) => id !== proposal.actorId && !rulesState.availableTargetIds.includes(id));
    if (invalidTarget) return illegal(proposal, rulesState, "target_not_available");

    if (proposal.payload.actionRef === "oracle.action:short-rest") {
      return rulesState.shortRestAllowed === false
        ? illegal(proposal, rulesState, "short_rest_not_allowed")
        : legal(proposal, rulesState, "short_rest_available");
    }
    if (proposal.payload.actionRef === "oracle.action:long-rest") {
      return rulesState.longRestAllowed === false
        ? illegal(proposal, rulesState, "long_rest_not_allowed")
        : legal(proposal, rulesState, "long_rest_available");
    }

    const sourceRef = proposal.payload.featureRef ?? proposal.payload.spellRef ?? proposal.payload.itemRef;
    if (!sourceRef) {
      return rulesState.availableActionRefs.includes(proposal.payload.actionRef)
        ? legal(proposal, rulesState, "runtime_action_available")
        : illegal(proposal, rulesState, "action_not_available");
    }

    const source = await this.compendium.getByCanonicalId(sourceRef);
    if (!source) return illegal(proposal, rulesState, "compendium_ref_not_found");

    const ownershipReason = sourceAvailabilityReason(source, sourceRef, rulesState);
    if (ownershipReason) return illegal(proposal, rulesState, ownershipReason, source);

    const activity = findActivity(source, proposal.payload.actionRef);
    if (!activity) return illegal(proposal, rulesState, "activity_not_found", source);

    if (activity.manualAdjudication || source.data.manualAdjudication) {
      return manual(proposal, rulesState, "manual_adjudication_required", source, activity);
    }

    const costs = resolveCosts(activity.costs ?? [], source, rulesState);
    if (costs.unresolved) {
      return manual(proposal, rulesState, "runtime_cost_resolution_required", source, activity, costs.requirements);
    }
    const insufficient = costs.requirements.find((requirement) => requirement.available < requirement.amount);
    if (insufficient) {
      return illegal(proposal, rulesState, `insufficient_resource:${insufficient.resourceId}`, source, activity, costs.requirements);
    }

    return legal(proposal, rulesState, "activity_available", source, activity, costs.requirements);
  }

  async query(proposal: StateQueryProposal): Promise<Readonly<Record<string, unknown>>> {
    if (!proposal.payload.ref || !["ITEM", "SPELL", "FEATURE"].includes(proposal.payload.query)) {
      return { found: false, reason: "unsupported_compendium_query" };
    }
    const record = await this.compendium.getByCanonicalId(proposal.payload.ref);
    if (!record) return { found: false, ref: proposal.payload.ref };
    return {
      found: true,
      canonicalId: record.canonicalId,
      entityType: record.entityType,
      kind: record.kind,
      name: record.name,
      activities: record.activities.map((activity) => ({ id: activity.id, name: activity.name, kind: activity.kind })),
    };
  }
}

export class RulesBridgeActionValidator implements ActionValidatorPort {
  constructor(private readonly fallback?: ActionValidatorPort) {}

  async validate(input: { proposal: StructuredAiActionProposal; state: MechanicalStateSnapshot }): Promise<ActionValidationDecision> {
    if (input.proposal.operation === "rules.request-evaluation" || input.proposal.operation === "state.request-query") {
      return { proposalId: input.proposal.proposalId, accepted: true };
    }
    if (this.fallback) return this.fallback.validate(input);
    return { proposalId: input.proposal.proposalId, accepted: false, reason: "unsupported_by_rules_bridge" };
  }
}

export class RulesBridgeActionExecutor implements ActionExecutorPort {
  constructor(
    private readonly bridge: RulesCompendiumBridge,
    private readonly fallback?: ActionExecutorPort,
  ) {}

  async execute(input: { proposal: StructuredAiActionProposal; state: MechanicalStateSnapshot }): Promise<ResolvedAction> {
    if (input.proposal.operation === "rules.request-evaluation") {
      const result = await this.bridge.resolve(input.proposal, input.state);
      return {
        proposalId: input.proposal.proposalId,
        operation: input.proposal.operation,
        status: "applied",
        result: result as unknown as Readonly<Record<string, unknown>>,
      };
    }
    if (input.proposal.operation === "state.request-query") {
      const result = await this.bridge.query(input.proposal);
      return { proposalId: input.proposal.proposalId, operation: input.proposal.operation, status: "applied", result };
    }
    if (this.fallback) return this.fallback.execute(input);
    return {
      proposalId: input.proposal.proposalId,
      operation: input.proposal.operation,
      status: "rejected",
      reason: "unsupported_by_rules_bridge",
    };
  }
}

function sourceAvailabilityReason(source: RulesCompendiumRecord, ref: string, state: ActorRulesState): string | undefined {
  if (source.kind === "feature" && !state.usableFeatureRefs.includes(ref)) return "feature_not_usable";
  if (source.kind === "spell" && !state.castableSpellRefs.includes(ref)) return "spell_not_castable";
  if (source.kind === "item" && !state.usableItemRefs.includes(ref)) return "item_not_usable";
  return undefined;
}

function findActivity(source: RulesCompendiumRecord, actionRef: string): ActivityData | undefined {
  return source.activities.find((activity) =>
    activity.id === actionRef || `${source.canonicalId}#${activity.id}` === actionRef,
  );
}

function resolveCosts(
  costs: readonly ResourceCost[],
  source: RulesCompendiumRecord,
  state: ActorRulesState,
): { requirements: ResourceRequirement[]; unresolved: boolean } {
  const requirements: ResourceRequirement[] = [];
  let unresolved = false;
  for (const cost of costs) {
    if (typeof cost.amount !== "number") {
      unresolved = true;
      continue;
    }
    const resourceId = resourceKey(cost, source);
    const available = state.resources[resourceId]?.current ?? 0;
    requirements.push({ resourceId, amount: cost.amount, available });
  }
  return { requirements, unresolved };
}

function resourceKey(cost: ResourceCost, source: RulesCompendiumRecord): string {
  if (cost.resourceId) return cost.resourceId;
  if (cost.resource === "spellSlot") return `spellSlot:${cost.level ?? "any"}`;
  if (cost.resource === "itemCharge") return `itemCharge:${source.canonicalId}`;
  if (cost.resource === "hitDie") return `hitDie:${cost.dieSize ? `d${cost.dieSize}` : "any"}`;
  return `${cost.resource}:${source.canonicalId}`;
}

function legal(
  proposal: RulesEvaluationProposal,
  state: ActorRulesState,
  reason: string,
  source?: RulesCompendiumRecord,
  activity?: ActivityData,
  requiredResources: readonly ResourceRequirement[] = [],
): RulesResolution {
  return resolution("LEGAL", proposal, state, reason, source, activity, requiredResources);
}

function illegal(
  proposal: RulesEvaluationProposal,
  state: ActorRulesState,
  reason: string,
  source?: RulesCompendiumRecord,
  activity?: ActivityData,
  requiredResources: readonly ResourceRequirement[] = [],
): RulesResolution {
  return resolution("ILLEGAL", proposal, state, reason, source, activity, requiredResources);
}

function manual(
  proposal: RulesEvaluationProposal,
  state: ActorRulesState,
  reason: string,
  source?: RulesCompendiumRecord,
  activity?: ActivityData,
  requiredResources: readonly ResourceRequirement[] = [],
): RulesResolution {
  return resolution("MANUAL", proposal, state, reason, source, activity, requiredResources);
}

function resolution(
  decision: RulesResolution["decision"],
  proposal: RulesEvaluationProposal,
  state: ActorRulesState,
  reason: string,
  source?: RulesCompendiumRecord,
  activity?: ActivityData,
  requiredResources: readonly ResourceRequirement[] = [],
): RulesResolution {
  return {
    decision,
    reason,
    actorId: proposal.actorId,
    targetIds: proposal.targetIds ?? [],
    actionRef: proposal.payload.actionRef,
    ...(source ? { source: { canonicalId: source.canonicalId, kind: source.kind, name: source.name } } : {}),
    ...(activity ? { activity: { id: activity.id, name: activity.name, kind: activity.kind } } : {}),
    requiredResources,
    conditions: state.conditions,
  };
}
