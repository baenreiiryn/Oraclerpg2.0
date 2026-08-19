import type { EquipmentBundleData } from "./item.js";

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
