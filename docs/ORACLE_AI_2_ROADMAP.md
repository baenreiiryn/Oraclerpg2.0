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

Implemented provider-agnostic contracts for turn intent, authoritative state snapshots, context packages, AI proposals, validation, execution, persistence, and orchestration.

## AI-2 — Context Engine 2.0

**Status: COMPLETE**

Implemented a provider- and prompt-independent Context Engine with typed campaign, scene, actor, entity, relationship, knowledge, and mechanical sections, including perspective-aware isolation.

## AI-3 — Structured AI Actions

**Status: COMPLETE**

Implemented versioned discriminated action contracts and per-turn capability manifests. Mechanical validation remains a separate gate after capability validation.

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

Implemented components:

- `CampaignMemoryState` with an independent optimistic memory revision;
- `OracleMemoryRecord` kinds for episodic, semantic, relationship, discovery, promise, thread, and summary memory;
- `MemoryCandidate` ingestion contract for future extraction pipelines;
- `OracleMemoryService` with append, semantic upsert/consolidation, resolve, supersede, and prune operations;
- semantic consolidation by stable `semanticKey` while episodic memory remains append-oriented;
- `PUBLIC`, `ACTOR_ONLY`, and `GM_ONLY` memory visibility with actor-specific projection;
- source references linking derived memory back to turns, scenes, world facts, relationships, and entities;
- `OracleSessionState` with its own optimistic revision;
- `OracleSessionStateService` tracking turns, open threads, compact summary blocks, and session closure.

Validated guarantees:

- Memory uses a revision separate from `CampaignWorldState` and cannot overwrite authoritative world truth;
- writing or consolidating memory has no mutation path into World State;
- actor-only memories do not leak to other actors;
- GM-only memories never appear in normal player projection;
- repeated semantic observations consolidate by `semanticKey` rather than creating conflicting duplicates;
- episodic memories remain independently addressable;
- stale memory/session revisions cannot overwrite newer state;
- closed sessions reject new turn recording;
- AI-1…AI-5 tests and class/compendium regression remain green.

## AI-7 — Retrieval / Hybrid RAG + Context Budget

**Status: PENDING**

Retrieve documents, compendium records, memories, entities, and world facts using lexical, semantic, entity, recency, importance, and visibility signals within an explicit token budget.

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
- verify memory/knowledge isolation and action authority;
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

The physical folders may evolve, but dependency direction must remain:

```text
Applications → Runtime → AI contracts / Core / Content / Schema
                         ↓
                    AI Gateway
                         ↓
                     Providers
```

Providers must never become dependencies of Core, Content, or Schema.
