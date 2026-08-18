import type { ActivityData, ScalingRule } from "./activity.js";
import type {
  AbilityId, ConditionId, CreatureTypeId, CurrencyId, DamageTypeId, EntityRef, SourceText
} from "./primitives.js";

export type SpellSchoolId =
  | "abjuration" | "conjuration" | "divination" | "enchantment"
  | "evocation" | "illusion" | "necromancy" | "transmutation";

export type SpellCastingTimeUnit = "action" | "bonusAction" | "reaction" | "minute" | "hour";
export interface SpellCastingTimeData {
  amount: number;
  unit: SpellCastingTimeUnit;
  condition?: string;
  note?: string;
}

export type SpellRangeType = "point" | "cone" | "cube" | "emanation" | "line" | "sphere";
export type SpellRangeDistanceType = "self" | "touch" | "feet" | "miles" | "sight" | "unlimited";
export interface SpellRangeData {
  /** Shape/origin encoding from the rules source. Area geometry belongs here, while executable targeting lives on Activities. */
  type: SpellRangeType;
  /** Explicit origin prevents self-centered cones/emanations/lines from being confused with a distant point. */
  origin?: "self" | "point" | "target" | "special";
  distance: {
    type: SpellRangeDistanceType;
    amount?: number;
    scaling?: ScalingRule;
  };
}

export interface SpellDurationData {
  type: "instant" | "timed" | "permanent" | "special";
  amount?: number;
  unit?: "round" | "minute" | "hour" | "day";
  concentration?: boolean;
  upTo?: boolean;
  ends?: readonly ("dispel" | "trigger")[];
  /** Duration changes when a higher-level slot is used. */
  scaling?: ScalingRule;
}

export interface SpellMaterialCostData {
  amount: number;
  currency: CurrencyId;
}

export interface SpellComponentData {
  verbal?: boolean;
  somatic?: boolean;
  material?: {
    text?: string;
    cost?: SpellMaterialCostData;
    consumed?: boolean;
  };
}

/** Search/index metadata supplied structurally by the source. It is not a replacement for executable Activities. */
export interface SpellMechanicIndexData {
  savingThrows?: readonly AbilityId[];
  abilityChecks?: readonly AbilityId[];
  spellAttacks?: readonly ("melee" | "ranged")[];
  damageInflicted?: readonly DamageTypeId[];
  conditionsInflicted?: readonly ConditionId[];
  affectsCreatureTypes?: readonly CreatureTypeId[];
  grantsDamageResistance?: readonly DamageTypeId[];
  grantsDamageImmunity?: readonly DamageTypeId[];
  grantsDamageVulnerability?: readonly DamageTypeId[];
  grantsConditionImmunity?: readonly ConditionId[];
  areaTags?: readonly string[];
  miscTags?: readonly string[];
}

export interface SpellData {
  level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  school: SpellSchoolId;
  aliases?: readonly string[];
  ritual?: boolean;
  concentration?: boolean;
  spellcastingAbility?: AbilityId;
  castingTimes: readonly SpellCastingTimeData[];
  range: SpellRangeData;
  durations: readonly SpellDurationData[];
  components: SpellComponentData;
  /** Executable representations. A spell may have more than one Activity (for example, Sunbeam). */
  activities: readonly ActivityData[];
  scaling?: readonly ScalingRule[];
  spellLists?: readonly EntityRef[];
  mechanicIndex?: SpellMechanicIndexData;
  tags?: readonly string[];
  text?: SourceText;
  higherLevelText?: SourceText;
}
