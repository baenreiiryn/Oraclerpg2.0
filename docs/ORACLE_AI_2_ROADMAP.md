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

Validated guarantees:

- AI package has no provider dependency.
- Runtime owns state loading and mutation.
- Every AI action proposal passes validation before execution.
- Rejected proposals cannot reach the executor.
- Context state revision must match the authoritative state revision.
- Turn persistence records both proposed and resolved actions.

## AI-2 — Context Engine 2.0

**Status: COMPLETE**

Implemented a provider- and prompt-independent Context Engine with a typed `OracleContextPackage` v2.

Context sections:

- campaign;
- scene;
- actors;
- entities;
- relationships;
- perspective-aware knowledge;
- mechanical context.

Validated guarantees:

- context is aligned with authoritative campaign, actor, and state revision;
- non-present actors are excluded by default;
- unrelated entities are excluded by default;
- `PUBLIC` and `DISCOVERED` knowledge may enter player context;
- `ACTOR_ONLY` knowledge is restricted to listed actors;
- `GM_ONLY` and `HIDDEN` knowledge never enter a normal player turn;
- hidden/GM-only relationships are excluded from player context;
- legacy v1 context remains accepted during migration, while new engine output is v2.

## AI-3 — Structured AI Actions

**Status: COMPLETE**

Replaced generic action payloads with versioned discriminated action contracts and a per-turn capability manifest.

Structured operations currently defined:

- `rules.request-evaluation`;
- `dice.request-roll`;
- `state.request-query`;
- `world.suggest-change`.

Validated guarantees:

- executable AI proposals carry `schemaVersion: 1`;
- each operation has a typed payload instead of `Record<string, unknown>`;
- narrative tasks are separated from executable structured actions;
- the Runtime builds a capability manifest for every turn;
- capabilities may restrict operation, actor, target, and exposed references;
- proposals outside the manifest never reach action validation or execution;
- the capability manifest is persisted with the turn for auditability;
- mechanical validation remains a separate gate after capability validation.

## AI-4 — Rules / Compendium Bridge

**Status: COMPLETE**

Implemented a deterministic bridge from AI-3 structured rule requests into OracleRPG Core, Schema, and canonical compendium records.

Implemented components:

- `OracleEntityCompendiumIndex` for canonical-ID lookup over Oracle entities;
- `RulesCompendiumBridge` for deterministic rule evaluation;
- runtime-authoritative `ActorRulesState` projection contract;
- rules-aware validator/executor adapters for the Turn Orchestrator;
- safe compendium state queries that expose metadata/activity summaries rather than arbitrary raw entity data.

Validated guarantees:

- feature, spell, and item references are resolved by canonical ID;
- the referenced entity must be usable/castable/available according to authoritative runtime state;
- activity IDs must exist on the referenced canonical record;
- targets must be present in the authoritative target set;
- numeric Activity resource costs are checked against authoritative resource pools;
- exhausted resources return `ILLEGAL` rather than relying on model judgment;
- unresolved runtime/formula costs and manual-adjudication mechanics return `MANUAL` rather than guessing;
- short/long rest requests can be gated by authoritative runtime state;
- generic runtime actions must be present in `availableActionRefs`;
- real SRD 5.2 class-feature, spell, and item JSON records are indexed successfully in integration tests;
- AI still has no direct state mutation capability.

## AI-5 — Scene + Entity + Knowledge State

**Status: COMPLETE**

Implemented explicit runtime-owned, revisioned campaign world state for scenes, actors, entities, relationships, objective facts, and knowledge grants.

Implemented components:

- `CampaignWorldState` with an authoritative world revision;
- `WorldStateStorePort` persistence boundary;
- `WorldStateService` with optimistic revision checks and integrity validation;
- explicit objective `WorldFactState` separated from `KnowledgeGrantState`;
- relationship state with visibility rules;
- `WorldStateContextSource` adapter feeding persistent world state into Context Engine 2.0;
- context projection now includes visible relationships while preserving player perspective.

Validated guarantees:

- objective secrets may exist in world truth without appearing in player context;
- actor-specific knowledge grants do not leak to other actors;
- knowledge becomes visible only after an authoritative Runtime mutation;
- stale world revisions cannot overwrite newer state;
- invalid fact/entity/actor references are rejected before persistence;
- GM-only/hidden relationships remain outside player context;
- the AI still has no direct access to `WorldStateService` or `WorldStateStorePort` mutation methods.

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
