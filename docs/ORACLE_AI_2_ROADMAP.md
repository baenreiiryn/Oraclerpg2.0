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

## AI-7 — Retrieval / Hybrid RAG + Context Budget

**Status: COMPLETE**

Implemented provider-agnostic hybrid retrieval and hard context budgeting across memory, world facts, entities and external indexes, with visibility filtering before ranking.

## AI-8 — Oracle AI Gateway

**Status: COMPLETE**

Implemented stable Oracle aliases, provider routing, capability filtering, retry/fallback, platform/BYOK auth policy, server-side secret resolution, quotas and usage/cost accounting without exposing provider/model identity to product contracts.

## AI-9 — Complete GM Runtime

**Status: COMPLETE**

Implemented `OracleGmRuntime` as the end-to-end authoritative turn pipeline: intent → state → context → retrieval → capability manifest → structured AI proposal → validation/execution → final narration → persistence → memory extraction/write → session registration.

Validated guarantees include capability-before-validator-before-executor ordering, context alignment before AI invocation, final narration after mechanical resolution, memory after persistence, and no direct model mutation path.

## AI-10 — Model Router & Specialized AI Operations

**Status: COMPLETE**

Implemented a semantic operation router above the Oracle AI Gateway. Runtime code requests operations, not aliases or model/provider identities.

Specialized operations include GM interpretation, narration, NPC dialogue, memory extraction/consolidation, session summarization, retrieval reranking, document/entity extraction, vision inspection, embeddings, and lightweight text tasks.

Default routing policy maps these operations only to stable Oracle aliases (`oracle-reasoning`, `oracle-story`, `oracle-background`, `oracle-fast`, `oracle-vision`, `oracle-embedding`). Callers may tune budget/temperature but cannot select provider/model through the operation contract.

Validated guarantees include fail-closed missing policies, specialized capability requirements, provider/model absence from operation responses, and GM Runtime integration through semantic operations instead of direct alias selection.

### Release checkpoint B

**Status: READY FOR FINAL GATE**

Before merge/deploy:

- run full typecheck and all AI/runtime tests across AI-1…AI-10;
- run static authority/dependency audit across all ten phases;
- regression-test compendium/game-engine boundaries;
- verify memory/knowledge/retrieval isolation, token budget, Gateway secret isolation, action authority, and end-to-end GM turn ordering;
- merge to `main` only if all checks are green;
- deploy to Vercel and verify the production deployment corresponds exactly to the merge commit.

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
    router/
  runtime/
    turn-orchestrator/
    rules-resolver/
    state/
    memory/
    retrieval/
    gm-runtime/
```

Dependency direction remains:

```text
Applications → Runtime → AI contracts / Core / Content / Schema
                         ↓
                AI Operation Router
                         ↓
                    AI Gateway
                         ↓
                     Providers
```

Providers must never become dependencies of Core, Content, Schema, Memory, Retrieval, or product-facing Runtime contracts.
