import type { EquipmentBundleData } from "./mechanics.js";

/** Category grants mirror source rules that grant a type of equipment rather than one canonical item. */
export type EquipmentCategoryId =
  | "holySymbol"
  | "arcaneFocus"
  | "druidicFocus"
  | "spellbook"
  | "musicalInstrument"
  | "artisanTools"
  | "gamingSet"
  | "custom";

export type ClassEquipmentGrantData = EquipmentBundleData["grants"][number] & {
  equipmentCategory?: EquipmentCategoryId;
};

export interface ClassEquipmentBundleData extends Omit<EquipmentBundleData, "grants"> {
  grants: readonly ClassEquipmentGrantData[];
}
