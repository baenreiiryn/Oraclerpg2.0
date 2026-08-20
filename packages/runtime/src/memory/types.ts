export type MemoryRevision = number;
export type SessionRevision = number;

export type MemoryKind =
  | "EPISODIC"
  | "SEMANTIC"
  | "RELATIONSHIP"
  | "DISCOVERY"
  | "PROMISE"
  | "THREAD"
  | "SUMMARY";

export type MemoryVisibility = "PUBLIC" | "ACTOR_ONLY" | "GM_ONLY";

export interface MemorySourceRef {
  turnId?: string;
  sceneId?: string;
  worldFactId?: string;
  relationshipId?: string;
  entityIds?: readonly string[];
}

export interface OracleMemoryRecord {
  memoryId: string;
  campaignId: string;
  sessionId?: string;
  kind: MemoryKind;
  summary: string;
  detail?: string;
  semanticKey?: string;
  visibility: MemoryVisibility;
  actorIds?: readonly string[];
  entityIds?: readonly string[];
  importance: number;
  confidence?: number;
  status?: "ACTIVE" | "RESOLVED" | "SUPERSEDED";
  source: MemorySourceRef;
  createdAtWorldRevision?: number;
  createdAtMemoryRevision: MemoryRevision;
  updatedAtMemoryRevision: MemoryRevision;
}

export interface CampaignMemoryState {
  campaignId: string;
  revision: MemoryRevision;
  records: readonly OracleMemoryRecord[];
}

export interface MemoryStateStorePort {
  loadCampaignMemory(campaignId: string): Promise<CampaignMemoryState>;
  saveCampaignMemory(input: {
    expectedRevision: MemoryRevision;
    state: CampaignMemoryState;
  }): Promise<void>;
}

export type MemoryMutation =
  | { type: "APPEND"; record: Omit<OracleMemoryRecord, "createdAtMemoryRevision" | "updatedAtMemoryRevision"> }
  | {
      type: "UPSERT_SEMANTIC";
      record: Omit<OracleMemoryRecord, "kind" | "createdAtMemoryRevision" | "updatedAtMemoryRevision"> & {
        semanticKey: string;
      };
    }
  | { type: "RESOLVE"; memoryId: string; summary?: string }
  | { type: "SUPERSEDE"; memoryId: string; replacementMemoryId?: string }
  | { type: "PRUNE"; memoryIds: readonly string[] };

export interface SessionSummaryBlock {
  summaryId: string;
  text: string;
  entityIds?: readonly string[];
  memoryIds?: readonly string[];
}

export interface OracleSessionState {
  campaignId: string;
  sessionId: string;
  revision: SessionRevision;
  status: "ACTIVE" | "CLOSED";
  startedAt?: string;
  endedAt?: string;
  turnCount: number;
  lastTurnId?: string;
  openThreadMemoryIds: readonly string[];
  summaryBlocks: readonly SessionSummaryBlock[];
}

export interface SessionStateStorePort {
  loadSession(campaignId: string, sessionId: string): Promise<OracleSessionState>;
  saveSession(input: {
    expectedRevision: SessionRevision;
    state: OracleSessionState;
  }): Promise<void>;
}

export type SessionMutation =
  | { type: "RECORD_TURN"; turnId: string }
  | { type: "OPEN_THREAD"; memoryId: string }
  | { type: "CLOSE_THREAD"; memoryId: string }
  | { type: "ADD_SUMMARY"; block: SessionSummaryBlock }
  | { type: "CLOSE_SESSION"; endedAt?: string };

export interface MemoryCandidate {
  candidateId: string;
  kind: Exclude<MemoryKind, "SUMMARY">;
  summary: string;
  detail?: string;
  semanticKey?: string;
  visibility: MemoryVisibility;
  actorIds?: readonly string[];
  entityIds?: readonly string[];
  importance: number;
  confidence?: number;
  source: MemorySourceRef;
}
