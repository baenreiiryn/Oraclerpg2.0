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

/** Runtime validator kept beside the instance schema so compendium validation cannot accidentally absorb inventory state. */
export function validateInventoryItemInstance(value: unknown): readonly string[] {
  const issues: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return ["Inventory item instance must be an object"];
  const item = value as Record<string, unknown>;
  if (typeof item.id !== "string" || !item.id.trim()) issues.push("id is required");
  if (!item.definition || typeof item.definition !== "object" || Array.isArray(item.definition)
      || typeof (item.definition as Record<string, unknown>).canonicalId !== "string") issues.push("definition.canonicalId is required");
  if (typeof item.quantity !== "number" || !Number.isInteger(item.quantity) || item.quantity < 0) issues.push("quantity must be a non-negative integer");
  if (item.containerInstanceId !== undefined && (typeof item.containerInstanceId !== "string" || !item.containerInstanceId.trim())) issues.push("containerInstanceId must be a non-empty instance id");
  if (item.currentUses !== undefined) {
    if (!item.currentUses || typeof item.currentUses !== "object" || Array.isArray(item.currentUses)) issues.push("currentUses must be an object");
    else {
      const uses = item.currentUses as Record<string, unknown>;
      if (typeof uses.value !== "number" || !Number.isFinite(uses.value) || uses.value < 0) issues.push("currentUses.value must be a non-negative number");
      if (uses.max !== undefined && (typeof uses.max !== "number" || !Number.isFinite(uses.max) || uses.max < 0)) issues.push("currentUses.max must be a non-negative number");
    }
  }
  return issues;
}
