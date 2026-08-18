import type { AbilityId, DamageTypeId, EntityRef, FormulaValue } from "./primitives.js";
import type {
  EffectData, PredicateData, RuntimeValueRef, TriggerData, UsageLimitData
} from "./mechanics.js";

export interface SpellFilterData {
  lists?: readonly string[];
  schools?: readonly string[];
  levels?: readonly number[];
  minLevel?: number;
  maxLevel?: number;
  tags?: readonly string[];
  castingTime?: readonly string[];
  predicate?: PredicateData;
}

export interface SpellCollectionData {
  id: string;
  kind: "known" | "prepared" | "spellbook" | "alwaysPrepared" | "granted" | "custom";
  sourceList?: string;
  capacity?: RuntimeValueRef;
  entries?: readonly EntityRef[];
  filter?: SpellFilterData;
  replace?: {
    timing: "levelUp" | "longRest" | "shortRest" | "manual" | "custom";
    count: RuntimeValueRef;
    fromCollectionId?: string;
    filter?: SpellFilterData;
  };
  add?: {
    trigger: TriggerData;
    count: RuntimeValueRef;
    filter?: SpellFilterData;
    free?: boolean;
  };
  copyRules?: readonly {
    sourceKind: "scroll" | "spellbook" | "prepared" | "custom";
    timePerSpellLevel?: { value: number; unit: "minute" | "hour" };
    costPerSpellLevel?: { amount: number; currency: string };
    filter?: SpellFilterData;
  }[];
}

export interface SpellPreparationRuleData {
  collectionId: string;
  preparedCollectionId: string;
  count: RuntimeValueRef;
  filter?: SpellFilterData;
  refresh: "longRest" | "levelUp" | "shortRest" | "manual" | "custom";
  alwaysPreparedDontCount?: boolean;
}

export interface SpellSlotPoolData {
  id: string;
  kind: "standard" | "pact" | "custom";
  progression?: Readonly<Record<number, Readonly<Record<number, number>>>>;
  recovery?: readonly {
    trigger: TriggerData;
    restore: "all" | "selected" | "budget";
    budget?: RuntimeValueRef;
    maxSlotLevel?: number;
  }[];
}

export interface ResourceAllocationData {
  source: RuntimeValueRef;
  unit: "points" | "spellLevels" | "dice" | "hitPoints" | "uses" | "custom";
  targets: readonly {
    targetType: "spellSlot" | "creature" | "resource" | "activity" | "custom";
    targetId?: string;
    cost?: RuntimeValueRef;
    cap?: RuntimeValueRef;
    predicate?: PredicateData;
  }[];
  totalCap?: RuntimeValueRef;
  perTargetCap?: RuntimeValueRef;
}

export interface ResourceDicePoolData {
  id: string;
  die: "d4" | "d6" | "d8" | "d10" | "d12" | "d20";
  count: RuntimeValueRef;
  progression?: Readonly<Record<number, { die?: ResourceDicePoolData["die"]; count?: number }>>;
  recovery?: readonly TriggerData[];
  transferable?: boolean;
  recipientCap?: RuntimeValueRef;
  expiration?: { value: RuntimeValueRef; unit: "round" | "minute" | "hour" | "day" };
}

export interface TransferableResourceData {
  resourceId: string;
  from: "self";
  to: "ally" | "creature" | "target";
  amount: RuntimeValueRef;
  range?: RuntimeValueRef;
  duration?: { value: RuntimeValueRef; unit: "round" | "minute" | "hour" | "day" };
  recipientCap?: RuntimeValueRef;
  consumeWhen?: TriggerData;
  predicate?: PredicateData;
}

export interface StoredRollPoolData {
  id: string;
  die: "d4" | "d6" | "d8" | "d10" | "d12" | "d20";
  generate: {
    trigger: TriggerData;
    count: RuntimeValueRef;
    chooseFromMultiple?: { rollCount: number; keep: number | "one" | "all" };
  };
  expires?: TriggerData;
  usage?: UsageLimitData;
  consumeOnUse?: boolean;
}

export interface RollReplacementData {
  poolId: string;
  target: "d20Test" | "attackRoll" | "abilityCheck" | "savingThrow" | "initiative" | "custom";
  subject: "self" | "visibleCreature" | "ally" | "enemy" | "any";
  timing: "beforeRoll" | "afterRollBeforeOutcome" | "afterOutcome";
  predicate?: PredicateData;
}

