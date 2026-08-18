# OracleRPG 2.0 — Roadmap v1.00

## Product objective

Version 1.00 establishes a structured D&D 2024 rules/content foundation and proves it end-to-end through a functional character workflow, using canonical OracleRPG data rather than source-specific JSON.

The v1.00 line does not target the 2014 rules. All schemas, fixtures, imports and runtime behavior are designed against the 2024 ruleset and SRD 5.2.

## Phase 0 — Foundation

- Define architectural principles and canonical document envelope.
- Separate game system, rules version and content source.
- Canonical target: `gameSystem=dnd2024`, `rulesVersion=2024`, `contentSource=srd-5.2` for the SRD package.
- Define stable IDs, canonical IDs, schema versioning and provenance.
- Define validation and migration requirements.
- Establish monorepo boundaries for core, schemas, importers and content.
- Document source adapter → normalized record → canonical mapper → validator pipeline.

**Exit criteria:** repository skeleton and contracts exist before any SRD content is imported.

## Phase 1 — Compendium Core

- Define canonical document families: Actor-like entities, Item-like entities, rules/references and assets.
- Use the current Foundry D&D system's 2024 data models as a structural reference only.
- Ignore legacy 2014 branches/fields unless needed solely to understand a migration or distinguish 2024 semantics.
- Define indexing, tags, source metadata and relation primitives.
- Define embedded vs referenced content rules.
- Define package/compendium metadata.

## Phase 2 — Source Registry

- Registry for content provenance and licensing metadata.
- First-party open content target: `srd-5.2`.
- Support `homebrew`, `user`, and importer provenance as separate concepts.
- Track source keys, import timestamps, hashes and mapper versions.
- Do not populate or model SRD 5.1/2014 content in v1.00.

## Phase 3 — Bestiary Schema

Build the canonical Monster schema before importing monsters.

Coverage includes identity, creature type, size, alignment, abilities, proficiency, AC, HP, hit dice, CR, movement modes, saves, skills, senses, languages, defenses, traits, actions, bonus actions, reactions, legendary actions, lair actions, spellcasting, equipment, environments and presentation metadata.

Mechanical actions must be structured; editorial/source text may be preserved separately.

The schema must reflect D&D 2024 semantics where they differ from legacy 2014 representations.

## Phase 4 — 5etools D&D 2024 Monster Adapter

- Study representative 5etools records for 2024/SRD 5.2 creatures only.
- Study current 5etools-to-Foundry mapping behavior where useful, filtering out legacy 2014 handling.
- Normalize source variants without exposing source-specific fields to Oracle schemas.
- Map normalized records to canonical Monster.
- Record unsupported source constructs explicitly instead of silently discarding them.
- Add fixtures and mapping tests using 2024 creatures.

## Phase 5 — SRD 5.2 Content Manifest

Use SRD 5.2 as the authority/checklist for what belongs to the OracleRPG D&D 2024 SRD package.

The SRD manifest answers questions such as “which creatures belong to SRD 5.2?” while structured source adapters provide machine-readable records.

## Phase 6 — SRD 5.2 Beasts

Populate a first curated bestiary slice with beasts, beginning with fixtures that exercise different mechanics (ground, flight, swim, climb, senses, pack tactics, grapple/restrain and similar cases).

Use this slice to validate both the schema and the importer before mass import.

## Phase 7 — Activity / Action Engine

Create reusable mechanical components for activation, target, range, attack, save, damage, healing, effects, conditions, duration, uses, recovery and resource costs.

Monster attacks, weapon attacks, spells and class features should reuse the same primitives wherever the 2024 rules are equivalent.

## Phase 8 — Items

Canonical 2024 schemas and import support for weapon, armor/equipment, consumable, tool, container and loot content.

## Phase 9 — Spells

Canonical 2024 spell schema covering level, school, ritual, casting time, range, components, duration, concentration, targeting, attacks, saves, damage, healing, scaling, effects and class relationships.

## Phase 10 — Features

Create a reusable Feature model supporting feats, class features, subclass features, species features, background features and monster features under the 2024 rules.

## Phase 11 — Classes and Subclasses

- Model only 2024 class progression in v1.00.
- Class progression references features instead of duplicating them.
- Subclasses and subclass features are separate related entities.
- Choices, grants, prerequisites and progression are structured.

## Phase 12 — Species and Backgrounds

Canonical 2024 schemas, grants, proficiencies, equipment, languages, choices and traits.

## Phase 13 — Relationship Graph

Make relationships queryable across the compendium: classes → features, spells → classes, Wild Shape → monsters, items → granted effects, and similar relations.

## Phase 14 — Import Framework

Stabilize importer packages for 5etools 2024-compatible data and Oracle-native formats, with future extension points for current Foundry exports and other legal/user-provided sources.

## Phase 15 — Compendium UI

Build search, filters, source browsing and entity views only after the canonical schemas are stable.

## Phase 16 — Character Core

Character state consumes canonical D&D 2024 compendium entities for abilities, resources, class progression, species, background, inventory, spells, features, effects and progression.

## Phase 17 — Druid End-to-End Test

Use the 2024 Druid + Wild Shape as the first high-value architecture proof.

Wild Shape should query compatible beast entities rather than embed a manually maintained beast list.

## Phase 18 — Functional Character Sheet

Attributes, skills, saves, HP, AC, movement, inventory, spells, features, resources, level-up, rolls, effects and Wild Shape under the 2024 rules.

## Phase 19 — Minimal Campaign

Campaign, GM, players, characters, selected `dnd2024` system and compendium package configuration.

## Phase 20 — v1.00 Release Gate

A v1.00 flow must support:

1. Create a D&D 2024 campaign.
2. Add a character.
3. Select species, background and class.
4. Progress levels and receive referenced features.
5. Equip items.
6. Prepare/use spells.
7. Execute structured actions/rolls.
8. Browse the structured SRD 5.2 compendium.
9. Use 2024 Wild Shape against real bestiary data.

No release gate depends on raw PDF parsing as the canonical data path, and no v1.00 feature depends on D&D 2014 compatibility.
