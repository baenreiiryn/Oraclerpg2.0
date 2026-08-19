import type { ActivityData } from "./activity.js";
import type { ClassMechanicsData } from "./class-mechanics.js";
import type { ClassRuleData } from "./class-rules.js";
import type { MonsterFeatureTemplateData } from "./monster-feature.js";
import type { AbilityId, ChoiceRef, EntityRef, JsonValue, RecoveryPeriod, SourceText } from "./primitives.js";
import type {
  ChoiceDependencyData, CrossResourceRuleData, EffectData, EntityBenefitGrantData, FeaturePatchData,
  LinkedLifecycleData, ManualAdjudicationData, ModifierData, PredicateData, RandomPropertyGrantData,
  RuntimeValueRef, StateVariableData
} from "./mechanics.js";

export type FeatureKind =
  | "feat" | "classFeature" | "subclassFeature" | "speciesFeature"
  | "backgroundFeature" | "monsterFeature" | "optionalFeature" | "darkGift" | "charm";

export type FeatCategory = "origin" | "general" | "fightingStyle" | "epicBoon" | "other";

export interface AbilityScoreOptionData {
  abilities: readonly AbilityId[];
  amount?: number;
  count?: number;
  maximum?: number;
}

export interface SpellGrantSelectionData {
  mode: "known" | "prepared" | "innate";
  characterLevel?: number;
  spell?: EntityRef;
  query?: string;
  count?: number;
  freeUses?: number | "proficiencyBonus";
  recovery?: RecoveryPeriod;
}

export interface SpellGrantGroupData {
  name?: string;
  ability?: AbilityId | { choice: readonly AbilityId[] };
  selections: readonly SpellGrantSelectionData[];
}

export interface PrerequisiteData {
  minimumLevel?: number;
  abilities?: Partial<Record<AbilityId, number>>;
  requiredEntities?: readonly EntityRef[];
  requiredTags?: readonly string[];
  requiredFeatures?: readonly string[];
  spellcasting?: boolean;
  campaign?: readonly string[];
  predicate?: PredicateData;
  special?: string;
}

export interface GrantData {
  type: "entity" | "proficiency" | "expertise" | "language" | "sense" | "movement" | "ability" | "spell" | "resource" | "benefits" | "custom";
  entity?: EntityRef;
  benefit?: EntityBenefitGrantData;
  choice?: ChoiceRef;
  value?: JsonValue | RuntimeValueRef;
  level?: number;
  choiceId?: string;
  dependency?: ChoiceDependencyData;
}

export interface AdvancementStep {
  level: number;
  grants?: readonly GrantData[];
  choices?: readonly ChoiceRef[];
  scaleValues?: Readonly<Record<string, string | number>>;
  patches?: readonly FeaturePatchData[];
}

export interface FeatureData {
  featureKind: FeatureKind;
  category?: string;
  featCategory?: FeatCategory;
  subtype?: string;
  repeatable?: boolean;
  prerequisiteMode?: "all" | "any";
  prerequisites?: readonly PrerequisiteData[];
  abilityScoreOptions?: readonly AbilityScoreOptionData[];
  spellGrants?: readonly SpellGrantGroupData[];
  proficiencyChoices?: readonly ChoiceRef[];
  activities?: readonly ActivityData[];
  grants?: readonly GrantData[];
  advancement?: readonly AdvancementStep[];
  effects?: readonly EffectData[];
  modifiers?: readonly ModifierData[];
  states?: readonly StateVariableData[];
  patches?: readonly FeaturePatchData[];
  crossResourceRules?: readonly CrossResourceRuleData[];
  randomProperties?: readonly RandomPropertyGrantData[];
  lifecycle?: readonly LinkedLifecycleData[];
  classMechanics?: ClassMechanicsData;
  classRules?: ClassRuleData;
  /** Present when a monster feature is a reusable parameterized compendium template. */
  monsterTemplate?: MonsterFeatureTemplateData;
  manualAdjudication?: ManualAdjudicationData;
  properties?: readonly string[];
  text?: SourceText;
}
