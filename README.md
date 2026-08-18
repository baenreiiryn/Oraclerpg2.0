# OracleRPG 2.0

OracleRPG 2.0 is a clean-room architectural restart of OracleRPG.

The project is being built from the data model outward: first canonical schemas, validation, provenance, relationships and import contracts; then compendium content; only after that runtime features, character sheets and campaign UI.

## v1.00 goal

Deliver a structured D&D 5e foundation capable of storing, importing, relating and using SRD content without coupling the OracleRPG data model to any external source format.

## Architectural rule

> The OracleRPG compendium owns its canonical model. External sources are translated into that model; the model is never shaped around a specific source.

## References, not dependencies

- Foundry VTT D&D5e: reference for typed game documents, data models, validation and migration patterns.
- 5etools: reference/source format for structured D&D 5e data and homebrew-compatible content.
- 5etools-to-Foundry importers: reference for source normalization and mapping strategies.
- D&D SRD: authority/manifest for deciding which SRD content belongs in an OracleRPG SRD package.

OracleRPG must not require Foundry VTT or 5etools at runtime.

## Data flow

```text
External Source
      ↓
Source Adapter
      ↓
Normalized Source Record
      ↓
Oracle Mapper
      ↓
Canonical Oracle Schema
      ↓
Validator
      ↓
Compendium Store
```

No importer writes arbitrary source JSON directly into the compendium.

## Repository structure

```text
apps/                 Future user-facing applications
packages/
  core/               Domain primitives and shared contracts
  schema/             Canonical OracleRPG schemas and validation
  importers/          Source adapters and import pipeline
  content/            Source manifests and curated content packages
docs/                 Architecture and design decisions
```

The v1.00 roadmap intentionally starts without authentication, database infrastructure or a full UI. Those layers come after the canonical model is stable enough to support them.

## System identity

Game system, rules version and content source are distinct concepts.

Example:

```text
gameSystem: dnd5e
rulesVersion: 2014
contentSource: srd-5.1
```

This keeps the model ready for 2014 rules, 2024 rules, SRD packages and homebrew without treating each combination as a different game system.

## Current stage

Foundation / Phase 0.

See `ROADMAP-v1.md` and the documents under `docs/` before implementing content schemas or importers.
