import type { MechanicalStateSnapshot, OracleId, TurnIntent } from "../contracts.js";

export type ContextVisibility =
  | "PUBLIC"
  | "DISCOVERED"
  | "ACTOR_ONLY"
  | "GM_ONLY"
  | "HIDDEN";

export type ContextEntityKind =
  | "PC"
  | "NPC"
  | "CREATURE"
  | "LOCATION"
  | "FACTION"
  | "ORGANIZATION"
  | "ITEM"
  | "QUEST"
  | "EVENT"
  | "DEITY"
  | "OTHER";

export interface CampaignContextSection {
  campaignId: OracleId;
  name?: string;
  systemId?: string;
  setting?: string;
  tone?: readonly string[];
  worldTime?: string;
}

export interface SceneContextSection {
  sceneId?: OracleId;
  locationId?: OracleId;
  name?: string;
  mode?: "EXPLORATION" | "SOCIAL" | "COMBAT" | "DOWNTIME" | "TRAVEL" | "OTHER";
  participantIds: readonly OracleId[];
  threatIds: readonly OracleId[];
  openThreads: readonly string[];
  recentEvents: readonly string[];
}

export interface ActorContextEntry {
  actorId: OracleId;
  entityId?: OracleId;
  name: string;
  kind: "PC" | "NPC" | "CREATURE";
  playerControlled: boolean;
  present: boolean;
  summary?: string;
}

export interface EntityContextEntry {
  entityId: OracleId;
  kind: ContextEntityKind;
  name: string;
  summary?: string;
  tags?: readonly string[];
  relatedEntityIds?: readonly OracleId[];
}

export interface KnowledgeFact {
  factId: OracleId;
  statement: string;
  visibility: ContextVisibility;
  actorIds?: readonly OracleId[];
  entityIds?: readonly OracleId[];
  confidence?: number;
}

export interface KnowledgeContextSection {
  facts: readonly KnowledgeFact[];
}

export interface MechanicalContextSection {
  actorId: OracleId;
  conditions: readonly string[];
  resources: Readonly<Record<string, unknown>>;
  equippedItemIds: readonly OracleId[];
  availableActionRefs: readonly string[];
  state: Readonly<Record<string, unknown>>;
}

export interface OracleContextSections {
  campaign: CampaignContextSection;
  scene: SceneContextSection;
  actors: readonly ActorContextEntry[];
  entities: readonly EntityContextEntry[];
  knowledge: KnowledgeContextSection;
  mechanics: MechanicalContextSection;
}

export interface OracleContextSource {
  campaign: CampaignContextSection;
  scene: SceneContextSection;
  actors: readonly ActorContextEntry[];
  entities: readonly EntityContextEntry[];
  knowledge: readonly KnowledgeFact[];
  mechanics: MechanicalContextSection;
}

export interface ContextSourcePort {
  loadContextSource(input: {
    intent: TurnIntent;
    state: MechanicalStateSnapshot;
  }): Promise<OracleContextSource>;
}
