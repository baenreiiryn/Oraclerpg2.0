# OracleRPG 2.0 — Roadmap v1.00

## Product objective

Version 1.00 establishes a structured D&D 5e rules/content foundation and proves it end-to-end through a functional character workflow, using canonical OracleRPG data rather than source-specific JSON.

## Phase 0 — Foundation

- Define architectural principles and canonical document envelope.
- Separate game system, rules version and content source.
- Define stable IDs, canonical IDs, schema versioning and provenance.
- Define validation and migration requirements.
- Establish monorepo boundaries for core, schemas, importers and content.
- Document source adapter → normalized record → canonical mapper → validator pipeline.

**Exit criteria:** repository skeleton and contracts exist before any SRD content is imported.

## Phase 1 — Compendium Core

- Define canonical document families: Actor-like entities, Item-like entities, rules/references and assets.
- Define indexing, tags, source metadata and relation primitives.
- Define embedded vs referenced content rules.
- Define package/compendium metadata.

## Phase 2 — Source Registry

- Registry for content provenance and licensing metadata.
- Distinguish `srd-5.1`, `srd-5.2`, `homebrew`, `user`, and importer provenance.
- Track source keys, import timestamps, hashes and mapper versions.

## Phase 3 — Bestiary Schema

Build the canonical Monster schema before importing monsters.

Coverage includes identity, creature type, size, alignment, abilities, proficiency, AC, HP, hit dice, CR, movement modes, saves, skills, senses, languages, defenses, traits, actions, bonus actions, reactions, legendary actions, lair actions, spellcasting, equipment, environments and presentation metadata.

Mechanical actions must be structured; editorial/source text may be preserved separately.

## Phase 4 — 5etools Monster Adapter

- Study representative 5etools monster records.
- Normalize source variants without exposing source-specific fields to Oracle schemas.
- Map normalized records to canonical Monster.
- Record unsupported source constructs explicitly instead of silently discarding them.
- Add fixtures and mapping tests.

## Phase 5 — SRD Content Manifest

Use the SRD as the authority/checklist for what belongs to the SRD package.

The SRD manifest answers questions such as “which creatures are part of SRD 5.1?” while structured source adapters provide machine-readable records.

## Phase 6 — SRD Beasts

Populate a first curated bestiary slice with beasts, beginning with fixtures that exercise different mechanics (ground, flight, swim, climb, senses, pack tactics, grapple/restrain and similar cases).

Use this slice to validate both the schema and the importer before mass import.

## Phase 7 — Activity / Action Engine

Create reusable mechanical components for activation, target, range, attack, save, damage, healing, effects, conditions, duration, uses, recovery and resource costs.

Monster attacks, weapon attacks, spells and class features should reuse the same primitives wherever the rules are equivalent.

## Phase 8 — Items

Canonical schemas and import support for weapon, armor/equipment, consumable, tool, container and loot content.

## Phase 9 — Spells

Canonical spell schema covering level, school, ritual, casting time, range, components, duration, concentration, targeting, attacks, saves, damage, healing, scaling, effects and class relationships.

## Phase 10 — Features

Create a reusable Feature model supporting feats, class features, subclass features, species features, background features and monster features.

## Phase 11 — Classes and Subclasses

- Class progression references features instead of duplicating them.
- Subclasses and subclass features are separate related entities.
- Choices, grants, prerequisites and progression are structured.

## Phase 12 — Species and Backgrounds

Canonical schemas, grants, proficiencies, equipment, languages, choices and traits.

## Phase 13 — Relationship Graph

Make relationships queryable across the compendium: classes → features, spells → classes, Wild Shape → monsters, items → granted effects, and similar relations.

## Phase 14 — Import Framework

Stabilize importer packages for 5etools and Oracle-native formats, with future extension points for Foundry exports and other legal/user-provided sources.

## Phase 15 — Compendium UI

Build search, filters, source browsing and entity views only after the canonical schemas are stable.

## Phase 16 — Character Core

Character state consumes canonical compendium entities for abilities, resources, class progression, species, background, inventory, spells, features, effects and progression.

## Phase 17 — Druid End-to-End Test

Use Druid + Wild Shape as the first high-value architecture proof.

Wild Shape should query compatible beast entities rather than embed a manually maintained beast list.

## Phase 18 — Functional Character Sheet

Attributes, skills, saves, HP, AC, movement, inventory, spells, features, resources, level-up, rolls, effects and Wild Shape.

## Phase 19 — Minimal Campaign

Campaign, GM, players, characters, selected game system/rules version and compendium package configuration.

## Phase 20 — v1.00 Release Gate

A v1.00 flow must support:

1. Create a D&D 5e campaign.
2. Add a character.
3. Select species, background and class.
4. Progress levels and receive referenced features.
5. Equip items.
6. Prepare/use spells.
7. Execute structured actions/rolls.
8. Browse the structured compendium.
9. Use Wild Shape against real bestiary data.

No release gate depends on raw PDF parsing as the canonical data path.
