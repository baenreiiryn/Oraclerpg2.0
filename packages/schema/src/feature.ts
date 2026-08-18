import type { ActivityData } from "./activity.js";
import type { AbilityId, ChoiceRef, EntityRef, SourceText } from "./primitives.js";

export type FeatureKind =
  | "feat" | "classFeature" | "subclassFeature" | "speciesFeature"
  | "backgroundFeature" | "monsterFeature" | "optionalFeature";

export interface PrerequisiteData {
  minimumLevel?: number;
  abilities?: Partial<Record<AbilityId, number>>;
  requiredEntities?: readonly EntityRef[];
  requiredTags?: readonly string[];
  campaign?: readonly string[];
  special?: string;
}

export interface GrantData {
  type: "entity" | "proficiency" | "expertise" | "language" | "sense" | "movement" | "ability" | "spell" | "resource" | "custom";
  entity?: EntityRef;
  choice?: ChoiceRef;
  value?: unknown;
  level?: number;
}

export interface AdvancementStep {
  level: number;
  grants?: readonly GrantData[];
  choices?: readonly ChoiceRef[];
  scaleValues?: Readonly<Record<string, string | number>>;
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
  properties?: readonly string[];
  text?: SourceText;
}
