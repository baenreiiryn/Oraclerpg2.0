import type {
  AbilityId, ConditionId, DamageTypeId, DistanceValue, EntityRef, FormulaValue, RecoveryPeriod, TimeUnit
} from "./primitives.js";
import type {
  ActionReplacementData, AttackOverrideData, EffectData, InvocationSpec, ManualAdjudicationData, MultiattackData,
  OutcomeDependentCostData, PredicateData, RuntimeValueRef, SummonSpec, TriggerData, UsageLimitData
} from "./mechanics.js";
import type { TransformationData } from "./class-mechanics.js";

export type ActivityKind =
  | "attack" | "save" | "check" | "damage" | "healing" | "utility" | "summon" | "transform" | "enchant" | "invoke"
  | "multiattack" | "special";

export interface ActivityActivation {
  type: TimeUnit;
  cost?: number;
  trigger?: TriggerData;
  predicate?: PredicateData;
}

export interface ActivityRange {
  normal?: DistanceValue;
  long?: DistanceValue;
  reach?: DistanceValue;
}

export interface ActivityTarget {
  type: "self" | "creature" | "object" | "creatureOrObject" | "point" | "space" | "special";
  count?: number | FormulaValue | RuntimeValueRef;
  disposition?: "ally" | "enemy" | "any";
  area?: {
    shape: "cone" | "cube" | "cylinder" | "emanation" | "line" | "sphere" | "square" | "wall" | "special";
    size?: DistanceValue;
    length?: DistanceValue;
    height?: DistanceValue;
    width?: DistanceValue;
  };
  restrictions?: readonly PredicateData[];
}

export interface AttackComponent {
  classification: "weapon" | "spell" | "unarmed" | "special";
  mode: "melee" | "ranged" | "meleeOrRanged";
  ability?: AbilityId;
  proficient?: boolean;
  bonus?: FormulaValue | RuntimeValueRef;
}

export interface SaveComponent {
  ability: AbilityId;
  dc:
    | { type: "fixed"; value: number }
    | { type: "ability"; ability: AbilityId; base?: number; proficiency?: boolean }
    | { type: "spellcasting" }
    | { type: "formula"; formula: string }
    | { type: "runtime"; value: RuntimeValueRef };
  onSuccess?: "none" | "half" | "reduced" | "special";
}

export interface CheckComponent {
  ability?: AbilityId;
  skill?: string;
  dc?: number | FormulaValue | RuntimeValueRef;
}

export interface DamagePart {
  damageType?: DamageTypeId;
  damageTypes?: readonly DamageTypeId[];
  chooseDamageType?: boolean;
  formula?: string;
  value?: RuntimeValueRef;
  scaling?: ScalingRule;
  versatileFormula?: string;
  inheritDamageType?: boolean;
}

export interface HealingPart {
  formula?: string;
  value?: RuntimeValueRef;
  type?: "healing" | "temporaryHp" | "maxHp";
  scaling?: ScalingRule;
}

export interface ConditionEffect {
  condition: ConditionId;
  duration?: DurationSpec;
  end?: string;
}

export interface DurationSpec {
  type: "instant" | "timed" | "concentration" | "untilRest" | "untilTrigger" | "permanent" | "special";
  value?: number | RuntimeValueRef;
  unit?: "round" | "minute" | "hour" | "day";
  endTrigger?: TriggerData;
}

export interface UsesSpec {
  max: number | FormulaValue | RuntimeValueRef;
  recovery: readonly { period: RecoveryPeriod; amount?: number | FormulaValue | RuntimeValueRef | "all" }[];
  sharedResourceId?: string;
  usageLimit?: UsageLimitData;
}

export interface ResourceCost {
  resource: "spellSlot" | "hitDie" | "itemCharge" | "classResource" | "custom";
  amount: number | FormulaValue | RuntimeValueRef;
  resourceId?: string;
  level?: number;
}

export interface ScalingRule {
  type: "characterLevel" | "classLevel" | "spellSlotLevel" | "proficiencyBonus" | "custom";
  progression?: Readonly<Record<string, string | number>>;
  formula?: string;
}

export interface GenericRollData {
  id: string;
  name?: string;
  formula: string;
  purpose?: "utility" | "duration" | "resource" | "chance" | "custom";
}

export interface SummonProfileData {
  id: string;
  name?: string;
  entity?: EntityRef;
  count?: number | FormulaValue | RuntimeValueRef;
  predicate?: PredicateData;
  cost?: number | RuntimeValueRef;
}

export interface SummonScalingData {
  target: "armorClass" | "hitDice" | "hitPoints" | "attackDamage" | "saveDamage" | "healing" | "custom";
  formula: string;
}

export interface ActivityData {
  id: string;
  name: string;
  kind: ActivityKind;
  activation?: ActivityActivation;
  range?: ActivityRange;
  target?: ActivityTarget;
  attack?: AttackComponent;
  save?: SaveComponent;
  check?: CheckComponent;
  damage?: readonly DamagePart[];
  healing?: readonly HealingPart[];
  rolls?: readonly GenericRollData[];
  conditions?: readonly ConditionEffect[];
  duration?: DurationSpec;
  uses?: UsesSpec;
  costs?: readonly ResourceCost[];
  outcomeCost?: OutcomeDependentCostData;
  scaling?: readonly ScalingRule[];
  effects?: readonly EffectData[];
  predicates?: readonly PredicateData[];
  triggers?: readonly TriggerData[];
  invocation?: InvocationSpec;
  summon?: SummonSpec;
  summonProfiles?: readonly SummonProfileData[];
  summonScaling?: readonly SummonScalingData[];
  summonMatch?: readonly ("proficiency" | "attacks" | "saves")[];
  transformation?: TransformationData;
  multiattack?: MultiattackData;
  replacements?: readonly ActionReplacementData[];
  attackOverrides?: readonly AttackOverrideData[];
  manualAdjudication?: ManualAdjudicationData;
  description?: string;
}
