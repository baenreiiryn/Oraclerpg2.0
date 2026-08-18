import type { ActivityData, ScalingRule } from "./activity.js";
import type { AbilityId, EntityRef, SourceText } from "./primitives.js";

export type SpellSchoolId =
  | "abjuration" | "conjuration" | "divination" | "enchantment"
  | "evocation" | "illusion" | "necromancy" | "transmutation";

export interface SpellComponentData {
  verbal?: boolean;
  somatic?: boolean;
  material?: {
    text?: string;
    costGp?: number;
    consumed?: boolean;
  };
}

export interface SpellData {
  level: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  school: SpellSchoolId;
  ritual?: boolean;
  concentration?: boolean;
  spellcastingAbility?: AbilityId;
  components: SpellComponentData;
  activities: readonly ActivityData[];
  scaling?: readonly ScalingRule[];
  spellLists?: readonly EntityRef[];
  tags?: readonly string[];
  text?: SourceText;
}
