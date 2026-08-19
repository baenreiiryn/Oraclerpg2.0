import type { ClassMechanicsData } from "./class-mechanics.js";
import type { ClassRuleData } from "./class-rules.js";
import type { ClassEquipmentBundleData } from "./class-equipment.js";
import type { AbilityId, ChoiceRef, DamageTypeId, EntityRef, JsonValue, SizeId, SourceText } from "./primitives.js";
import type { AdvancementStep, GrantData, SpellGrantGroupData } from "./feature.js";
import type { ChoiceDependencyData, EquipmentBundleData, FeaturePatchData, PredicateData } from "./mechanics.js";

export interface SpellcastingProgression {
  type: "full" | "half" | "third" | "pact" | "none" | "custom";
  ability?: AbilityId;
  preparation?: "prepared" | "known" | "alwaysPrepared" | "spellbook" | "custom";
  progression?: readonly Readonly<Record<string, number>>[];
}

export interface NamedChoiceData {
  id: string;
  choice: ChoiceRef;
  dependency?: ChoiceDependencyData;
  predicate?: PredicateData;
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
  equipmentBundles?: readonly ClassEquipmentBundleData[];
  spellcasting?: SpellcastingProgression;
  mechanics?: ClassMechanicsData;
  classRules?: ClassRuleData;
  advancement: readonly AdvancementStep[];
  subclassLevel?: number;
  text?: SourceText;
}

export interface SubclassData {
  parentClass: EntityRef;
  mechanics?: ClassMechanicsData;
  classRules?: ClassRuleData;
  advancement: readonly AdvancementStep[];
  text?: SourceText;
}

export interface SpeciesResistanceChoiceData {
  damageTypes: readonly DamageTypeId[];
  count?: number;
}

export interface SpeciesFeatureParameterData {
  feature: EntityRef;
  values: Readonly<Record<string, JsonValue>>;
}

export interface SpeciesVariantData {
  id: string;
  name: string;
  speed?: number;
  darkvision?: number;
  resistances?: readonly DamageTypeId[];
  resistanceChoice?: SpeciesResistanceChoiceData;
  spellGrants?: readonly SpellGrantGroupData[];
  featureParameters?: readonly SpeciesFeatureParameterData[];
  parameters?: Readonly<Record<string, JsonValue>>;
  grants?: readonly GrantData[];
  text?: SourceText;
}

export interface SpeciesData {
  size: readonly SizeId[];
  sizeChoice?: NamedChoiceData;
  speed: number;
  creatureType?: string;
  darkvision?: number;
  resistances?: readonly DamageTypeId[];
  resistanceChoice?: SpeciesResistanceChoiceData;
  features?: readonly EntityRef[];
  featureParameters?: readonly SpeciesFeatureParameterData[];
  spellGrants?: readonly SpellGrantGroupData[];
  variants?: readonly SpeciesVariantData[];
  grants?: readonly GrantData[];
  choices?: readonly NamedChoiceData[];
  advancement?: readonly AdvancementStep[];
  patches?: readonly FeaturePatchData[];
  text?: SourceText;
}

export interface BackgroundData {
  abilityScoreOptions?: ChoiceRef;
  skillProficiencies?: readonly string[];
  toolProficiencies?: readonly string[];
  languages?: ChoiceRef;
  originFeat?: EntityRef | ChoiceRef;
  equipment?: readonly GrantData[];
  equipmentBundles?: readonly EquipmentBundleData[];
  choices?: readonly NamedChoiceData[];
  grants?: readonly GrantData[];
  text?: SourceText;
}
