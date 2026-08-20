# OracleRPG 2.0 — AI Architecture Roadmap

This is the canonical roadmap for the OracleRPG 2.0 AI/runtime architecture.

## Core rule

> AI interprets, proposes, and narrates. Only OracleRPG validates and changes authoritative game state.

The AI must never receive a direct state-mutation capability. Mechanical truth belongs to the Oracle Runtime and Game Engine.

## Deployment cadence

- AI-1 through AI-5 are developed and validated on `work/*` branches with Vercel deployment disabled.
- After AI-5 passes the cumulative release gate, merge to `main` and perform the first AI architecture deployment.
- AI-6 through AI-10 continue without deployment.
- After AI-10 passes the second cumulative release gate, merge and perform the second AI architecture deployment.

## AI-1 — Contracts & Turn Orchestrator

**Status: COMPLETE**

Implemented provider-agnostic contracts and Runtime-owned turn orchestration. AI proposes; Runtime validates and executes.

## AI-2 — Context Engine 2.0

**Status: COMPLETE**

Implemented typed perspective-aware context projection for campaign, scene, actors, entities, relationships, knowledge, and mechanics.

## AI-3 — Structured AI Actions

**Status: COMPLETE**

Implemented versioned structured action contracts and per-turn capability manifests before mechanical validation.

## AI-4 — Rules / Compendium Bridge

**Status: COMPLETE**

Implemented deterministic canonical-ID and Activity resolution against OracleRPG Core/Schema and real SRD 5.2 compendium records. Unsupported/manual mechanics return `MANUAL` instead of being guessed by AI.

## AI-5 — Scene + Entity + Knowledge State

**Status: COMPLETE**

Implemented Runtime-owned revisioned world state for scenes, actors, entities, relationships, objective facts, and perspective-specific knowledge grants.

### Release checkpoint A

**Status: PASSED + DEPLOYED**

AI-1…AI-5 passed full typecheck, workspace tests, authority/dependency audit, compendium integration, world-state isolation/revision tests, and 12-class regression before merge to `main`. Production Vercel deployment succeeded on merge commit `ad1482e9b7ad52a1e4153267753d6d0af0ac26f7`.

## AI-6 — Memory 2.0 + Session State

**Status: COMPLETE**

Implemented Runtime-owned derived memory and session state without granting memory any authority over mechanical or world truth.

Validated guarantees include independent memory/session revisions, episodic append, semantic consolidation by stable key, actor/GM visibility isolation, provenance, open-thread tracking, compact summaries, and closed-session protection.

## AI-7 — Retrieval / Hybrid RAG + Context Budget

**Status: COMPLETE**

Implemented provider-agnostic hybrid retrieval and hard context budgeting in the Runtime.

Implemented components:

- `HybridRetrievalEngine` combining lexical, optional semantic, entity, reference, importance, recency, and confidence signals;
- `RetrievalQuery`, `RetrievalCandidate`, ranked result, score-breakdown, and source-port contracts;
- hard `maxTokens` and optional `maxItems` selection budget with deterministic token estimation fallback;
- source filtering across `MEMORY`, `WORLD_FACT`, `ENTITY`, `COMPENDIUM`, `DOCUMENT`, and `SESSION_SUMMARY`;
- `MemoryRetrievalSource` over AI-6 Memory State;
- `WorldStateRetrievalSource` over AI-5 entities, facts, and knowledge grants;
- `ExternalRetrievalSource` boundary for future document/compendium indexes, lexical search, embeddings, or vector stores without provider dependencies in Runtime;
- stable deduplication by retrieval ID and deterministic ranking ties.

Validated guarantees:

- `GM_ONLY` and `HIDDEN` candidates are removed before ranking and budgeting;
- `ACTOR_ONLY` memories and world facts are retrievable only for the granted actor;
- the final selected context never exceeds the configured token budget;
- invalid negative/non-integer budgets are rejected;
- high-ranked oversized candidates are skipped rather than forcing budget overflow;
- semantic scores may be supplied by future embedding adapters but no embedding/model provider is required by the retrieval engine;
- entity/reference relevance combines with lexical/semantic relevance rather than replacing it;
- source allowlists can constrain retrieval to a specific context class;
- duplicate retrieval IDs from multiple indexes are included only once;
- AI-1…AI-6 architecture remains provider-agnostic and Runtime-authoritative.

## AI-8 — Oracle AI Gateway

**Status: PENDING**

Introduce stable Oracle model aliases, provider routing, authentication, retries/fallbacks, BYOK as an advanced option, usage tracking, quotas, and secret isolation.

## AI-9 — Complete GM Runtime

**Status: PENDING**

Run a complete server-authoritative RPG turn end-to-end: intent → state → context → AI proposal → rules resolution → state mutation → narration → memory extraction → persistence.

## AI-10 — Model Router & Specialized AI Operations

**Status: PENDING**

Route narration, NPC dialogue, summarization, extraction, vision, reranking, and lightweight tasks to appropriate model aliases. Keep provider/model identity outside product-facing contracts.

### Release checkpoint B

After AI-6…AI-10:

- run full end-to-end runtime tests;
- regression-test compendium and game-engine boundaries;
- verify memory/knowledge/retrieval isolation and action authority;
- merge to `main` only if green;
- deploy to Vercel.

## Package direction

```text
packages/
  schema/
  content/
  core/
  ai/
    contracts/
    context/
    actions/
    gateway/
  runtime/
    turn-orchestrator/
    rules-resolver/
    state/
    memory/
    retrieval/
```

Dependency direction remains:

```text
Applications → Runtime → AI contracts / Core / Content / Schema
                         ↓
                    AI Gateway
                         ↓
                     Providers
```

Providers must never become dependencies of Core, Content, Schema, Memory, or Retrieval.
