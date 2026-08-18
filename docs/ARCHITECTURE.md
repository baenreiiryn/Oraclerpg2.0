# Architecture

## 1. Canonical ownership

OracleRPG owns its canonical domain model.

Foundry VTT, 5etools, PDFs, user JSON, future APIs and other external formats are integration boundaries. None of them may define the persistence shape of an OracleRPG entity.

## 2. Reference architecture

Foundry VTT is a design reference for:

- typed documents and subtypes;
- explicit data models;
- initialization, cleaning and validation;
- schema migration;
- reusable embedded/related documents;
- separation between generic document identity and game-system-specific data.

OracleRPG does not reproduce Foundry documents one-to-one. It adopts useful architectural ideas while keeping an application-independent domain model.

## 3. Layer boundaries

```text
┌───────────────────────────────────────────┐
│ Apps / API / UI                           │
├───────────────────────────────────────────┤
│ Runtime services                          │
│ Characters, campaigns, rolls, queries     │
├───────────────────────────────────────────┤
│ Compendium services / relationship graph │
├───────────────────────────────────────────┤
│ Canonical schemas + validators            │
├───────────────────────────────────────────┤
│ Import mappers                            │
├───────────────────────────────────────────┤
│ Source adapters                           │
├───────────────────────────────────────────┤
│ External sources                          │
└───────────────────────────────────────────┘
```

Dependencies point inward toward canonical contracts. Canonical packages must never import a source adapter.

## 4. Canonical document families

The exact taxonomy will evolve through schema ADRs, but the initial families are:

### Entity

A reusable canonical compendium record with stable identity, source/provenance metadata and relationships.

### Actor-like entity

An entity capable of carrying creature/character state or statistics. Initial candidates: character, npc/monster, vehicle and companion.

### Item-like entity

A reusable rule-bearing or possessable entity. Initial candidates include weapon, armor/equipment, consumable, tool, container, spell, feature, class, subclass, species and background.

### Rule/reference entity

Rules text, tables, conditions and other reference material that may be linked by mechanics but is not inherently an Actor or Item.

The labels “Actor” and “Item” are useful Foundry vocabulary, not a requirement that OracleRPG mirror Foundry storage semantics.

## 5. Mechanical data vs editorial text

Mechanical behavior is represented structurally whenever the rules can be modeled.

Example concepts:

- attack bonus;
- ability used;
- reach/range;
- targets;
- damage parts;
- saving throw;
- condition application;
- uses and recovery;
- duration.

Source/editorial text may be preserved for display and traceability, but it must not be the sole representation of executable mechanics.

## 6. Relationships instead of duplication

Reusable entities are referenced by stable IDs. A class should reference a class feature rather than duplicate its full payload. A character should reference granted entities plus character-owned state rather than copy the entire compendium blindly.

Snapshots are allowed only when runtime/history semantics require immutability and must be explicitly identified as snapshots.

## 7. Schema evolution

Every canonical entity carries a schema version. Changes that alter persisted shape require a migration path.

Rules:

1. validators reject invalid canonical documents;
2. migrations are deterministic;
3. migrations never depend on localized display names;
4. importer versions are independent from schema versions;
5. old import provenance remains traceable after migration.

## 8. Game-system identity

These dimensions are independent:

```text
gameSystem   = dnd5e
rulesVersion = 2014 | 2024 | ...
contentSource = srd-5.1 | srd-5.2 | homebrew | user | ...
```

A source package is not a game system.

## 9. Import safety

The import pipeline is:

```text
Source bytes/object
  → Source Adapter
  → Normalized Source Record
  → Oracle Mapper
  → Canonical Entity
  → Schema Validator
  → Relationship Validator
  → Compendium write
```

Unknown or unsupported source constructs produce diagnostics. They must not be silently dropped and must not be copied into an untyped escape-hatch object merely to make validation pass.

## 10. Licensing and provenance

The compendium architecture must support source and license metadata per package/entity. Import capability does not imply permission to redistribute imported data.

SRD packages and user/private imports are separate distribution concerns from the schema/import technology itself.

## 11. v1.00 constraint

Do not optimize the canonical model for UI forms, database tables or a single importer before the core schemas have been exercised by representative fixtures.
