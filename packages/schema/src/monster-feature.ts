import type { ActivityData, ActivityTarget, DamagePart } from "./activity.js";
import type { FeatureData } from "./feature.js";
import type { AbilityId, ConditionId, DamageTypeId, EntityRef, JsonValue } from "./primitives.js";

export type MonsterFeatureFamily =
  | "naturalAttack"
  | "breathWeapon"
  | "multiattack"
  | "trait"
  | "movementTrait"
  | "aura"
  | "spellcasting"
  | "reaction"
  | "legendaryAction"
  | "lairAction"
  | "special";

export type MonsterFeatureParameterKind =
  | "damageType"
  | "damageFormula"
  | "areaShape"
  | "distance"
  | "ability"
  | "saveAbility"
  | "saveDc"
  | "attackBonus"
  | "condition"
  | "recharge"
  | "number"
  | "boolean"
  | "string"
  | "entityRef";

export interface MonsterFeatureParameterDefinition {
  id: string;
  name: string;
  kind: MonsterFeatureParameterKind;
  required?: boolean;
  defaultValue?: JsonValue;
  allowedValues?: readonly JsonValue[];
  description?: string;
}

/**
 * Declares how one template parameter is copied into the materialized feature.
 * Paths are relative to FeatureData, for example `activities.0.damage.0.damageType`.
 */
export interface MonsterFeatureParameterBinding {
  parameterId: string;
  path: string;
  operation?: "replace" | "merge";
}

/** Metadata that turns a normal monster FeatureData record into a reusable template. */
export interface MonsterFeatureTemplateData {
  family: MonsterFeatureFamily;
  parameters?: readonly MonsterFeatureParameterDefinition[];
  bindings?: readonly MonsterFeatureParameterBinding[];
}

export interface MonsterFeatureDefinitionData extends FeatureData {
  featureKind: "monsterFeature";
  monsterTemplate: MonsterFeatureTemplateData;
}

export interface MonsterFeatureInstanceProvenance {
  definition: EntityRef;
  /** Optional content hash or source revision used when the copy was created. */
  definitionRevision?: string;
}

/**
 * Embedded copy owned by a monster. `data` is a complete materialized snapshot.
 * Editing this instance never mutates the compendium definition.
 */
export interface MonsterFeatureInstanceData {
  id: string;
  name: string;
  provenance: MonsterFeatureInstanceProvenance;
  parameterValues?: Readonly<Record<string, JsonValue>>;
  data: FeatureData;
}

/** Convenience shape for natural attacks generated from the shared attack template. */
export interface NaturalAttackConfiguration {
  attackAbility?: AbilityId;
  attackBonus?: number | string;
  reach?: number;
  damage: readonly DamagePart[];
  target?: ActivityTarget;
}

/** Convenience shape for breath weapons generated from the shared breath template. */
export interface BreathWeaponConfiguration {
  saveAbility: AbilityId;
  saveDc: number | string;
  damage: readonly DamagePart[];
  area: NonNullable<ActivityTarget["area"]>;
  recharge?: { min: number; max: number };
  conditions?: readonly ConditionId[];
  damageTypes?: readonly DamageTypeId[];
}

export interface MonsterFeatureMaterializationResult {
  instance: MonsterFeatureInstanceData;
  unboundParameters: readonly string[];
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function setPath(target: Record<string, unknown>, path: string, value: JsonValue, operation: "replace" | "merge"): void {
  const parts = path.split(".").filter(Boolean);
  if (!parts.length) throw new Error("Monster feature binding path cannot be empty");
  let cursor: Record<string, unknown> | unknown[] = target;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i]!;
    const index = Number(key);
    const next = Array.isArray(cursor) && Number.isInteger(index) ? cursor[index] : (cursor as Record<string, unknown>)[key];
    if (next === undefined || next === null || (typeof next !== "object")) {
      throw new Error(`Monster feature binding path does not exist: ${path}`);
    }
    cursor = next as Record<string, unknown> | unknown[];
  }
  const last = parts.at(-1)!;
  const index = Number(last);
  const current = Array.isArray(cursor) && Number.isInteger(index) ? cursor[index] : (cursor as Record<string, unknown>)[last];
  const nextValue = operation === "merge" && current && typeof current === "object" && !Array.isArray(current) && value && typeof value === "object" && !Array.isArray(value)
    ? { ...(current as Record<string, unknown>), ...(value as Record<string, JsonValue>) }
    : value;
  if (Array.isArray(cursor) && Number.isInteger(index)) cursor[index] = nextValue;
  else (cursor as Record<string, unknown>)[last] = nextValue;
}

/**
 * Creates an actor-owned snapshot from a compendium template. The definition object is never mutated.
 */
export function materializeMonsterFeature(
  definitionRef: EntityRef,
  definition: MonsterFeatureDefinitionData,
  instanceId: string,
  parameterValues: Readonly<Record<string, JsonValue>> = {},
  definitionRevision?: string
): MonsterFeatureMaterializationResult {
  const data = cloneJson<FeatureData>(definition);
  const values: Record<string, JsonValue> = {};
  const unboundParameters: string[] = [];

  for (const parameter of definition.monsterTemplate.parameters ?? []) {
    const value = parameterValues[parameter.id] ?? parameter.defaultValue;
    if (value === undefined) {
      if (parameter.required) unboundParameters.push(parameter.id);
      continue;
    }
    values[parameter.id] = value;
  }

  for (const binding of definition.monsterTemplate.bindings ?? []) {
    const value = values[binding.parameterId];
    if (value === undefined) continue;
    setPath(data as unknown as Record<string, unknown>, binding.path, value, binding.operation ?? "replace");
  }

  return {
    instance: {
      id: instanceId,
      name: definitionRef.name ?? "Monster Feature",
      provenance: {
        definition: cloneJson(definitionRef),
        ...(definitionRevision ? { definitionRevision } : {})
      },
      ...(Object.keys(values).length ? { parameterValues: values } : {}),
      data
    },
    unboundParameters
  };
}
