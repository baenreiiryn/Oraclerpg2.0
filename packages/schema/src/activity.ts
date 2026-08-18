import type {
  AbilityId, ConditionId, DamageTypeId, DistanceValue, FormulaValue, RecoveryPeriod, TimeUnit
} from "./primitives.js";

export type ActivityKind =
  | "attack" | "save" | "check" | "damage" | "healing" | "utility" | "summon" | "enchant" | "special";

export interface ActivityActivation {
  type: TimeUnit;
  cost?: number;
  trigger?: string;
  condition?: string;
}

export interface ActivityRange {
  normal?: DistanceValue;
  long?: DistanceValue;
  reach?: DistanceValue;
}

export interface ActivityTarget {
  type: "self" | "creature" | "object" | "point" | "space" | "special";
  count?: number | FormulaValue;
  disposition?: "ally" | "enemy" | "any";
  area?: {
    shape: "cone" | "cube" | "cylinder" | "emanation" | "line" | "sphere" | "square" | "wall" | "special";
    size?: DistanceValue;
    height?: DistanceValue;
    width?: DistanceValue;
  };
  restrictions?: readonly string[];
}

export interface AttackComponent {
  classification: "weapon" | "spell" | "unarmed" | "special";
  mode: "melee" | "ranged" | "meleeOrRanged";
  ability?: AbilityId;
  proficient?: boolean;
  bonus?: FormulaValue;
}

export interface SaveComponent {
  ability: AbilityId;
  dc:
    | { type: "fixed"; value: number }
    | { type: "ability"; ability: AbilityId; base?: number; proficiency?: boolean }
    | { type: "spellcasting" }
    | { type: "formula"; formula: string };
  onSuccess?: "none" | "half" | "reduced" | "special";
}

export interface CheckComponent {
  ability?: AbilityId;
  skill?: string;
  dc?: number | FormulaValue;
}

export interface DamagePart {
  damageType: DamageTypeId;
  formula: string;
  scaling?: ScalingRule;
  versatileFormula?: string;
}

export interface HealingPart {
  formula: string;
  type?: "healing" | "temporaryHp" | "maxHp";
  scaling?: ScalingRule;
}

export interface ConditionEffect {
  condition: ConditionId;
  duration?: DurationSpec;
  end?: string;
}

export interface DurationSpec {
  type: "instant" | "timed" | "concentration" | "untilRest" | "permanent" | "special";
  value?: number;
  unit?: "round" | "minute" | "hour" | "day";
}

export interface UsesSpec {
  max: number | FormulaValue;
  recovery: readonly { period: RecoveryPeriod; amount?: number | FormulaValue }[];
  sharedResourceId?: string;
}

export interface ResourceCost {
  resource: "spellSlot" | "hitDie" | "itemCharge" | "classResource" | "custom";
  amount: number | FormulaValue;
  resourceId?: string;
  level?: number;
}

export interface ScalingRule {
  type: "characterLevel" | "classLevel" | "spellSlotLevel" | "proficiencyBonus" | "custom";
  progression?: Readonly<Record<string, string | number>>;
  formula?: string;
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
  conditions?: readonly ConditionEffect[];
  duration?: DurationSpec;
  uses?: UsesSpec;
  costs?: readonly ResourceCost[];
  scaling?: readonly ScalingRule[];
  description?: string;
}
