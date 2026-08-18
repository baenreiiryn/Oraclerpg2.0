export type AbilityId = "str" | "dex" | "con" | "int" | "wis" | "cha";
export type SizeId = "tiny" | "small" | "medium" | "large" | "huge" | "gargantuan";
export type DamageTypeId =
  | "acid" | "bludgeoning" | "cold" | "fire" | "force" | "lightning" | "necrotic"
  | "piercing" | "poison" | "psychic" | "radiant" | "slashing" | "thunder";
export type ConditionId =
  | "blinded" | "charmed" | "deafened" | "exhaustion" | "frightened" | "grappled"
  | "incapacitated" | "invisible" | "paralyzed" | "petrified" | "poisoned" | "prone"
  | "restrained" | "stunned" | "unconscious";
export type CreatureTypeId =
  | "aberration" | "beast" | "celestial" | "construct" | "dragon" | "elemental" | "fey"
  | "fiend" | "giant" | "humanoid" | "monstrosity" | "ooze" | "plant" | "undead";
export type MovementTypeId = "walk" | "burrow" | "climb" | "fly" | "swim";
export type DistanceUnit = "ft" | "mile" | "self" | "touch" | "sight" | "unlimited" | "special";
export type TimeUnit = "action" | "bonusAction" | "reaction" | "free" | "round" | "minute" | "hour" | "day" | "special";
export type RecoveryPeriod = "turn" | "round" | "shortRest" | "longRest" | "dawn" | "day" | "week" | "charges" | "special";
export type CurrencyId = "cp" | "sp" | "ep" | "gp" | "pp";

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
  | { type: "table"; caption?: string; columns: readonly string[]; rows: readonly (readonly unknown[])[] };

export interface EntityRef {
  canonicalId: string;
  name?: string;
  entityType?: string;
}

export interface ChoiceRef {
  kind: "entity" | "tagQuery" | "enum" | "number" | "text";
  count?: number;
  options?: readonly string[];
  entityTypes?: readonly string[];
  query?: Readonly<Record<string, unknown>>;
}
