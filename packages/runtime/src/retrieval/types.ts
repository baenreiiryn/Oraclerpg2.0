export type RetrievalSourceKind =
  | "MEMORY"
  | "WORLD_FACT"
  | "ENTITY"
  | "COMPENDIUM"
  | "DOCUMENT"
  | "SESSION_SUMMARY";

export type RetrievalVisibility = "PUBLIC" | "ACTOR_ONLY" | "GM_ONLY" | "HIDDEN";

export interface RetrievalQuery {
  campaignId: string;
  actorId: string;
  text: string;
  entityIds?: readonly string[];
  referenceIds?: readonly string[];
  maxTokens: number;
  maxItems?: number;
  allowedSources?: readonly RetrievalSourceKind[];
}

export interface RetrievalCandidate {
  retrievalId: string;
  source: RetrievalSourceKind;
  text: string;
  visibility: RetrievalVisibility;
  actorIds?: readonly string[];
  entityIds?: readonly string[];
  referenceIds?: readonly string[];
  lexicalScore?: number;
  semanticScore?: number;
  importance?: number;
  recency?: number;
  confidence?: number;
  estimatedTokens?: number;
  metadata?: Readonly<Record<string, string | number | boolean>>;
}

export interface RankedRetrievalItem extends RetrievalCandidate {
  score: number;
  estimatedTokens: number;
  scoreBreakdown: {
    lexical: number;
    semantic: number;
    entity: number;
    reference: number;
    importance: number;
    recency: number;
    confidence: number;
  };
}

export interface RetrievalResult {
  query: RetrievalQuery;
  items: readonly RankedRetrievalItem[];
  usedTokens: number;
  remainingTokens: number;
  droppedForBudget: number;
  droppedForVisibility: number;
}

export interface RetrievalSourcePort {
  retrieve(query: RetrievalQuery): Promise<readonly RetrievalCandidate[]>;
}

export interface RetrievalWeights {
  lexical: number;
  semantic: number;
  entity: number;
  reference: number;
  importance: number;
  recency: number;
  confidence: number;
}
