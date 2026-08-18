import type { AbilityId, ConditionId, DamageTypeId, DistanceValue, EntityRef, FormulaValue, SourceText } from "./primitives.js";
import type { ActivityData } from "./activity.js";
import type { EffectData, PredicateData, TriggerData } from "./mechanics.js";

export interface VehicleCapacityData {
  creatures?: { count: number; sizes?: readonly string[] };
  cargoWeight?: number;
  cargoUnit?: "lb";
}

export interface VehicleThresholdData {
  damage?: number;
  mishap?: number;
}

export interface TravelPaceData {
  perHour?: number;
  perDay?: number;
  unit: "mile";
}

export interface VehicleStationData {
  id: string;
  name: string;
  crewRequired: number;
  cover?: "half" | "threeQuarters" | "total" | "none";
  activities?: readonly ActivityData[];
  grants?: readonly EntityRef[];
  predicate?: PredicateData;
  description?: string;
}

export interface VehicleData {
  size: string;
  weight?: number;
  capacity?: VehicleCapacityData;
  armorClass: readonly { value: number; predicate?: PredicateData; description?: string }[];
  hitPoints: { maximum: number; formula?: string };
  thresholds?: VehicleThresholdData;
  speed?: DistanceValue;
  travelPace?: TravelPaceData;
  abilities?: Partial<Record<AbilityId, number>>;
  damageImmunities?: readonly DamageTypeId[];
  conditionImmunities?: readonly ConditionId[];
  traits?: readonly EntityRef[];
  activities?: readonly ActivityData[];
  reactions?: readonly ActivityData[];
  stations?: readonly VehicleStationData[];
  effects?: readonly EffectData[];
  triggers?: readonly TriggerData[];
  text?: SourceText;
}