export interface RerollRuleData {
  target: "d20Test" | "attackRoll" | "abilityCheck" | "savingThrow" | "damageRoll" | "custom";
  trigger: TriggerData;
  mustUseNewRoll?: boolean;
  modifier?: RuntimeValueRef;
  advantage?: boolean;
  predicate?: PredicateData;
}

export interface DamageInterceptionData {
  id: string;
  resourceId: string;
  trigger: TriggerData;
  target: "self" | "visibleCreature" | "ally" | "creature";
  range?: RuntimeValueRef;
  applyDefensesBeforeResource?: boolean;
  overflowToTarget?: boolean;
  canInterceptWhileEmpty?: boolean;
}

export interface DamageMitigationData {
  trigger: TriggerData;
  amount: RuntimeValueRef;
  minimum?: number;
  damageTypes?: readonly DamageTypeId[];
  predicate?: PredicateData;
}

export interface ResolutionOverrideData {
  domain: "attack" | "save" | "check" | "damage" | "healing" | "condition" | "critical" | "custom";
  mode: "automaticSuccess" | "automaticFailure" | "automaticMiss" | "automaticHit" | "cancelCriticalEffects" | "replaceTotal" | "custom";
  value?: RuntimeValueRef;
  trigger?: TriggerData;
  predicate?: PredicateData;
}

export interface DiceResolutionModifierData {
  domain: "damage" | "healing" | "check" | "save" | "attack" | "resource" | "custom";
  mode: "maximizeDice" | "minimizeDice" | "reroll" | "replaceDie" | "addDice" | "removeDice" | "custom";
  dice?: FormulaValue | RuntimeValueRef;
  trigger?: TriggerData;
  predicate?: PredicateData;
}

export interface SpellModificationData {
  id: string;
  trigger: TriggerData;
  filter: SpellFilterData;
  usage?: UsageLimitData;
  changes: readonly {
    type:
      | "range" | "targetCount" | "effectiveLevel" | "school" | "castingTime" | "components"
      | "concentration" | "duration" | "damage" | "healing" | "save" | "summonCount"
      | "summonHitPoints" | "grantEffect" | "custom";
    operation: "set" | "add" | "subtract" | "multiply" | "remove" | "replace";
    value?: RuntimeValueRef | string | boolean | readonly string[];
    predicate?: PredicateData;
  }[];
}

export interface CastOutcomeCostData {
  resource: "spellSlot" | "classResource" | "custom";
  resourceId?: string;
  spendTiming: "beforeCast" | "afterResolution";
  retainOn: "spellFails" | "noEffect" | "countered" | "dispelFails" | "custom";
  predicate?: PredicateData;
}

export interface RollTableOutcomeData {
  table: EntityRef;
  roll: FormulaValue | RuntimeValueRef;
  rolls?: number;
  choose?: number;
  allowDirectChoice?: PredicateData;
  storeResult?: boolean;
  stateId?: string;
}

export interface DistributedPoolData {
  total: RuntimeValueRef;
  targetPredicate?: PredicateData;
  range?: RuntimeValueRef;
  perTargetMaximum?: RuntimeValueRef;
  application: "healing" | "temporaryHp" | "damage" | "resource" | "custom";
}

export interface TransformationData {
  id: string;
  source:
    | { type: "entityChoice"; entityType: string; filter?: PredicateData; knownCollectionId?: string }
    | { type: "fixedEntities"; entities: readonly EntityRef[] }
    | { type: "inlineForm"; formId: string };
  activation?: TriggerData;
  duration?: { value?: RuntimeValueRef; unit?: "round" | "minute" | "hour" | "day"; endTriggers?: readonly TriggerData[] };
  statistics: {
    default: "retain" | "replace";
    retain?: readonly string[];
    replace?: readonly string[];
    mergeProficiencies?: boolean;
    chooseHigherModifiers?: readonly string[];
  };
  creatureType?: { mode: "retain" | "replace" | "add"; value?: string };
  equipment?: {
    choices: readonly ("drop" | "merge" | "wear")[];
    practicalityRequiresGM?: boolean;
    mergedItemsInactive?: boolean;
  };
  spellcasting?: {
    allowed: boolean;
    concentrationUnaffected?: boolean;
    allowedFilter?: SpellFilterData;
  };
  tempHp?: RuntimeValueRef;
  formPatches?: readonly {
    level?: number;
    predicate?: PredicateData;
    effects?: readonly EffectData[];
    values?: Readonly<Record<string, RuntimeValueRef | string | number | boolean>>;
  }[];
}

