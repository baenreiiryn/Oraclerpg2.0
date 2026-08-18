import type { EntityRef, JsonValue } from "./primitives.js";

/** Runtime state for one item instance owned by an actor/inventory. The canonical compendium item remains immutable. */
export interface InventoryItemInstanceData {
  id: string;
  definition: EntityRef;
  quantity: number;
  customName?: string;
  equipped?: boolean;
  attuned?: boolean;
  identified?: boolean;
  /** Parent inventory item instance, not a canonical compendium entity. */
  containerInstanceId?: string;
  currentUses?: {
    value: number;
    max?: number;
  };
  /** Runtime-only overrides such as temporary enchantments, damage, or GM adjustments. */
  overrides?: Readonly<Record<string, JsonValue>>;
}

export interface InventoryContainerIndexEntry {
  containerInstanceId: string;
  childInstanceIds: readonly string[];
}
