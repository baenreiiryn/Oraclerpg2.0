import type { FeatureData } from "./feature.js";
import type { CanonicalItemData } from "./item.js";
import type { MonsterData } from "./monster.js";
import type { BackgroundData, ClassData, SpeciesData, SubclassData } from "./progression.js";
import type { SpellData } from "./spell.js";
import type { JsonValue, RichEntry } from "./primitives.js";
import type { VehicleData } from "./vehicle.js";

export interface RuleData {
  category?: string;
  entries: readonly RichEntry[];
}

export interface TableData {
  formula?: string;
  columns: readonly string[];
  rows: readonly (readonly JsonValue[])[];
}

export interface ConditionData {
  entries: readonly RichEntry[];
}

export interface CanonicalContentMap {
  monster: MonsterData;
  vehicle: VehicleData;
  item: CanonicalItemData;
  spell: SpellData;
  feature: FeatureData;
  class: ClassData;
  subclass: SubclassData;
  species: SpeciesData;
  background: BackgroundData;
  rule: RuleData;
  table: TableData;
  condition: ConditionData;
}

export type CanonicalContentType = keyof CanonicalContentMap;
export type CanonicalContentData<T extends CanonicalContentType> = CanonicalContentMap[T];
