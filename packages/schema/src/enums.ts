export const ABILITY_IDS = ["str", "dex", "con", "int", "wis", "cha"] as const;
export const SIZE_IDS = ["tiny", "small", "medium", "large", "huge", "gargantuan"] as const;
export const DAMAGE_TYPE_IDS = [
  "acid", "bludgeoning", "cold", "fire", "force", "lightning", "necrotic",
  "piercing", "poison", "psychic", "radiant", "slashing", "thunder"
] as const;
export const CONDITION_IDS = [
  "blinded", "charmed", "deafened", "exhaustion", "frightened", "grappled",
  "incapacitated", "invisible", "paralyzed", "petrified", "poisoned", "prone",
  "restrained", "stunned", "unconscious"
] as const;
export const CREATURE_TYPE_IDS = [
  "aberration", "beast", "celestial", "construct", "dragon", "elemental", "fey",
  "fiend", "giant", "humanoid", "monstrosity", "ooze", "plant", "undead"
] as const;
export const MOVEMENT_TYPE_IDS = ["walk", "burrow", "climb", "fly", "swim"] as const;
export const RECOVERY_PERIOD_IDS = ["turn", "round", "shortRest", "longRest", "dawn", "day", "week", "charges", "special"] as const;
export const ITEM_KIND_IDS = ["weapon", "armor", "equipment", "consumable", "tool", "container", "loot", "charm", "upgrade"] as const;
export const FEATURE_KIND_IDS = [
  "feat", "classFeature", "subclassFeature", "speciesFeature", "backgroundFeature",
  "monsterFeature", "optionalFeature", "darkGift", "charm"
] as const;
export const ACTIVITY_KIND_IDS = [
  "attack", "save", "check", "damage", "healing", "utility", "summon", "enchant", "multiattack", "special"
] as const;
export const CONTENT_TYPE_IDS = [
  "monster", "vehicle", "item", "spell", "feature", "class", "subclass", "species", "background", "rule", "table", "condition"
] as const;

export type CanonicalAbilityId = typeof ABILITY_IDS[number];
export type CanonicalSizeId = typeof SIZE_IDS[number];
export type CanonicalDamageTypeId = typeof DAMAGE_TYPE_IDS[number];
export type CanonicalConditionId = typeof CONDITION_IDS[number];
export type CanonicalCreatureTypeId = typeof CREATURE_TYPE_IDS[number];
export type CanonicalMovementTypeId = typeof MOVEMENT_TYPE_IDS[number];
export type CanonicalRecoveryPeriodId = typeof RECOVERY_PERIOD_IDS[number];
export type CanonicalItemKindId = typeof ITEM_KIND_IDS[number];
export type CanonicalFeatureKindId = typeof FEATURE_KIND_IDS[number];
export type CanonicalActivityKindId = typeof ACTIVITY_KIND_IDS[number];
export type CanonicalContentTypeId = typeof CONTENT_TYPE_IDS[number];
