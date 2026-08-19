import type { ActivityData } from "./activity.js";
import type { MonsterFeatureInstanceData } from "./monster-feature.js";
import type {
  AbilityId, ConditionId, CreatureTypeId, DamageTypeId, EntityRef, FormulaValue, MovementTypeId, SizeId, SourceText
} from "./primitives.js";

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface MonsterArmorClass {
  value: number;
  type?: "natural" | "armor" | "shield" | "unarmored" | "special";
  condition?: string;
  sourceItem?: EntityRef;
}

export interface MonsterMovement {
  type: MovementTypeId;
  speed: number;
  unit: "ft";
  hover?: boolean;
  condition?: string;
}

export interface MonsterSense {
  type: "blindsight" | "darkvision" | "tremorsense" | "truesight" | "special";
  range?: number;
  unit?: "ft";
  condition?: string;
}

export interface MonsterProficiency {
  ability?: AbilityId;
  skill?: string;
  bonus: number | FormulaValue;
}

export interface MonsterData {
  creatureType: CreatureTypeId;
  creatureSubtype?: string;
  size: SizeId;
  alignment?: string;

  challengeRating: number;
  proficiencyBonus?: number;
  experience?: number;

  abilities: AbilityScores;
  armorClass: readonly MonsterArmorClass[];
  hitPoints: {
    average: number;
    formula: string;
    maximum?: number;
  };
  initiative?: number | FormulaValue;

  movement: readonly MonsterMovement[];
  savingThrows?: readonly MonsterProficiency[];
  skills?: readonly MonsterProficiency[];
  passivePerception?: number;
  senses?: readonly MonsterSense[];
  languages?: readonly string[];

  vulnerabilities?: readonly DamageTypeId[];
  resistances?: readonly DamageTypeId[];
  damageImmunities?: readonly DamageTypeId[];
  conditionImmunities?: readonly ConditionId[];

  habitats?: readonly { type: string; subtype?: string }[];
  treasure?: readonly string[];
  gear?: readonly EntityRef[];

  /**
   * Actor-owned copies of reusable monster features. These snapshots may be customized
   * independently from their compendium definitions and are the preferred representation.
   */
  features?: readonly MonsterFeatureInstanceData[];
  /** @deprecated Transitional reference-only representation kept for older fixtures/importers. */
  traits?: readonly EntityRef[];
  /** Transitional denormalized activity collections; importers may derive these from features. */
  actions?: readonly ActivityData[];
  bonusActions?: readonly ActivityData[];
  reactions?: readonly ActivityData[];
  legendaryActions?: readonly ActivityData[];
  lairActions?: readonly ActivityData[];
  legendaryActionUses?: number;
  legendaryResistanceUses?: number;

  spellcasting?: readonly EntityRef[];
  text?: SourceText;
}
