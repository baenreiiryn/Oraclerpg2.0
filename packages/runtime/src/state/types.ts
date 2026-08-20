import type { ContextEntityKind, ContextVisibility } from "@oraclerpg/ai";

export type WorldRevision = number;

export interface CampaignWorldMetadata {
  campaignId: string;
  name?: string;
  systemId?: string;
  setting?: string;
  tone?: readonly string[];
  worldTime?: string;
}

export interface WorldSceneState {
  sceneId: string;
  locationId?: string;
  name?: string;
  mode?: "EXPLORATION" | "SOCIAL" | "COMBAT" | "DOWNTIME" | "TRAVEL" | "OTHER";
  participantIds: readonly string[];
  threatIds: readonly string[];
  openThreads: readonly string[];
  recentEvents: readonly string[];
}

export interface WorldActorState {
  actorId: string;
  entityId?: string;
  name: string;
  kind: "PC" | "NPC" | "CREATURE";
  playerControlled: boolean;
  present: boolean;
  summary?: string;
}

export interface WorldEntityState {
  entityId: string;
  kind: ContextEntityKind;
  name: string;
  summary?: string;
  tags?: readonly string[];
  relatedEntityIds?: readonly string[];
}

export interface WorldRelationshipState {
  relationshipId: string;
  fromEntityId: string;
  toEntityId: string;
  type: string;
  stance?: "ALLY" | "FRIENDLY" | "NEUTRAL" | "WARY" | "HOSTILE" | "RIVAL" | "OTHER";
  summary?: string;
  visibility?: ContextVisibility;
  actorIds?: readonly string[];
}

/** Objective campaign truth. It exists independently of who knows it. */
export interface WorldFactState {
  factId: string;
  statement: string;
  entityIds?: readonly string[];
  confidence?: number;
  secrecy: "PUBLIC" | "GM_ONLY" | "HIDDEN";
  active: boolean;
}

/** Perspective grant linking an objective fact to one or more actors. */
export interface KnowledgeGrantState {
  grantId: string;
  factId: string;
  mode: "DISCOVERED" | "ACTOR_ONLY";
  actorIds?: readonly string[];
  learnedAtRevision?: WorldRevision;
}

export interface CampaignWorldState {
  revision: WorldRevision;
  campaign: CampaignWorldMetadata;
  activeScene: WorldSceneState;
  actors: readonly WorldActorState[];
  entities: readonly WorldEntityState[];
  relationships: readonly WorldRelationshipState[];
  facts: readonly WorldFactState[];
  knowledgeGrants: readonly KnowledgeGrantState[];
}

export interface WorldStateStorePort {
  loadCampaignWorld(campaignId: string): Promise<CampaignWorldState>;
  saveCampaignWorld(input: {
    expectedRevision: WorldRevision;
    state: CampaignWorldState;
  }): Promise<void>;
}

export type WorldStateMutation =
  | { type: "SET_SCENE"; scene: WorldSceneState }
  | { type: "UPSERT_ACTOR"; actor: WorldActorState }
  | { type: "SET_ACTOR_PRESENCE"; actorId: string; present: boolean }
  | { type: "UPSERT_ENTITY"; entity: WorldEntityState }
  | { type: "UPSERT_RELATIONSHIP"; relationship: WorldRelationshipState }
  | { type: "RECORD_FACT"; fact: WorldFactState }
  | { type: "GRANT_KNOWLEDGE"; grant: KnowledgeGrantState }
  | { type: "REVOKE_KNOWLEDGE"; grantId: string }
  | { type: "ADD_RECENT_EVENT"; event: string };
