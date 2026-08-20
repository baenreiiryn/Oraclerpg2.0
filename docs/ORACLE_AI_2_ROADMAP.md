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

Implemented components include lexical/semantic/entity/reference/importance/recency/confidence ranking, hard token/item budgets, Memory and World State retrieval adapters, external index ports, visibility filtering before ranking, and deterministic deduplication.

## AI-8 — Oracle AI Gateway

**Status: COMPLETE**

Implemented a provider-neutral gateway boundary with stable Oracle aliases, server-side routing, capability filtering, retry/fallback, platform/BYOK auth policy, secret isolation, quota checks, and usage/cost accounting. Provider/model identity stays out of product-facing responses.

## AI-9 — Complete GM Runtime

**Status: COMPLETE**

Implemented `OracleGmRuntime` as the end-to-end application pipeline over the already-validated AI-1…AI-8 primitives.

Turn pipeline:

```text
intent
→ authoritative state
→ perspective-safe context
→ hybrid retrieval + context budget
→ per-turn capability manifest
→ Oracle AI Gateway structured proposal
→ capability gate
→ mechanical validator
→ authoritative executor
→ Oracle AI Gateway final narration
→ turn persistence
→ memory extraction/write
→ Session State turn registration
```

Implemented components:

- `OracleGmRuntime` composition layer without replacing the smaller AI-1 `TurnOrchestrator` primitive;
- structured proposal generation through `oracle-reasoning` / `gm.interpret-turn`;
- final narration through `oracle-story` / `gm.narrate` after authoritative action resolution;
- `AiProposalDecoderPort` boundary for structured-output validation/parsing;
- `GmRetrievalPort` for AI-7 retrieval injection;
- `GmMemoryExtractionPort` and `GmMemoryWriterPort` for AI-6 derived-memory persistence;
- `GmSessionWriterPort` for session turn registration;
- final `TurnRecord` persistence with resolved actions and final narration.

Validated guarantees:

- state and context identity/revision are checked before any Gateway generation;
- an action outside the capability manifest never reaches the mechanical validator or executor;
- validator rejection prevents executor invocation;
- final narration happens only after action resolution;
- the persisted turn contains the final narrative and resolved actions;
- memory extraction happens after the turn has been finalized and persisted;
- Session State is updated only when a session is present;
- AI-1…AI-8 tests and class/compendium regression remain green.

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
    gm-runtime/
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
