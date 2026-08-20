import type {
  RankedRetrievalItem,
  RetrievalCandidate,
  RetrievalQuery,
  RetrievalResult,
  RetrievalSourcePort,
  RetrievalWeights,
} from "./types.js";

const DEFAULT_WEIGHTS: RetrievalWeights = {
  lexical: 0.18,
  semantic: 0.28,
  entity: 0.16,
  reference: 0.12,
  importance: 0.12,
  recency: 0.08,
  confidence: 0.06,
};

export class HybridRetrievalEngine {
  constructor(
    private readonly sources: readonly RetrievalSourcePort[],
    private readonly weights: RetrievalWeights = DEFAULT_WEIGHTS,
  ) {}

  async retrieve(query: RetrievalQuery): Promise<RetrievalResult> {
    if (!Number.isFinite(query.maxTokens) || query.maxTokens < 0) {
      throw new Error("retrieval maxTokens must be a non-negative finite number");
    }

    const batches = await Promise.all(this.sources.map((source) => source.retrieve(query)));
    const allowedSources = query.allowedSources ? new Set(query.allowedSources) : undefined;
    const seen = new Set<string>();
    const visible: RetrievalCandidate[] = [];
    let droppedForVisibility = 0;

    for (const candidate of batches.flat()) {
      if (seen.has(candidate.retrievalId)) continue;
      seen.add(candidate.retrievalId);
      if (allowedSources && !allowedSources.has(candidate.source)) continue;
      if (!this.isVisible(candidate, query.actorId)) {
        droppedForVisibility += 1;
        continue;
      }
      visible.push(candidate);
    }

    const ranked = visible
      .map((candidate) => this.rank(candidate, query))
      .sort((a, b) => b.score - a.score || a.estimatedTokens - b.estimatedTokens || a.retrievalId.localeCompare(b.retrievalId));

    const items: RankedRetrievalItem[] = [];
    let usedTokens = 0;
    let droppedForBudget = 0;
    const maxItems = query.maxItems ?? Number.POSITIVE_INFINITY;

    for (const item of ranked) {
      if (items.length >= maxItems) {
        droppedForBudget += 1;
        continue;
      }
      if (usedTokens + item.estimatedTokens > query.maxTokens) {
        droppedForBudget += 1;
        continue;
      }
      items.push(item);
      usedTokens += item.estimatedTokens;
    }

    return {
      query,
      items,
      usedTokens,
      remainingTokens: Math.max(0, query.maxTokens - usedTokens),
      droppedForBudget,
      droppedForVisibility,
    };
  }

  private isVisible(candidate: RetrievalCandidate, actorId: string): boolean {
    switch (candidate.visibility) {
      case "PUBLIC":
        return true;
      case "ACTOR_ONLY":
        return Boolean(candidate.actorIds?.includes(actorId));
      case "GM_ONLY":
      case "HIDDEN":
        return false;
    }
  }

  private rank(candidate: RetrievalCandidate, query: RetrievalQuery): RankedRetrievalItem {
    const queryEntityIds = new Set(query.entityIds ?? []);
    const queryReferenceIds = new Set(query.referenceIds ?? []);
    const entityScore = this.overlap(candidate.entityIds, queryEntityIds);
    const referenceScore = this.overlap(candidate.referenceIds, queryReferenceIds);
    const lexicalScore = candidate.lexicalScore ?? this.lexicalOverlap(query.text, candidate.text);
    const semanticScore = candidate.semanticScore ?? 0;
    const importance = candidate.importance ?? 0.5;
    const recency = candidate.recency ?? 0.5;
    const confidence = candidate.confidence ?? 0.5;
    const estimatedTokens = candidate.estimatedTokens ?? estimateTokens(candidate.text);
    const scoreBreakdown = {
      lexical: clamp01(lexicalScore),
      semantic: clamp01(semanticScore),
      entity: entityScore,
      reference: referenceScore,
      importance: clamp01(importance),
      recency: clamp01(recency),
      confidence: clamp01(confidence),
    };
    const score =
      scoreBreakdown.lexical * this.weights.lexical +
      scoreBreakdown.semantic * this.weights.semantic +
      scoreBreakdown.entity * this.weights.entity +
      scoreBreakdown.reference * this.weights.reference +
      scoreBreakdown.importance * this.weights.importance +
      scoreBreakdown.recency * this.weights.recency +
      scoreBreakdown.confidence * this.weights.confidence;

    return { ...candidate, estimatedTokens, score, scoreBreakdown };
  }

  private overlap(values: readonly string[] | undefined, expected: Set<string>): number {
    if (!values?.length || expected.size === 0) return 0;
    let matches = 0;
    for (const value of values) if (expected.has(value)) matches += 1;
    return matches / Math.max(values.length, expected.size);
  }

  private lexicalOverlap(query: string, text: string): number {
    const queryTerms = tokenize(query);
    if (queryTerms.size === 0) return 0;
    const textTerms = tokenize(text);
    let matches = 0;
    for (const term of queryTerms) if (textTerms.has(term)) matches += 1;
    return matches / queryTerms.size;
  }
}

export function estimateTokens(text: string): number {
  if (!text.trim()) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

function tokenize(text: string): Set<string> {
  return new Set(text.toLocaleLowerCase().match(/[\p{L}\p{N}_-]+/gu) ?? []);
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}
