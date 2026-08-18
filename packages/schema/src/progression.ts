import type { AbilityId, ChoiceRef, EntityRef, SizeId, SourceText } from "./primitives.js";
import type { AdvancementStep, GrantData } from "./feature.js";

export interface SpellcastingProgression {
  type: "full" | "half" | "third" | "pact" | "none" | "custom";
  ability?: AbilityId;
  preparation?: "prepared" | "known" | "alwaysPrepared" | "spellbook" | "custom";
  progression?: readonly Readonly<Record<string, number>>[];
}

export interface ClassData {
  hitDie: 6 | 8 | 10 | 12;
  primaryAbilities?: readonly AbilityId[];
  savingThrowProficiencies?: readonly AbilityId[];
  armorTraining?: readonly string[];
  weaponProficiencies?: readonly string[];
  toolProficiencies?: readonly string[];
  skillChoices?: ChoiceRef;
  startingEquipment?: readonly GrantData[];
  spellcasting?: SpellcastingProgression;
  advancement: readonly AdvancementStep[];
  subclassLevel?: number;
  text?: SourceText;
}

export interface SubclassData {
  parentClass: EntityRef;
  advancement: readonly AdvancementStep[];
  text?: SourceText;
}

export interface SpeciesData {
  size: readonly SizeId[];
  speed: number;
  creatureType?: string;
  grants?: readonly GrantData[];
  choices?: readonly ChoiceRef[];
  text?: SourceText;
}

export interface BackgroundData {
  abilityScoreOptions?: ChoiceRef;
  skillProficiencies?: readonly string[];
  toolProficiencies?: readonly string[];
  languages?: ChoiceRef;
  originFeat?: EntityRef | ChoiceRef;
  equipment?: readonly GrantData[];
  grants?: readonly GrantData[];
  text?: SourceText;
}
