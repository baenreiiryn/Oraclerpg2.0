import type { ActivityData } from "./activity.js";
import type { PredicateData, RuntimeValueRef, TriggerData, UsageLimitData } from "./mechanics.js";
import type { AbilityId, ConditionId, DamageTypeId, DistanceValue } from "./primitives.js";

export interface RollRuleData {
  id: string;
  target: "d20Test" | "attackRoll" | "damageRoll" | "savingThrow" | "abilityCheck" | "initiative";
  operation: "reroll" | "rollTwiceChoose" | "replaceResult" | "add" | "subtract" | "minimumDieResult" | "automaticSuccess";
  trigger?: TriggerData;
  predicate?: PredicateData;
  dieFaces?: readonly number[];
  formula?: string;
  choose?: "higher" | "lower" | "either";
  replacement?: number | RuntimeValueRef;
  minimumDieResult?: number;
  usage?: UsageLimitData;
  description?: string;
}

export interface ResourcePreservationRuleData {
  id: string;
  resource: "spellSlot" | "hitDie" | "classResource" | "itemCharge" | "custom";
  trigger: TriggerData;
  predicate?: PredicateData;
  check?: {
    formula: string;
    operator: "eq" | "neq" | "gte" | "lte" | "gt" | "lt";
    compareTo: RuntimeValueRef;
  };
  preserveOnSuccess: boolean;
  description?: string;
}

export interface TriggeredGrantRuleData {
  id: string;
  trigger: TriggerData;
  grant: "heroicInspiration" | "temporaryHitPoints" | "hitPoints" | "sense" | "movement" | "custom";
  value?: RuntimeValueRef;
  sense?: { type: string; range: DistanceValue };
  movement?: { type: "walk" | "climb" | "fly" | "swim" | "burrow"; distance?: DistanceValue; equalsSpeed?: boolean };
  duration?: { value: number | RuntimeValueRef; unit: "round" | "minute" | "hour" | "day" };
  predicate?: PredicateData;
  usage?: UsageLimitData;
}

export interface RestRuleData {
  id: string;
  rest: "shortRest" | "longRest";
  duration: { value: number; unit: "minute" | "hour" };
  sleepRequired?: boolean;
  conscious?: boolean;
  description?: string;
}

export interface CapacityRuleData {
  id: string;
  countAsSizeLarger?: number;
  multiplier?: number;
  predicate?: PredicateData;
}

export interface MovementInteractionRuleData {
  id: string;
  action: "ignoreExtraCost" | "moveThroughSpace" | "hideBehindCreature" | "teleport" | "speedBonus";
  distance?: DistanceValue | RuntimeValueRef;
  predicate?: PredicateData;
  trigger?: TriggerData;
  usage?: UsageLimitData;
}

export interface DamageRuleData {
  id: string;
  action: "ignoreResistance" | "extraDamage" | "replaceDamageType";
  damageTypes?: readonly DamageTypeId[];
  formula?: string;
  value?: RuntimeValueRef;
  inheritDamageType?: boolean;
  trigger?: TriggerData;
  predicate?: PredicateData;
  usage?: UsageLimitData;
}

export interface SaveRuleData {
  id: string;
  abilities?: readonly AbilityId[];
  conditions?: readonly ConditionId[];
  mode: "advantage" | "disadvantage" | "automaticSuccess";
  predicate?: PredicateData;
}

export interface FeatureActionRuleData {
  id: string;
  activity: ActivityData;
  replacesAttack?: boolean;
}
