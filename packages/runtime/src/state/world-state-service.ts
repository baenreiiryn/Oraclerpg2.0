import type {
  CampaignWorldState,
  KnowledgeGrantState,
  WorldActorState,
  WorldEntityState,
  WorldFactState,
  WorldRelationshipState,
  WorldStateMutation,
  WorldStateStorePort,
} from "./types.js";

export class WorldStateConflictError extends Error {}

/**
 * Runtime-owned mutation service. AI proposals never receive this service.
 * Every accepted mutation is applied against an expected revision and persists
 * as a new authoritative world revision.
 */
export class WorldStateService {
  constructor(private readonly store: WorldStateStorePort) {}

  async load(campaignId: string): Promise<CampaignWorldState> {
    return this.store.loadCampaignWorld(campaignId);
  }

  async apply(input: {
    campaignId: string;
    expectedRevision: number;
    mutations: readonly WorldStateMutation[];
  }): Promise<CampaignWorldState> {
    const current = await this.store.loadCampaignWorld(input.campaignId);
    if (current.revision !== input.expectedRevision) {
      throw new WorldStateConflictError(
        `World revision conflict: expected ${input.expectedRevision}, found ${current.revision}`,
      );
    }

    let next = current;
    for (const mutation of input.mutations) next = this.applyOne(next, mutation);
    next = { ...next, revision: current.revision + 1 };
    this.assertWorldIntegrity(next);
    await this.store.saveCampaignWorld({ expectedRevision: current.revision, state: next });
    return next;
  }

  private applyOne(state: CampaignWorldState, mutation: WorldStateMutation): CampaignWorldState {
    switch (mutation.type) {
      case "SET_SCENE":
        return { ...state, activeScene: mutation.scene };
      case "UPSERT_ACTOR":
        return { ...state, actors: upsert(state.actors, mutation.actor, (entry) => entry.actorId) };
      case "SET_ACTOR_PRESENCE":
        return {
          ...state,
          actors: state.actors.map((actor) =>
            actor.actorId === mutation.actorId ? { ...actor, present: mutation.present } : actor,
          ),
        };
      case "UPSERT_ENTITY":
        return { ...state, entities: upsert(state.entities, mutation.entity, (entry) => entry.entityId) };
      case "UPSERT_RELATIONSHIP":
        return {
          ...state,
          relationships: upsert(state.relationships, mutation.relationship, (entry) => entry.relationshipId),
        };
      case "RECORD_FACT":
        return { ...state, facts: upsert(state.facts, mutation.fact, (entry) => entry.factId) };
      case "GRANT_KNOWLEDGE":
        return {
          ...state,
          knowledgeGrants: upsert(state.knowledgeGrants, mutation.grant, (entry) => entry.grantId),
        };
      case "REVOKE_KNOWLEDGE":
        return {
          ...state,
          knowledgeGrants: state.knowledgeGrants.filter((grant) => grant.grantId !== mutation.grantId),
        };
      case "ADD_RECENT_EVENT":
        return {
          ...state,
          activeScene: {
            ...state.activeScene,
            recentEvents: [...state.activeScene.recentEvents, mutation.event],
          },
        };
    }
  }

  private assertWorldIntegrity(state: CampaignWorldState): void {
    const entityIds = new Set(state.entities.map((entity) => entity.entityId));
    const actorIds = new Set(state.actors.map((actor) => actor.actorId));
    const factIds = new Set(state.facts.map((fact) => fact.factId));

    for (const actor of state.actors) {
      if (actor.entityId && !entityIds.has(actor.entityId)) {
        throw new Error(`Actor ${actor.actorId} references missing entity ${actor.entityId}`);
      }
    }
    for (const relationship of state.relationships) {
      if (!entityIds.has(relationship.fromEntityId) || !entityIds.has(relationship.toEntityId)) {
        throw new Error(`Relationship ${relationship.relationshipId} references missing entity`);
      }
      for (const actorId of relationship.actorIds ?? []) {
        if (!actorIds.has(actorId)) throw new Error(`Relationship references missing actor ${actorId}`);
      }
    }
    for (const fact of state.facts) {
      for (const entityId of fact.entityIds ?? []) {
        if (!entityIds.has(entityId)) throw new Error(`Fact ${fact.factId} references missing entity ${entityId}`);
      }
    }
    for (const grant of state.knowledgeGrants) {
      if (!factIds.has(grant.factId)) throw new Error(`Knowledge grant ${grant.grantId} references missing fact`);
      for (const actorId of grant.actorIds ?? []) {
        if (!actorIds.has(actorId)) throw new Error(`Knowledge grant references missing actor ${actorId}`);
      }
    }
  }
}

function upsert<T>(items: readonly T[], next: T, id: (value: T) => string): readonly T[] {
  const key = id(next);
  const index = items.findIndex((item) => id(item) === key);
  if (index < 0) return [...items, next];
  return items.map((item, currentIndex) => (currentIndex === index ? next : item));
}

export type {
  CampaignWorldState,
  KnowledgeGrantState,
  WorldActorState,
  WorldEntityState,
  WorldFactState,
  WorldRelationshipState,
  WorldStateMutation,
  WorldStateStorePort,
};
