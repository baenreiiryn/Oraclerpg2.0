import type {
  CanonicalAbilityId, CanonicalConditionId, CanonicalContentTypeId, CanonicalCreatureTypeId,
  CanonicalDamageTypeId, CanonicalMovementTypeId, CanonicalRecoveryPeriodId, CanonicalSizeId
} from "./enums.js";

export type AbilityId = CanonicalAbilityId;
export type SizeId = CanonicalSizeId;
export type DamageTypeId = CanonicalDamageTypeId;
export type ConditionId = CanonicalConditionId;
export type CreatureTypeId = CanonicalCreatureTypeId;
export type MovementTypeId = CanonicalMovementTypeId;
export type RecoveryPeriod = CanonicalRecoveryPeriodId;
export type DistanceUnit = "ft" | "mile" | "self" | "touch" | "sight" | "unlimited" | "special";
export type TimeUnit = "action" | "bonusAction" | "reaction" | "free" | "round" | "minute" | "hour" | "day" | "special";
export type CurrencyId = "cp" | "sp" | "ep" | "gp" | "pp";

export type ScalarValue = string | number | boolean | null;
export type JsonValue = ScalarValue | readonly JsonValue[] | { readonly [key: string]: JsonValue };

export interface FormulaValue {
  formula: string;
  average?: number;
}

export interface DistanceValue {
  value?: number;
  unit: DistanceUnit;
}

export interface SourceText {
  summary?: string;
  rules?: readonly RichEntry[];
  higherLevel?: readonly RichEntry[];
  notes?: readonly RichEntry[];
}

export type RichEntry =
  | string
  | { type: "entries"; name?: string; entries: readonly RichEntry[] }
  | { type: "list"; items: readonly RichEntry[] }
  | { type: "table"; caption?: string; columns: readonly string[]; rows: readonly (readonly JsonValue[])[] };

export interface EntityRef {
  canonicalId: string;
  name?: string;
  entityType?: CanonicalContentTypeId | `custom:${string}`;
}

export type QueryOperator = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "notIn" | "has" | "lacks";

export interface QueryClause {
  field: string;
  operator: QueryOperator;
  value: JsonValue;
}

export interface ChoiceQuery {
  all?: readonly QueryClause[];
  any?: readonly QueryClause[];
  not?: readonly QueryClause[];
}

export interface ChoiceRef {
  kind: "entity" | "tagQuery" | "enum" | "number" | "text";
  count?: number;
  options?: readonly string[];
  entityTypes?: readonly (CanonicalContentTypeId | `custom:${string}`)[];
  query?: ChoiceQuery;
}
