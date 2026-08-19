import type { ActivityData } from "./activity.js";
import type { ClassMechanicsData } from "./class-mechanics.js";
import type { ClassRuleData } from "./class-rules.js";
import type {
  AbilitySubstitutionRuleData, CapacityRuleData, DamageRuleData, FeatureActionRuleData, MovementInteractionRuleData,
  ResourcePreservationRuleData, RestRuleData, RollRuleData, SaveRuleData, TriggeredGrantRuleData
} from "./feature-rules.js";
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

export interface SpellGrantChoiceData {
  id: string;
  count?: number;
  options: readonly SpellGrantGroupData[];
  distinctAcrossRepeats?: boolean;
  sharedSelectionKey?: string;
}

export interface SpeciesFeatureTemplateParameterData {
  id: string;
  kind: "number" | "string" | "boolean" | "damageType" | "distance" | "ability" | "entityRef";
  required?: boolean;
  defaultValue?: JsonValue;
  allowedValues?: readonly JsonValue[];
}

export interface SpeciesFeatureTemplateBindingData {
  parameterId: string;
  path: string;
  operation?: "replace" | "merge";
}

export interface SpeciesFeatureTemplateData {
  family: "sense" | "resistance" | "attack" | "spellcasting" | "movement" | "trait" | "special";
  parameters?: readonly SpeciesFeatureTemplateParameterData[];
  bindings?: readonly SpeciesFeatureTemplateBindingData[];
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
  abilityScoreOptionMode?: "all" | "chooseOne";
  abilityScoreOptions?: readonly AbilityScoreOptionData[];
  spellGrants?: readonly SpellGrantGroupData[];
  spellGrantChoices?: readonly SpellGrantChoiceData[];
  proficiencyChoices?: readonly ChoiceRef[];
  activities?: readonly ActivityData[];
  grants?: readonly GrantData[];
  advancement?: readonly AdvancementStep[];
  effects?: readonly EffectData[];
  modifiers?: readonly ModifierData[];
  states?: readonly StateVariableData[];
  patches?: readonly FeaturePatchData[];
  crossResourceRules?: readonly CrossResourceRuleData[];
  rollRules?: readonly RollRuleData[];
  abilitySubstitutions?: readonly AbilitySubstitutionRuleData[];
  resourcePreservationRules?: readonly ResourcePreservationRuleData[];
  triggeredGrants?: readonly TriggeredGrantRuleData[];
  restRules?: readonly RestRuleData[];
  capacityRules?: readonly CapacityRuleData[];
  movementInteractionRules?: readonly MovementInteractionRuleData[];
  damageRules?: readonly DamageRuleData[];
  saveRules?: readonly SaveRuleData[];
  actionRules?: readonly FeatureActionRuleData[];
  randomProperties?: readonly RandomPropertyGrantData[];
  lifecycle?: readonly LinkedLifecycleData[];
  classMechanics?: ClassMechanicsData;
  classRules?: ClassRuleData;
  /** Present when a monster feature is a reusable parameterized compendium template. */
  monsterTemplate?: MonsterFeatureTemplateData;
  /** Present when a species feature is a reusable parameterized compendium template. */
  speciesTemplate?: SpeciesFeatureTemplateData;
  manualAdjudication?: ManualAdjudicationData;
  properties?: readonly string[];
  text?: SourceText;
}