export interface CreatedEntityData {
  id: string;
  entityType: "object" | "illusion" | "ward" | "token" | "proxy" | "custom";
  lifecycle: {
    createTrigger: TriggerData;
    endTriggers?: readonly TriggerData[];
  };
  position?: { relativeTo: "self" | "target" | "point"; range?: RuntimeValueRef };
  movable?: { speed?: RuntimeValueRef; activation?: "action" | "bonusAction" | "reaction" | "free" | "special" };
  occupiable?: boolean;
  targetable?: boolean;
  tangible?: boolean;
  resources?: readonly { id: string; max: RuntimeValueRef; current?: RuntimeValueRef }[];
  effects?: readonly EffectData[];
}

export interface ProxyOriginData {
  entityId: string;
  domains: readonly ("spellRange" | "areaOrigin" | "senses" | "attackOrigin" | "custom")[];
  useOwnerSenses?: boolean;
}

export interface ContainmentData {
  container: "self" | "createdEntity" | "custom";
  capacity: RuntimeValueRef;
  targetPredicate?: PredicateData;
  onEnter?: readonly EffectData[];
  whileContained?: readonly EffectData[];
  releaseTriggers?: readonly TriggerData[];
  concentrationRequired?: boolean;
}

export interface ConditionLevelData {
  condition: "exhaustion" | string;
  operation: "add" | "subtract" | "set" | "cap" | "preventIncrease";
  value: RuntimeValueRef;
  maximum?: RuntimeValueRef;
  predicate?: PredicateData;
}

export interface CoverageData {
  type: "half" | "threeQuarters" | "total";
  recipients: "self" | "allies" | "chosenCreatures" | "occupants" | "custom";
  areaPredicate?: PredicateData;
  duration?: TriggerData | { until: TriggerData };
}

export interface TeleportExchangeData {
  range: RuntimeValueRef;
  targetPredicate?: PredicateData;
  willing?: boolean;
  swapPositions?: boolean;
  destinationRequiresUnoccupied?: boolean;
}

export interface RuntimeChoiceStateData {
  id: string;
  options: readonly string[];
  chooseOn: TriggerData;
  changeOn?: readonly TriggerData[];
  activeUntil?: TriggerData;
  effectsByOption?: Readonly<Record<string, readonly EffectData[]>>;
}

export interface GeneratedActionData {
  trigger: TriggerData;
  action: "attack" | "dash" | "disengage" | "hide" | "dodge" | "cast" | "move" | "custom";
  asPartOfTriggeringAction?: boolean;
  count?: RuntimeValueRef;
  predicate?: PredicateData;
}

export interface TargetRetargetData {
  trigger: TriggerData;
  originalTarget: "self" | "attacker" | "currentTarget" | "custom";
  newTargetPredicate: PredicateData;
  reuseOriginalRoll?: boolean;
  chooseNewTargetBy: "self" | "attacker" | "gm" | "random";
}

export interface ClassMechanicsData {
  spellCollections?: readonly SpellCollectionData[];
  spellPreparation?: readonly SpellPreparationRuleData[];
  spellSlotPools?: readonly SpellSlotPoolData[];
  resourceAllocations?: readonly ResourceAllocationData[];
  dicePools?: readonly ResourceDicePoolData[];
  transferableResources?: readonly TransferableResourceData[];
  storedRollPools?: readonly StoredRollPoolData[];
  rollReplacements?: readonly RollReplacementData[];
  rerolls?: readonly RerollRuleData[];
  damageInterception?: readonly DamageInterceptionData[];
  damageMitigation?: readonly DamageMitigationData[];
  resolutionOverrides?: readonly ResolutionOverrideData[];
  diceResolutionModifiers?: readonly DiceResolutionModifierData[];
  spellModifications?: readonly SpellModificationData[];
  castOutcomeCosts?: readonly CastOutcomeCostData[];
  rollTables?: readonly RollTableOutcomeData[];
  distributedPools?: readonly DistributedPoolData[];
  transformations?: readonly TransformationData[];
  createdEntities?: readonly CreatedEntityData[];
  proxyOrigins?: readonly ProxyOriginData[];
  containment?: readonly ContainmentData[];
  conditionLevels?: readonly ConditionLevelData[];
  coverage?: readonly CoverageData[];
  teleportExchanges?: readonly TeleportExchangeData[];
  runtimeChoices?: readonly RuntimeChoiceStateData[];
  generatedActions?: readonly GeneratedActionData[];
  retargeting?: readonly TargetRetargetData[];
}
