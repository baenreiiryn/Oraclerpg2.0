import type { ActivityData, UsesSpec } from "./activity.js";
import type { CurrencyId, DamageTypeId, EntityRef, FormulaValue, SourceText } from "./primitives.js";
import type {
  ActionReplacementData, EffectData, EntityBenefitGrantData, ItemSentienceData, ManualAdjudicationData,
  ModifierData, PredicateData, RandomPropertyGrantData, StateVariableData, TriggerData
} from "./mechanics.js";

export type ItemKind = "weapon" | "armor" | "equipment" | "consumable" | "tool" | "container" | "pack" | "loot" | "charm" | "upgrade";
export type RarityId = "common" | "uncommon" | "rare" | "veryRare" | "legendary" | "artifact" | "varies" | "unknown";

export interface PriceValue {
  amount: number;
  currency: CurrencyId;
}

/** A quantity-aware reference used by containers, ammunition bundles, kits, and equipment packs. */
export interface ItemStackRef {
  item: EntityRef;
  quantity: number;
  unit?: string;
  consumedWithParent?: boolean;
}

export interface PhysicalItemData {
  itemKind: ItemKind;
  quantity?: number;
  weight?: number;
  price?: PriceValue;
  rarity?: RarityId;
  magical?: boolean;
  attunement?: "none" | "required" | "optional" | "special";
  properties?: readonly string[];
  uses?: UsesSpec;
  activities?: readonly ActivityData[];
  grantedFeatures?: readonly EntityRef[];
  benefitGrants?: readonly EntityBenefitGrantData[];
  effects?: readonly EffectData[];
  modifiers?: readonly ModifierData[];
  states?: readonly StateVariableData[];
  triggers?: readonly TriggerData[];
  actionReplacements?: readonly ActionReplacementData[];
  randomProperties?: readonly RandomPropertyGrantData[];
  sentience?: ItemSentienceData;
  manualAdjudication?: ManualAdjudicationData;
  consumeSelf?: boolean;
  destruction?: SourceText;
  text?: SourceText;
}

export interface WeaponData extends PhysicalItemData {
  itemKind: "weapon";
  category: "simple" | "martial" | "improvised" | "natural" | "special";
  mode: "melee" | "ranged";
  damage: {
    base: readonly { formula: string; damageType: DamageTypeId }[];
    versatile?: readonly { formula: string; damageType: DamageTypeId }[];
  };
  range?: { normal?: number; long?: number; reach?: number; unit: "ft" };
  mastery?: string;
  ammunitionType?: string;
  magicalBonus?: FormulaValue;
}

export interface ArmorData extends PhysicalItemData {
  itemKind: "armor";
  category: "light" | "medium" | "heavy" | "shield" | "natural" | "other";
  armorClass: {
    base: number;
    dexterity?: "none" | "full" | "capped";
    dexterityCap?: number;
    bonus?: FormulaValue;
  };
  strengthRequirement?: number;
  stealthDisadvantage?: boolean;
}

export interface ConsumableData extends PhysicalItemData {
  itemKind: "consumable";
  consumableType?: "potion" | "poison" | "food" | "scroll" | "ammo" | "charge" | "other";
  consumeOnUse?: boolean;
}

export interface ToolData extends PhysicalItemData {
  itemKind: "tool";
  toolType?: string;
  ability?: string;
}

/** One independent capacity rule/compartment of a container. */
export interface ContainerCompartmentData {
  id: string;
  label?: string;
  maxItems?: number;
  maxWeight?: number;
  acceptedItems?: readonly EntityRef[];
  acceptedTags?: readonly string[];
  description?: string;
}

export interface ContainerData extends PhysicalItemData {
  itemKind: "container";
  containerType?: "quiver" | "pouch" | "sack" | "backpack" | "chest" | "case" | "vessel" | "other";
  capacity?: {
    weight?: number;
    items?: number;
    volume?: number;
    volumeUnit?: "cubicFoot" | "pint" | "gallon" | "liter" | "other";
  };
  compartments?: readonly ContainerCompartmentData[];
  contents?: readonly ItemStackRef[];
  restrictsTo?: readonly string[];
}

/** A purchased bundle whose contents become independent inventory items when unpacked. */
export interface PackData extends PhysicalItemData {
  itemKind: "pack";
  packType?: "equipment" | "ammunition" | "toolKit" | "bundle" | "other";
  contents: readonly ItemStackRef[];
  unpackBehavior?: "addContents" | "replacePack";
}

export interface EquipmentData extends PhysicalItemData {
  itemKind: "equipment";
  equipmentType?: string;
}

export interface LootData extends PhysicalItemData {
  itemKind: "loot";
  lootType?: string;
}

export interface CharmData extends PhysicalItemData {
  itemKind: "charm";
  lifetime?: { value: number; unit: "hour" | "day" };
  choices?: readonly string[];
}

export interface UpgradeData extends PhysicalItemData {
  itemKind: "upgrade";
  appliesTo?: readonly string[];
  installationPredicate?: PredicateData;
}

export type CanonicalItemData =
  | WeaponData | ArmorData | ConsumableData | ToolData | ContainerData | PackData | EquipmentData | LootData | CharmData | UpgradeData;
