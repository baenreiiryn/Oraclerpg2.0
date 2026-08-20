import type {
  OracleSessionState,
  SessionMutation,
  SessionStateStorePort,
} from "./types.js";

export class SessionStateConflictError extends Error {}

export class OracleSessionStateService {
  constructor(private readonly store: SessionStateStorePort) {}

  async apply(input: {
    campaignId: string;
    sessionId: string;
    expectedRevision: number;
    mutations: readonly SessionMutation[];
  }): Promise<OracleSessionState> {
    const current = await this.store.loadSession(input.campaignId, input.sessionId);
    if (current.campaignId !== input.campaignId || current.sessionId !== input.sessionId) {
      throw new Error("session store returned another session");
    }
    if (current.revision !== input.expectedRevision) {
      throw new SessionStateConflictError(
        `session revision conflict: expected ${input.expectedRevision}, got ${current.revision}`,
      );
    }

    let next: OracleSessionState = { ...current };
    for (const mutation of input.mutations) {
      switch (mutation.type) {
        case "RECORD_TURN":
          if (next.status !== "ACTIVE") throw new Error("cannot record a turn on a closed session");
          next = { ...next, turnCount: next.turnCount + 1, lastTurnId: mutation.turnId };
          break;
        case "OPEN_THREAD":
          if (!next.openThreadMemoryIds.includes(mutation.memoryId)) {
            next = { ...next, openThreadMemoryIds: [...next.openThreadMemoryIds, mutation.memoryId] };
          }
          break;
        case "CLOSE_THREAD":
          next = {
            ...next,
            openThreadMemoryIds: next.openThreadMemoryIds.filter((id) => id !== mutation.memoryId),
          };
          break;
        case "ADD_SUMMARY":
          if (next.summaryBlocks.some((block) => block.summaryId === mutation.block.summaryId)) {
            throw new Error(`duplicate session summary ${mutation.block.summaryId}`);
          }
          next = { ...next, summaryBlocks: [...next.summaryBlocks, mutation.block] };
          break;
        case "CLOSE_SESSION":
          next = {
            ...next,
            status: "CLOSED",
            ...(mutation.endedAt !== undefined ? { endedAt: mutation.endedAt } : {}),
          };
          break;
      }
    }

    next = { ...next, revision: current.revision + 1 };
    await this.store.saveSession({ expectedRevision: current.revision, state: next });
    return next;
  }
}
