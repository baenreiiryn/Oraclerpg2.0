import type {
  CampaignMemoryState,
  MemoryCandidate,
  MemoryMutation,
  MemoryStateStorePort,
  OracleMemoryRecord,
} from "./types.js";

export class MemoryStateConflictError extends Error {}

export class OracleMemoryService {
  constructor(private readonly store: MemoryStateStorePort) {}

  async ingestCandidates(input: {
    campaignId: string;
    sessionId?: string;
    expectedRevision: number;
    worldRevision?: number;
    candidates: readonly MemoryCandidate[];
  }): Promise<CampaignMemoryState> {
    const mutations: MemoryMutation[] = input.candidates.map((candidate) => {
      const base = {
        memoryId: candidate.candidateId,
        campaignId: input.campaignId,
        sessionId: input.sessionId,
        summary: candidate.summary,
        detail: candidate.detail,
        semanticKey: candidate.semanticKey,
        visibility: candidate.visibility,
        actorIds: candidate.actorIds,
        entityIds: candidate.entityIds,
        importance: candidate.importance,
        confidence: candidate.confidence,
        status: "ACTIVE" as const,
        source: candidate.source,
        createdAtWorldRevision: input.worldRevision,
      };

      if (candidate.kind === "SEMANTIC" && candidate.semanticKey) {
        return { type: "UPSERT_SEMANTIC", record: base };
      }

      return { type: "APPEND", record: { ...base, kind: candidate.kind } };
    });

    return this.apply({
      campaignId: input.campaignId,
      expectedRevision: input.expectedRevision,
      mutations,
    });
  }

  async apply(input: {
    campaignId: string;
    expectedRevision: number;
    mutations: readonly MemoryMutation[];
  }): Promise<CampaignMemoryState> {
    const current = await this.store.loadCampaignMemory(input.campaignId);
    if (current.campaignId !== input.campaignId) throw new Error("memory store returned another campaign");
    if (current.revision !== input.expectedRevision) {
      throw new MemoryStateConflictError(
        `memory revision conflict: expected ${input.expectedRevision}, got ${current.revision}`,
      );
    }

    const nextRevision = current.revision + 1;
    let records = [...current.records];

    for (const mutation of input.mutations) {
      switch (mutation.type) {
        case "APPEND": {
          this.assertRecordInput(mutation.record, input.campaignId);
          if (records.some((record) => record.memoryId === mutation.record.memoryId)) {
            throw new Error(`duplicate memory id ${mutation.record.memoryId}`);
          }
          records.push({
            ...mutation.record,
            createdAtMemoryRevision: nextRevision,
            updatedAtMemoryRevision: nextRevision,
          });
          break;
        }
        case "UPSERT_SEMANTIC": {
          this.assertRecordInput(mutation.record, input.campaignId);
          const index = records.findIndex(
            (record) =>
              record.kind === "SEMANTIC" &&
              record.semanticKey === mutation.record.semanticKey &&
              record.status !== "SUPERSEDED",
          );
          if (index < 0) {
            records.push({
              ...mutation.record,
              kind: "SEMANTIC",
              createdAtMemoryRevision: nextRevision,
              updatedAtMemoryRevision: nextRevision,
            });
          } else {
            const existing = records[index]!;
            records[index] = {
              ...existing,
              ...mutation.record,
              memoryId: existing.memoryId,
              kind: "SEMANTIC",
              createdAtMemoryRevision: existing.createdAtMemoryRevision,
              updatedAtMemoryRevision: nextRevision,
            };
          }
          break;
        }
        case "RESOLVE": {
          const index = this.requireMemory(records, mutation.memoryId);
          records[index] = {
            ...records[index]!,
            status: "RESOLVED",
            summary: mutation.summary ?? records[index]!.summary,
            updatedAtMemoryRevision: nextRevision,
          };
          break;
        }
        case "SUPERSEDE": {
          const index = this.requireMemory(records, mutation.memoryId);
          if (mutation.replacementMemoryId) this.requireMemory(records, mutation.replacementMemoryId);
          records[index] = {
            ...records[index]!,
            status: "SUPERSEDED",
            detail: mutation.replacementMemoryId
              ? `${records[index]!.detail ?? ""}${records[index]!.detail ? "\n" : ""}Superseded by ${mutation.replacementMemoryId}`
              : records[index]!.detail,
            updatedAtMemoryRevision: nextRevision,
          };
          break;
        }
        case "PRUNE": {
          const pruneIds = new Set(mutation.memoryIds);
          records = records.filter((record) => !pruneIds.has(record.memoryId));
          break;
        }
      }
    }

    const next: CampaignMemoryState = {
      campaignId: current.campaignId,
      revision: nextRevision,
      records,
    };
    await this.store.saveCampaignMemory({ expectedRevision: current.revision, state: next });
    return next;
  }

  projectForActor(state: CampaignMemoryState, actorId: string): readonly OracleMemoryRecord[] {
    return state.records.filter((record) => {
      if (record.status === "SUPERSEDED") return false;
      switch (record.visibility) {
        case "PUBLIC":
          return true;
        case "ACTOR_ONLY":
          return Boolean(record.actorIds?.includes(actorId));
        case "GM_ONLY":
          return false;
      }
    });
  }

  private requireMemory(records: readonly OracleMemoryRecord[], memoryId: string): number {
    const index = records.findIndex((record) => record.memoryId === memoryId);
    if (index < 0) throw new Error(`unknown memory ${memoryId}`);
    return index;
  }

  private assertRecordInput(record: { campaignId: string; memoryId: string; importance: number }, campaignId: string) {
    if (record.campaignId !== campaignId) throw new Error("memory record campaign mismatch");
    if (!record.memoryId.trim()) throw new Error("memory id is required");
    if (record.importance < 0 || record.importance > 1) {
      throw new Error("memory importance must be between 0 and 1");
    }
  }
}
