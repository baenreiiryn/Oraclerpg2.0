import type {
  AbilityId, ConditionId, DamageTypeId, DistanceValue, EntityRef, FormulaValue, MovementTypeId, RecoveryPeriod
} from "./primitives.js";

export type RuntimeValueRef =
  | { type: "constant"; value: number | string | boolean }
  | { type: "formula"; formula: string }
  | { type: "abilityScore" | "abilityModifier"; ability: AbilityId; subject?: "self" | "target" | "source" }
  | { type: "proficiencyBonus"; subject?: "self" | "target" | "source" }
  | { type: "classLevel" | "characterLevel"; classId?: string; subject?: "self" | "target" | "source" }
  | { type: "state"; stateId: string; subject?: "self" | "target" | "source" }
  | { type: "runtime"; path: string; subject?: "self" | "target" | "source" };

export interface PredicateData {
  type:
    | "and" | "or" | "not" | "comparison" | "hasCondition" | "lacksCondition" | "hasTag"
    | "creatureType" | "size" | "distance" | "adjacentAlly" | "wearingArmor" | "holdingItem"
    | "movementHistory" | "anatomy" | "hasLegendaryActions" | "manual" | "custom";
  all?: readonly PredicateData[];
  any?: readonly PredicateData[];
  predicate?: PredicateData;
  left?: RuntimeValueRef;
  operator?: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "notIn";
  right?: RuntimeValueRef | readonly (string | number | boolean)[];
  condition?: ConditionId;
  creatureTypes?: readonly string[];
  sizes?: readonly string[];
  distance?: DistanceValue;
  count?: number;
  tags?: readonly string[];
  armorCategories?: readonly string[];
  movement?: {
    mode?: "straightToward" | "enteredSpace" | "withinDistance" | "moved";
    distance?: DistanceValue;
    immediatelyBefore?: boolean;
  };
  anatomy?: { requires?: readonly string[]; excludes?: readonly string[] };
  description?: string;
}

export type TriggerEvent =
  | "onActivate" | "onDeactivate" | "onApply" | "onRemove" | "onAttack" | "onHit" | "onMiss" | "onCritical"
  | "onDamage" | "onDamageTaken" | "onReduceToZero" | "onDropToZero" | "onSave" | "onFailedSave" | "onCheck"
  | "onFailedCheck" | "onInitiative" | "onTurnStart" | "onTurnEnd" | "onEnterArea" | "onLeaveArea"
  | "onMove" | "onRest" | "onDeath" | "onRevive" | "onSunset" | "onDawn" | "manual" | "custom";

export interface TriggerData {
  event: TriggerEvent;
  actor?: "self" | "target" | "source" | "ally" | "enemy" | "driver" | "summon";
  timing?: "before" | "after" | "start" | "end";
  oncePerTurn?: boolean;
  oncePerRound?: boolean;
  firstTimeOnTurn?: boolean;
  predicate?: PredicateData;
  description?: string;
}

export interface UsageLimitData {
  max?: RuntimeValueRef;
  scope?: "turn" | "round" | "encounter" | "rest" | "day" | "target" | "lifetime" | "custom";
  recovery?: readonly { period: RecoveryPeriod | "sunset" | "manual"; amount?: RuntimeValueRef | "all" }[];
  targetScoped?: boolean;
}

export interface StateVariableData {
  id: string;
  valueType: "number" | "boolean" | "string" | "entityRef";
  initial?: RuntimeValueRef;
  min?: number;
  max?: number;
  transitions?: readonly {
    trigger: TriggerData;
    operation: "set" | "add" | "subtract" | "reset" | "toggle";
    value?: RuntimeValueRef;
    predicate?: PredicateData;
  }[];
}

export type ModifierMode =
  | "bonus" | "penalty" | "advantage" | "disadvantage" | "minimum" | "maximum" | "replace"
  | "multiply" | "set" | "ignoreResistance" | "grantResistance" | "grantImmunity" | "suppress" | "prevent";

