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

**Status: IN PROGRESS**

Define provider-agnostic contracts for turn intent, authoritative state snapshots, context packages, AI proposals, validation, execution, persistence, and orchestration.

Acceptance criteria:

- AI package has no provider dependency.
- Runtime owns state loading and mutation.
- Every AI action proposal passes validation before execution.
- Rejected proposals cannot reach the executor.
- Context state revision must match the authoritative state revision.
- Turn persistence records both proposed and resolved actions.

## AI-2 — Context Engine 2.0

**Status: PENDING**

Build typed context sections for campaign, scene, actors, entities, knowledge, recent events, narrative context, and mechanical context. Context construction must be independent of prompts and model providers.

## AI-3 — Structured AI Actions

**Status: PENDING**

Replace generic action payloads with versioned, typed action contracts and capability manifests. The model can only propose actions explicitly exposed for the current turn.

## AI-4 — Rules / Compendium Bridge

**Status: PENDING**

Connect structured action requests to the OracleRPG schema/core/compendium. Resolve legal actions, features, spells, resources, targets, conditions, item use, rests, and other mechanical rules without asking the LLM to decide game truth.

## AI-5 — Scene + Entity + Knowledge State

**Status: PENDING**

Introduce explicit persistent scene state, entities, relationships, and perspective-aware knowledge. Separate world truth from what each PC/NPC knows.

### Release checkpoint A

After AI-1…AI-5:

- run cumulative AI/runtime tests;
- run existing schema/content regression tests;
- validate no direct AI state mutation path exists;
- merge to `main` only if green;
- deploy to Vercel.

## AI-6 — Memory 2.0 + Session State

**Status: PENDING**

Add episodic memory, semantic world facts, character knowledge, relationship changes, open threads, promises, discoveries, and compact session summaries.

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
