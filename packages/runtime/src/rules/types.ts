import type { MechanicalStateSnapshot } from "@oraclerpg/ai";
import type { ActivityData } from "@oraclerpg/schema";

export type RulesCompendiumKind = "feature" | "spell" | "item" | "other";

export interface RulesCompendiumRecord {
  canonicalId: string;
  entityType: string;
  kind: RulesCompendiumKind;
  name: string;
  activities: readonly ActivityData[];
  data: Readonly<Record<string, unknown>>;
}

export interface CompendiumLookupPort {
  getByCanonicalId(canonicalId: string): Promise<RulesCompendiumRecord | undefined>;
}

export interface RuntimeResourceState {
  current: number;
  max?: number;
}

/**
 * Runtime-authoritative projection used by the deterministic rules bridge.
 * These refs are capabilities already granted by character/world state; the
 * bridge cross-checks them against canonical compendium records and activities.
 */
export interface ActorRulesState {
  actorId: string;
  conditions: readonly string[];
  resources: Readonly<Record<string, RuntimeResourceState>>;
  usableFeatureRefs: readonly string[];
  castableSpellRefs: readonly string[];
  usableItemRefs: readonly string[];
  availableActionRefs: readonly string[];
  availableTargetIds: readonly string[];
  shortRestAllowed?: boolean;
  longRestAllowed?: boolean;
}

export interface RulesStateProjectionPort {
  projectRulesState(state: MechanicalStateSnapshot): Promise<ActorRulesState>;
}

export type RulesDecision = "LEGAL" | "ILLEGAL" | "MANUAL";

export interface ResourceRequirement {
  resourceId: string;
  amount: number;
  available: number;
}

export interface RulesResolution {
  decision: RulesDecision;
  reason: string;
  actorId: string;
  targetIds: readonly string[];
  actionRef: string;
  source?: {
    canonicalId: string;
    kind: RulesCompendiumKind;
    name: string;
  };
  activity?: {
    id: string;
    name: string;
    kind: ActivityData["kind"];
  };
  requiredResources: readonly ResourceRequirement[];
  conditions: readonly string[];
}