export interface ModifierTarget {
  domain:
    | "attackRoll" | "damageRoll" | "savingThrow" | "abilityCheck" | "skillCheck" | "initiative" | "armorClass"
    | "movement" | "damageResistance" | "damageImmunity" | "condition" | "spellcasting" | "concentration"
    | "unarmedStrike" | "activity" | "resource" | "custom";
  ability?: AbilityId;
  skill?: string;
  damageType?: DamageTypeId;
  movementType?: MovementTypeId;
  condition?: ConditionId;
  activityId?: string;
}

export interface ModifierData {
  id?: string;
  target: ModifierTarget;
  mode: ModifierMode;
  value?: RuntimeValueRef;
  predicate?: PredicateData;
  duration?: EffectDurationData;
  sourceDamageType?: boolean;
  description?: string;
}

export interface ConditionInteractionData {
  action: "apply" | "remove" | "suppress" | "prevent" | "immunity";
  conditions: readonly ConditionId[];
  predicate?: PredicateData;
  duration?: EffectDurationData;
  repeatSave?: {
    timing: "startOfTurn" | "endOfTurn" | "onDamage" | "manual";
    ability?: AbilityId;
    dc?: RuntimeValueRef;
    onSuccess: "end" | "suppress" | "special";
  };
}

export interface AfflictionInteractionData {
  action: "apply" | "remove" | "suppress" | "prevent" | "immunity";
  afflictionType: "disease" | "curse" | "poison" | "custom";
  entity?: EntityRef;
  count?: number | RuntimeValueRef;
  choice?: "any" | "chosen" | "all";
  predicate?: PredicateData;
}

export interface EffectDurationData {
  type: "instant" | "timed" | "concentration" | "untilRest" | "untilTrigger" | "permanent" | "special";
  value?: RuntimeValueRef;
  unit?: "round" | "minute" | "hour" | "day";
  endTrigger?: TriggerData;
}

export interface AreaEffectData {
  shape: "cone" | "cube" | "cylinder" | "emanation" | "line" | "sphere" | "square" | "wall" | "special";
  size?: DistanceValue;
  length?: DistanceValue;
  width?: DistanceValue;
  height?: DistanceValue;
  origin?: "self" | "targetPoint" | "frontOfVehicle" | "behindVehicle" | "special";
  stationary?: boolean;
  obscurement?: "lightly" | "heavily";
  light?: { bright?: DistanceValue; dim?: DistanceValue; sunlight?: boolean };
  environment?: readonly { interaction: "dispel" | "suppress" | "modify"; predicate?: PredicateData; description?: string }[];
}

export interface EffectData {
  id: string;
  name?: string;
  trigger?: TriggerData;
  predicate?: PredicateData;
  duration?: EffectDurationData;
  modifiers?: readonly ModifierData[];
  conditions?: readonly ConditionInteractionData[];
  afflictions?: readonly AfflictionInteractionData[];
  area?: AreaEffectData;
  grantedActivities?: readonly string[];
  grantedEntities?: readonly EntityRef[];
  stateVariables?: readonly StateVariableData[];
  suppressRules?: readonly string[];
  description?: string;
}

export interface ActionReplacementData {
  replaces: "attack" | "action" | "bonusAction" | "reaction" | "activity";
  activityId: string;
  count?: number;
  usage?: UsageLimitData;
  predicate?: PredicateData;
}

export interface AttackOverrideData {
  target: "unarmedStrike" | "weaponAttack" | "specificActivity";
  activityId?: string;
  mode: "replace" | "addMode" | "modify";
  ability?: AbilityId;
  damage?: readonly { formula?: string; value?: RuntimeValueRef; damageType?: DamageTypeId; inheritDamageType?: boolean }[];
  predicate?: PredicateData;
}

export interface InvocationSpec {
  entity: EntityRef;
  mode: "castSpell" | "useActivity" | "applyBenefits";
  spellLevel?: number | RuntimeValueRef;
  saveDc?: RuntimeValueRef;
  attackBonus?: RuntimeValueRef;
  ability?: AbilityId | { choice: readonly AbilityId[] };
  ignoreComponents?: readonly ("v" | "s" | "m")[];
  concentration?: "normal" | "notRequired" | "required";
  durationOverride?: EffectDurationData;
  targetOverride?: string;
  destinationRule?: string;
}

