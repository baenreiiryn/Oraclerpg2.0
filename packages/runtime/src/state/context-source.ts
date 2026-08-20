import type {
  ContextSourcePort,
  KnowledgeFact,
  MechanicalContextSection,
  MechanicalStateSnapshot,
  OracleContextSource,
  TurnIntent,
} from "@oraclerpg/ai";
import type { CampaignWorldState, WorldStateStorePort } from "./types.js";

export interface MechanicalContextProjectorPort {
  projectMechanicalContext(input: {
    intent: TurnIntent;
    state: MechanicalStateSnapshot;
  }): Promise<MechanicalContextSection>;
}

/**
 * Converts persistent world truth into the neutral source consumed by AI-2.
 * Visibility filtering still belongs to OracleContextEngine; this adapter only
 * materializes truth + knowledge grants into perspective-aware fact records.
 */
export class WorldStateContextSource implements ContextSourcePort {
  constructor(
    private readonly store: WorldStateStorePort,
    private readonly mechanics: MechanicalContextProjectorPort,
  ) {}

  async loadContextSource(input: {
    intent: TurnIntent;
    state: MechanicalStateSnapshot;
  }): Promise<OracleContextSource> {
    const world = await this.store.loadCampaignWorld(input.intent.campaignId);
    if (world.campaign.campaignId !== input.intent.campaignId) {
      throw new Error("World state campaign does not match turn intent");
    }

    return {
      campaign: world.campaign,
      scene: world.activeScene,
      actors: world.actors,
      entities: world.entities,
      relationships: world.relationships,
      knowledge: this.materializeKnowledge(world),
      mechanics: await this.mechanics.projectMechanicalContext(input),
    };
  }

  private materializeKnowledge(world: CampaignWorldState): readonly KnowledgeFact[] {
    return world.facts
      .filter((fact) => fact.active)
      .map((fact): KnowledgeFact => {
        if (fact.secrecy === "PUBLIC") {
          return {
            factId: fact.factId,
            statement: fact.statement,
            visibility: "PUBLIC",
            ...(fact.entityIds ? { entityIds: fact.entityIds } : {}),
            ...(fact.confidence !== undefined ? { confidence: fact.confidence } : {}),
          };
        }

        const grants = world.knowledgeGrants.filter((grant) => grant.factId === fact.factId);
        if (grants.some((grant) => grant.mode === "DISCOVERED")) {
          return {
            factId: fact.factId,
            statement: fact.statement,
            visibility: "DISCOVERED",
            ...(fact.entityIds ? { entityIds: fact.entityIds } : {}),
            ...(fact.confidence !== undefined ? { confidence: fact.confidence } : {}),
          };
        }

        const actorIds = [...new Set(
          grants.flatMap((grant) => (grant.mode === "ACTOR_ONLY" ? [...(grant.actorIds ?? [])] : [])),
        )];
        if (actorIds.length > 0) {
          return {
            factId: fact.factId,
            statement: fact.statement,
            visibility: "ACTOR_ONLY",
            actorIds,
            ...(fact.entityIds ? { entityIds: fact.entityIds } : {}),
            ...(fact.confidence !== undefined ? { confidence: fact.confidence } : {}),
          };
        }

        return {
          factId: fact.factId,
          statement: fact.statement,
          visibility: fact.secrecy,
          ...(fact.entityIds ? { entityIds: fact.entityIds } : {}),
          ...(fact.confidence !== undefined ? { confidence: fact.confidence } : {}),
        };
      });
  }
}
