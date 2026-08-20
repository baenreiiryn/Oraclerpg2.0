import type { CampaignMemoryState, MemoryStateStorePort } from "../memory/types.js";
import type { CampaignWorldState, WorldStateStorePort } from "../state/types.js";
import type { RetrievalCandidate, RetrievalQuery, RetrievalSourcePort } from "./types.js";

export class MemoryRetrievalSource implements RetrievalSourcePort {
  constructor(private readonly store: MemoryStateStorePort) {}

  async retrieve(query: RetrievalQuery): Promise<readonly RetrievalCandidate[]> {
    const memory = await this.store.loadCampaignMemory(query.campaignId);
    return projectMemory(memory);
  }
}

export class WorldStateRetrievalSource implements RetrievalSourcePort {
  constructor(private readonly store: WorldStateStorePort) {}

  async retrieve(query: RetrievalQuery): Promise<readonly RetrievalCandidate[]> {
    const world = await this.store.loadCampaignWorld(query.campaignId);
    return projectWorld(world);
  }
}

export interface ExternalRetrievalIndexPort {
  search(input: {
    campaignId: string;
    actorId: string;
    text: string;
    entityIds?: readonly string[];
    referenceIds?: readonly string[];
  }): Promise<readonly RetrievalCandidate[]>;
}

export class ExternalRetrievalSource implements RetrievalSourcePort {
  constructor(private readonly index: ExternalRetrievalIndexPort) {}

  retrieve(query: RetrievalQuery): Promise<readonly RetrievalCandidate[]> {
    return this.index.search({
      campaignId: query.campaignId,
      actorId: query.actorId,
      text: query.text,
      ...(query.entityIds ? { entityIds: query.entityIds } : {}),
      ...(query.referenceIds ? { referenceIds: query.referenceIds } : {}),
    });
  }
}

function projectMemory(memory: CampaignMemoryState): RetrievalCandidate[] {
  return memory.records
    .filter((record) => record.status !== "SUPERSEDED")
    .map((record): RetrievalCandidate => ({
      retrievalId: `memory:${record.memoryId}`,
      source: record.kind === "SUMMARY" ? "SESSION_SUMMARY" : "MEMORY",
      text: record.detail ? `${record.summary}\n${record.detail}` : record.summary,
      visibility: record.visibility,
      ...(record.actorIds ? { actorIds: record.actorIds } : {}),
      ...(record.entityIds ? { entityIds: record.entityIds } : {}),
      referenceIds: [record.memoryId, ...(record.semanticKey ? [record.semanticKey] : [])],
      importance: record.importance,
      recency: recencyFromRevision(record.updatedAtMemoryRevision, memory.revision),
      ...(record.confidence !== undefined ? { confidence: record.confidence } : {}),
      metadata: { kind: record.kind },
    }));
}

function projectWorld(world: CampaignWorldState): RetrievalCandidate[] {
  const candidates: RetrievalCandidate[] = [];
  for (const entity of world.entities) {
    candidates.push({
      retrievalId: `entity:${entity.entityId}`,
      source: "ENTITY",
      text: entity.summary ? `${entity.name}\n${entity.summary}` : entity.name,
      visibility: "PUBLIC",
      entityIds: [entity.entityId],
      referenceIds: [entity.entityId],
      importance: world.activeScene.participantIds.includes(entity.entityId) ? 0.9 : 0.5,
      recency: 1,
      metadata: { kind: entity.kind },
    });
  }

  for (const fact of world.facts.filter((entry) => entry.active)) {
    const grants = world.knowledgeGrants.filter((grant) => grant.factId === fact.factId);
    const discovered = grants.some((grant) => grant.mode === "DISCOVERED");
    const actorIds = [...new Set(grants.flatMap((grant) => grant.mode === "ACTOR_ONLY" ? [...(grant.actorIds ?? [])] : []))];
    const visibility = fact.secrecy === "PUBLIC"
      ? "PUBLIC" as const
      : discovered
        ? "PUBLIC" as const
        : actorIds.length > 0
          ? "ACTOR_ONLY" as const
          : fact.secrecy;

    candidates.push({
      retrievalId: `fact:${fact.factId}`,
      source: "WORLD_FACT",
      text: fact.statement,
      visibility,
      ...(actorIds.length > 0 ? { actorIds } : {}),
      ...(fact.entityIds ? { entityIds: fact.entityIds } : {}),
      referenceIds: [fact.factId],
      importance: 0.8,
      recency: 1,
      ...(fact.confidence !== undefined ? { confidence: fact.confidence } : {}),
    });
  }
  return candidates;
}

function recencyFromRevision(updated: number, current: number): number {
  const distance = Math.max(0, current - updated);
  return 1 / (1 + distance);
}
