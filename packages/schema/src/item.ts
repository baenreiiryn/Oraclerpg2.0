import type { ActivityData, UsesSpec } from "./activity.js";
import type { AbilityId, CurrencyId, DamageTypeId, EntityRef, FormulaValue, SourceText } from "./primitives.js";
import type {
  ActionReplacementData, EffectData, EntityBenefitGrantData, ItemSentienceData, ManualAdjudicationData,
  ModifierData, PredicateData, RandomPropertyGrantData, StateVariableData, TriggerData
} from "./mechanics.js";

export type ItemKind = "weapon" | "armor" | "equipment" | "consumable" | "tool" | "container" | "pack" | "mount" | "vehiclePurchase" | "loot" | "charm" | "upgrade";
export type RarityId = "common" | "uncommon" | "rare" | "veryRare" | "legendary" | "artifact" | "varies" | "unknown";
export type WeightUnitId = "lb" | "oz" | "kg" | "g" | "ton" | "custom";

export interface PriceValue {
  amount: number;
  currency: CurrencyId;
}

export interface WeightValue {
  value: number;
  unit: WeightUnitId;
  customUnit?: string;
}

export interface AbilityAdjustmentData {
  ability: AbilityId;
  mode: "set" | "bonus";
  value: number;
  description?: string;
}

export interface AttunementRequirementData {
  races?: readonly string[];
  classes?: readonly string[];
  requiresSpellcasting?: boolean;
  description?: string;
}

export interface MovementModificationData {
  movement: "walk" | "burrow" | "climb" | "fly" | "swim";
  mode: "set" | "multiply" | "equal" | "bonus";
  value?: number;
  equalTo?: "walk" | "burrow" | "climb" | "fly" | "swim";
  unit?: "ft";
}

export interface LightEmissionData {
  bright?: number;
  dim?: number;
  shape?: "radius" | "cone";
  unit: "ft";
}

export type PoisonApplicationType = "contact" | "ingested" | "inhaled" | "injury";

export interface ItemGrantMarkerData {
  kind: "language" | "proficiency";
  mode: "rulesText" | "fixed" | "choice";
  values?: readonly string[];
  count?: number;
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
  /** Template/reference quantity only. Runtime inventory quantity belongs to InventoryItemInstanceData. */
  quantity?: number;
  weight?: WeightValue;
  price?: PriceValue;
  rarity?: RarityId;
  magical?: boolean;
  cursed?: boolean;
  attunement?: "none" | "required" | "optional" | "special";
  attunementRequirements?: AttunementRequirementData;
  properties?: readonly string[];
  abilityAdjustments?: readonly AbilityAdjustmentData[];
  damageResistances?: readonly DamageTypeId[];
  damageImmunities?: readonly DamageTypeId[];
  movementModifications?: readonly MovementModificationData[];
  light?: readonly LightEmissionData[];
  grants?: readonly ItemGrantMarkerData[];
  spellcastingFocusFor?: readonly string[];
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
  poisonApplicationTypes?: readonly PoisonApplicationType[];
  spellScrollLevel?: number;
}

export interface ToolData extends PhysicalItemData {
  itemKind: "tool";
  toolType?: string;
  ability?: string;
}

export interface ContainerAcceptedItemData {
  item: EntityRef;
  maxQuantity?: number;
}

/** One independent capacity rule/compartment of a container. */
export interface ContainerCompartmentData {
  id: string;
  label?: string;
  maxItems?: number;
  maxWeight?: WeightValue;
  acceptedItems?: readonly EntityRef[];
  acceptedItemLimits?: readonly ContainerAcceptedItemData[];
  acceptedTags?: readonly string[];
  description?: string;
}

export interface ContainerData extends PhysicalItemData {
  itemKind: "container";
  containerType?: "quiver" | "pouch" | "sack" | "backpack" | "chest" | "case" | "vessel" | "other";
  capacity?: {
    weight?: WeightValue;
    items?: number;
    volume?: number;
    volumeUnit?: "cubicFoot" | "pint" | "gallon" | "liter" | "other";
    contentsWeightless?: boolean;
  };
  compartments?: readonly ContainerCompartmentData[];
  /** Defined/default package contents only; current runtime contents belong to inventory instances. */
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

/** A purchasable mount listing; the linked monster carries its full combat stat block. */
export interface MountData extends PhysicalItemData {
  itemKind: "mount";
  speed: number;
  carryingCapacity?: number;
  creature?: EntityRef;
}

/** A purchasable vehicle listing; the linked Vehicle entity owns the complete runtime stat block. */
export interface VehiclePurchaseData extends PhysicalItemData {
  itemKind: "vehiclePurchase";
  vehicle?: EntityRef;
  armorClass?: number;
  hitPoints?: number;
  damageThreshold?: number;
  speed?: number;
  speedUnit?: "mph" | "ft";
  crew?: number;
  passengers?: number;
  cargoCapacity?: number;
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
  | WeaponData | ArmorData | ConsumableData | ToolData | ContainerData | PackData | MountData | VehiclePurchaseData | EquipmentData | LootData | CharmData | UpgradeData;
