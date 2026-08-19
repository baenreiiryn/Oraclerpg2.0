import type { ActivityData } from "./activity.js";
import type { ClassMechanicsData } from "./class-mechanics.js";
import type { ClassRuleData } from "./class-rules.js";
import type { MonsterFeatureTemplateData } from "./monster-feature.js";
import type { AbilityId, ChoiceRef, EntityRef, JsonValue, SourceText } from "./primitives.js";
import type {
  ChoiceDependencyData, CrossResourceRuleData, EffectData, EntityBenefitGrantData, FeaturePatchData,
  LinkedLifecycleData, ManualAdjudicationData, ModifierData, PredicateData, RandomPropertyGrantData,
  RuntimeValueRef, StateVariableData
} from "./mechanics.js";

export type FeatureKind =
  | "feat" | "classFeature" | "subclassFeature" | "speciesFeature"
  | "backgroundFeature" | "monsterFeature" | "optionalFeature" | "darkGift" | "charm";

export interface PrerequisiteData {
  minimumLevel?: number;
  abilities?: Partial<Record<AbilityId, number>>;
  requiredEntities?: readonly EntityRef[];
  requiredTags?: readonly string[];
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
  subtype?: string;
  repeatable?: boolean;
  prerequisites?: readonly PrerequisiteData[];
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