export interface OutcomeDependentCostData {
  timing: "before" | "after";
  consumeOn: "success" | "failure" | "always" | "hit" | "miss" | "custom";
  refundOn?: "success" | "failure" | "hit" | "miss" | "custom";
  description?: string;
}

export interface CrossResourceRuleData {
  trigger?: TriggerData;
  consume: { resourceId: string; amount: RuntimeValueRef };
  restore: { resourceId: string; amount: RuntimeValueRef | "all" };
  predicate?: PredicateData;
}

export interface EntityBenefitGrantData {
  entity: EntityRef;
  mode: "benefits" | "activity" | "effect" | "property";
  duration?: EffectDurationData;
  predicate?: PredicateData;
}

export interface SummonSpec {
  entity: EntityRef;
  count?: RuntimeValueRef;
  placement?: { range?: DistanceValue; requiresUnoccupiedSpace?: boolean; requiresSight?: boolean };
  allegiance?: "ally" | "friendly" | "neutral" | "hostile" | "special";
  initiative?: "sharesSummoner" | "own" | "fixed" | "special";
  turnOrder?: "immediatelyAfterSummoner" | "immediatelyBeforeSummoner" | "normal" | "special";
  command?: { actionCost: "none" | "action" | "bonusAction" | "special"; verbal?: boolean };
  fallback?: "dodgeAndAvoidDanger" | "dodge" | "defend" | "special";
  despawn?: readonly ("zeroHp" | "effectEnds" | "summonerDeath" | "manual" | "special")[];
  scaling?: readonly { input: "spellSlotLevel" | "classLevel" | "characterLevel" | "custom"; targetPath: string }[];
}

export interface MultiattackData {
  sequence: readonly { activityId: string; count: number | RuntimeValueRef }[];
  alternatives?: readonly MultiattackData[];
}

export interface RandomPropertyGrantData {
  pool: EntityRef | { query: Readonly<Record<string, unknown>> };
  count: number;
  category?: string;
  predicate?: PredicateData;
  suppressPredicate?: PredicateData;
}

export interface ItemSentienceData {
  alignment?: string;
  abilities?: Partial<Record<"int" | "wis" | "cha", number>>;
  senses?: readonly { type: string; range?: DistanceValue }[];
  languages?: readonly string[];
  telepathy?: DistanceValue | "wielder";
  understandsWielderLanguages?: boolean;
  personality?: string;
  purpose?: string;
  autonomousActivities?: readonly {
    activityId: string;
    policy: "itemDecides" | "automatic" | "conditional" | "manual";
    trigger?: TriggerData;
  }[];
  obligations?: readonly {
    after?: { value: number; unit: "hour" | "day" };
    unmetTrigger?: TriggerData;
    consequence?: string;
  }[];
}

export interface ChoiceDependencyData {
  choiceId: string;
  dependsOn?: readonly string[];
  reusesSelectionFrom?: string;
}

export interface EquipmentBundleData {
  id: string;
  label?: string;
  grants: readonly {
    entity?: EntityRef;
    quantity?: number;
    currency?: { amount: number; currency: string };
    reuseChoiceId?: string;
  }[];
}

export interface FeaturePatchData {
  level: number;
  addActivities?: readonly string[];
  addOptions?: readonly string[];
  setValues?: Readonly<Record<string, RuntimeValueRef | string | number | boolean>>;
  optionCount?: RuntimeValueRef;
  predicate?: PredicateData;
}

export interface LinkedLifecycleData {
  linkedEntity?: EntityRef;
  rules: readonly {
    event: "death" | "revive" | "remove" | "attune" | "unattune" | "custom";
    consequence: "same" | "remove" | "revive" | "activate" | "deactivate" | "custom";
    description?: string;
  }[];
}

export interface ManualAdjudicationData {
  required: boolean;
  reason: string;
  fallback?: "textOnly" | "promptGM" | "noAutomaticResolution";
}
