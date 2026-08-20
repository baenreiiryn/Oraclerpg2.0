import type {
  ContextBuilderPort,
  MechanicalStateSnapshot,
  OracleContextPackage,
  TurnIntent,
} from "../contracts.js";
import type {
  ActorContextEntry,
  ContextSourcePort,
  EntityContextEntry,
  KnowledgeFact,
  OracleContextSections,
  RelationshipContextEntry,
} from "./types.js";

export interface OracleContextEngineOptions {
  includeNonPresentActors?: boolean;
  includeUnrelatedEntities?: boolean;
}

export class OracleContextEngine implements ContextBuilderPort {
  constructor(
    private readonly source: ContextSourcePort,
    private readonly options: OracleContextEngineOptions = {},
  ) {}

  async buildContext(input: {
    intent: TurnIntent;
    state: MechanicalStateSnapshot;
  }): Promise<OracleContextPackage> {
    const source = await this.source.loadContextSource(input);
    this.assertSourceAligned(input.intent, input.state, source.campaign.campaignId, source.mechanics.actorId);

    const actors = this.projectActors(source.actors, input.intent.actorId);
    const visibleEntityIds = new Set<string>();
    for (const actor of actors) {
      if (actor.entityId) visibleEntityIds.add(actor.entityId);
      visibleEntityIds.add(actor.actorId);
    }
    if (source.scene.locationId) visibleEntityIds.add(source.scene.locationId);
    for (const id of source.scene.participantIds) visibleEntityIds.add(id);
    for (const id of source.scene.threatIds) visibleEntityIds.add(id);

    const knowledge = source.knowledge.filter((fact) => this.canActorKnow(fact, input.intent.actorId));
    for (const fact of knowledge) {
      for (const id of fact.entityIds ?? []) visibleEntityIds.add(id);
    }

    const relationships = source.relationships.filter((relationship) =>
      this.canActorSeeRelationship(relationship, input.intent.actorId, visibleEntityIds),
    );
    for (const relationship of relationships) {
      visibleEntityIds.add(relationship.fromEntityId);
      visibleEntityIds.add(relationship.toEntityId);
    }

    const entities = this.projectEntities(source.entities, visibleEntityIds);

    const sections: OracleContextSections = {
      campaign: source.campaign,
      scene: source.scene,
      actors,
      entities,
      relationships,
      knowledge: { facts: knowledge },
      mechanics: source.mechanics,
    };

    return {
      version: 2,
      campaignId: input.state.campaignId,
      actorId: input.state.actorId,
      stateRevision: input.state.revision,
      sections,
    };
  }

  private projectActors(
    actors: readonly ActorContextEntry[],
    currentActorId: string,
  ): readonly ActorContextEntry[] {
    if (this.options.includeNonPresentActors) return actors;
    return actors.filter((actor) => actor.present || actor.actorId === currentActorId);
  }

  private projectEntities(
    entities: readonly EntityContextEntry[],
    visibleEntityIds: ReadonlySet<string>,
  ): readonly EntityContextEntry[] {
    if (this.options.includeUnrelatedEntities) return entities;
    return entities.filter((entity) => visibleEntityIds.has(entity.entityId));
  }

  private canActorKnow(fact: KnowledgeFact, actorId: string): boolean {
    switch (fact.visibility) {
      case "PUBLIC":
      case "DISCOVERED":
        return true;
      case "ACTOR_ONLY":
        return Boolean(fact.actorIds?.includes(actorId));
      case "GM_ONLY":
      case "HIDDEN":
        return false;
    }
  }

  private canActorSeeRelationship(
    relationship: RelationshipContextEntry,
    actorId: string,
    visibleEntityIds: ReadonlySet<string>,
  ): boolean {
    if (!visibleEntityIds.has(relationship.fromEntityId) && !visibleEntityIds.has(relationship.toEntityId)) {
      return false;
    }
    switch (relationship.visibility ?? "PUBLIC") {
      case "PUBLIC":
      case "DISCOVERED":
        return true;
      case "ACTOR_ONLY":
        return Boolean(relationship.actorIds?.includes(actorId));
      case "GM_ONLY":
      case "HIDDEN":
        return false;
    }
  }

  private assertSourceAligned(
    intent: TurnIntent,
    state: MechanicalStateSnapshot,
    campaignId: string,
    mechanicalActorId: string,
  ): void {
    if (campaignId !== state.campaignId || campaignId !== intent.campaignId) {
      throw new Error("Context source campaign does not match authoritative state");
    }
    if (mechanicalActorId !== state.actorId || mechanicalActorId !== intent.actorId) {
      throw new Error("Context source actor does not match authoritative state");
    }
  }
}
