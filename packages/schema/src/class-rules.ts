import type { EntityRef, FormulaValue } from "./primitives.js";
import type { EffectData, PredicateData, RuntimeValueRef, TriggerData } from "./mechanics.js";
import type { SpellFilterData } from "./class-mechanics.js";

export interface SpellActionReplacementData {
  trigger: TriggerData;
  replaces: "oneAttack" | "attackAction" | "bonusAction" | "reaction";
  spellFilter: SpellFilterData;
  castAt: "normal" | "lowestLevel" | "fixedLevel" | "custom";
  fixedLevel?: number;
  slotCost: "normal" | "none" | "custom";
  predicate?: PredicateData;
}

export interface ResourceMutationData {
  resourceId: string;
  trigger: TriggerData;
  operation: "add" | "subtract" | "set" | "setMinimum" | "setMaximum" | "restoreAll" | "custom";
  value?: RuntimeValueRef;
  predicate?: PredicateData;
}

export interface BehaviorConstraintData {
  trigger?: TriggerData;
  subject: "self" | "target" | "affectedCreature" | "summon" | "custom";
  directives: readonly (
    | { type: "moveAwayFrom" | "moveToward"; source: "self" | "effectOrigin" | "target"; maximizeDistance?: boolean }
    | { type: "mustFollowCommands"; controller: "self" | "summoner" | "source"; predicate?: PredicateData }
    | { type: "actionEconomyLimit"; allowed: readonly ("action" | "bonusAction" | "reaction" | "movement")[]; maximumSelections: number }
    | { type: "cannotTake"; actions: readonly string[] }
    | { type: "custom"; description: string }
  )[];
  duration?: { endTriggers: readonly TriggerData[] };
  predicate?: PredicateData;
}

export interface EffectAnchorData {
  effectId: string;
  anchor: "self" | "targetCreature" | "createdEntity" | "groundPoint" | "custom";
  movable?: {
    trigger: TriggerData;
    maxDistance: RuntimeValueRef;
    destinationPredicate?: PredicateData;
  };
  maxDistanceFromOwner?: RuntimeValueRef;
  endIfBeyondDistance?: boolean;
}

export interface CostModificationData {
  trigger: TriggerData;
  costType: "spellSlot" | "materialComponent" | "consumedMaterial" | "currency" | "classResource" | "custom";
  mode: "remove" | "reduce" | "retain" | "replace" | "chanceToRetain" | "custom";
  value?: RuntimeValueRef;
  chance?: number | FormulaValue;
  spellFilter?: SpellFilterData;
  predicate?: PredicateData;
}

export interface MovementPermissionData {
  subject: "self" | "target" | "transformedSelf";
  permissions: readonly (
    | "enterCreatureSpace" | "shareCreatureSpace" | "climbDifficultSurfaces" | "climbCeilings"
    | "ignoreDifficultTerrain" | "ignoreOpportunityAttacks" | "hover" | "custom"
  )[];
  predicate?: PredicateData;
  duration?: { endTriggers: readonly TriggerData[] };
}

export interface ObjectTransformationData {
  trigger: TriggerData;
  targetPredicate: PredicateData;
  sizeLimit?: { shape: "cube" | "connectedCubes" | "custom"; size?: RuntimeValueRef; count?: RuntimeValueRef };
  result: {
    magical?: boolean;
    preserveSimilarSize?: boolean;
    preserveSimilarMass?: boolean;
    maximumValueRelation?: "equalOrLower" | "any";
  };
  handlingTime?: { value: RuntimeValueRef; unit: "minute" | "hour" };
}

export interface AgeModificationData {
  target: "self" | "creature";
  operation: "younger" | "older" | "set";
  amount: RuntimeValueRef;
  permanent?: boolean;
  minimumStage?: "youngAdulthood" | "adulthood" | "custom";
}

export interface AttunementModificationData {
  target: "self" | "creature";
  operation: "end" | "suppress" | "restore" | "prevent";
  itemPredicate?: PredicateData;
  cursedOnly?: boolean;
}

export interface ProjectedEffectData {
  sourceEffectId?: string;
  effects?: readonly EffectData[];
  recipients:
    | { type: "alliesInRange" | "enemiesInRange" | "chosenCreatures"; range: RuntimeValueRef }
    | { type: "bearerOfEntity"; entity: EntityRef }
    | { type: "createdOrSummonedBySelf"; creatureTypes?: readonly string[] }
    | { type: "controlledBySelf" }
    | { type: "custom"; predicate: PredicateData };
  useSourceRuntimeValues?: boolean;
  predicate?: PredicateData;
}

export interface ChainEffectData {
  trigger: TriggerData;
  firstTarget: "activityTarget" | "affectedTarget" | "custom";
  nextTargetPredicate: PredicateData;
  rangeFromPreviousTarget: RuntimeValueRef;
  repeatOriginalSave?: boolean;
  repeatOriginalAttack?: boolean;
  reuseOriginalRoll?: boolean;
  maximumJumps?: RuntimeValueRef;
}

export interface EntityRelationshipPredicateData {
  relationship: "createdBySelf" | "summonedBySelf" | "controlledBySelf" | "ownedBySelf" | "wornBySelf" | "heldBySelf" | "custom";
  entityType?: string;
  predicate?: PredicateData;
}

export interface ClassRuleData {
  spellActionReplacements?: readonly SpellActionReplacementData[];
  resourceMutations?: readonly ResourceMutationData[];
  behaviorConstraints?: readonly BehaviorConstraintData[];
  effectAnchors?: readonly EffectAnchorData[];
  costModifications?: readonly CostModificationData[];
  movementPermissions?: readonly MovementPermissionData[];
  objectTransformations?: readonly ObjectTransformationData[];
  ageModifications?: readonly AgeModificationData[];
  attunementModifications?: readonly AttunementModificationData[];
  projectedEffects?: readonly ProjectedEffectData[];
  chainEffects?: readonly ChainEffectData[];
  relationshipPredicates?: readonly EntityRelationshipPredicateData[];
}
