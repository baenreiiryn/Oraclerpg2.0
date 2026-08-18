import type { ActivityData, UsesSpec } from "./activity.js";
import type { CurrencyId, DamageTypeId, EntityRef, FormulaValue, SourceText } from "./primitives.js";

export type ItemKind = "weapon" | "armor" | "equipment" | "consumable" | "tool" | "container" | "loot";
export type RarityId = "common" | "uncommon" | "rare" | "veryRare" | "legendary" | "artifact" | "varies" | "unknown";

export interface PriceValue {
  amount: number;
  currency: CurrencyId;
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

export interface ContainerData extends PhysicalItemData {
  itemKind: "container";
  capacity?: {
    weight?: number;
    items?: number;
    volume?: number;
  };
  contents?: readonly EntityRef[];
}

export interface EquipmentData extends PhysicalItemData {
  itemKind: "equipment";
  equipmentType?: string;
}

export interface LootData extends PhysicalItemData {
  itemKind: "loot";
  lootType?: string;
}

export type CanonicalItemData = WeaponData | ArmorData | ConsumableData | ToolData | ContainerData | EquipmentData | LootData;
