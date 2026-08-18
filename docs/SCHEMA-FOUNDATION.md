# Canonical Schema Foundation — D&D 2024

This document records the first structural pass over the current Foundry VTT D&D system and 5etools 2024 data formats. It is a design inventory, not a claim that OracleRPG mirrors either source.

## Design conclusion

OracleRPG should model reusable mechanics once and compose content types from them.

The most important shared primitive is `Activity`: an executable or rollable rules interaction such as an attack, saving throw, check, damage, healing, resource use, spell use, feature activation, or special action.

Foundry already applies an activity-oriented model across weapons, spells and features. 5etools often stores the same information partly as structured metadata and partly in tagged rules text. The Oracle importer must normalize both into the same canonical activity model.

## Canonical content families

### Monster

Required structural groups:

- creature identity: type, subtype, size, alignment;
- CR, proficiency bonus and XP;
- six ability scores;
- armor class variants;
- HP average and formula;
- initiative;
- movement modes and conditional movement;
- saves and skills;
- passive perception and senses;
- languages;
- damage vulnerabilities, resistances and immunities;
- condition immunities;
- habitat and treasure metadata;
- gear relationships;
- traits/features;
- actions, bonus actions, reactions, legendary actions and lair actions;
- legendary action/resistance resources;
- spellcasting relationships;
- source/editorial text.

Monster abilities that are reusable rules objects should eventually be split into canonical Feature entities. Activities remain executable children of the owning entity/feature.

### Physical Items

Shared physical item fields:

- item subtype;
- quantity;
- weight;
- price/currency;
- rarity;
- magical state;
- attunement;
- item properties/tags;
- charges/uses and recovery;
- activities;
- granted features;
- rules text.

Specialized forms then add their own mechanics:

- weapon: category, melee/ranged, base/versatile damage, ranges, ammunition, mastery, magical bonus;
- armor: category, AC calculation, Dexterity handling, Strength requirement, Stealth interaction;
- consumable: consumable type and consumption behavior;
- tool: tool type and ability association;
- container: capacity and contents;
- equipment/loot: category-specific metadata.

### Spell

- level;
- school;
- ritual;
- concentration;
- optional fixed casting ability;
- verbal/somatic/material components;
- material cost and consumption;
- one or more activities;
- scaling rules;
- spell-list relationships;
- tags;
- base and higher-level rules text.

Casting time, range, target, save, attack, damage and duration are represented through Activities instead of duplicated Spell-only structures.

### Feature / Feat

One Feature family covers:

- general/origin/other feats;
- class features;
- subclass features;
- species features;
- background features;
- monster features;
- optional features.

Structural needs:

- category/subtype;
- repeatability;
- prerequisites;
- activities;
- grants;
- choices;
- advancement by level where applicable;
- properties/tags;
- source text.

5etools demonstrates why grants and choices need first-class structures: features can grant ability increases, proficiencies, expertise, senses, languages, movement, spells, resources and entity choices.

### Class / Subclass

- hit die;
- primary abilities;
- saving throw proficiencies;
- armor/weapon/tool training;
- skill choices;
- starting equipment grants/choices;
- spellcasting progression and preparation model;
- level-indexed advancement;
- subclass acquisition level;
- class/subclass relationships;
- rules text.

Features are referenced/granted by progression rather than copied into the class payload.

### Species

- size options;
- base speed;
- creature type where relevant;
- grants;
- choices;
- referenced species features;
- rules text.

### Background

- ability-score choices;
- skill/tool proficiencies;
- language choices;
- Origin Feat relationship/choice;
- equipment grants/choices;
- other grants;
- rules text.

### Rules / Conditions / Tables

Rules reference material remains structured content rather than arbitrary HTML blobs. Tables preserve columns/rows/formula where relevant, while rich entries preserve headings, lists and nested rules text.

## Shared mechanical primitives

The schema package now defines reusable structures for:

- abilities;
- sizes;
- creature types;
- damage types;
- conditions;
- distances and units;
- activation/time units;
- formulas;
- entity references;
- choices;
- attack components;
- saving throw components;
- checks;
- damage/healing parts;
- condition application;
- duration;
- uses and recovery;
- resource costs;
- scaling.

## Import implications

A source adapter may expose source-specific records, but the mapper must resolve them into these structures before validation.

Examples:

- 5etools `time`, `range`, `components`, `duration`, `savingThrow`, `damageInflict`, and tagged entries become Spell + Activity fields.
- 5etools feat `prerequisite`, `ability`, `skillProficiencies`, `expertise`, `senses`, `additionalSpells`, and entries become Feature prerequisites/grants/activities/text.
- Foundry weapon `damage`, `range`, `mastery`, `properties`, item templates and activities become canonical PhysicalItem/Weapon + Activity structures.
- Foundry NPC CR, creature type, habitat, resources, HP formula and creature templates become canonical Monster fields.

Unsupported constructs must create importer diagnostics. They are not copied into `Record<string, unknown>` escape hatches inside canonical content.

## Still intentionally unresolved

Before population, representative fixtures must validate:

- multi-stage activities;
- nested choice/grant rules;
- summon/transformation payloads;
- spellcasting blocks on monsters;
- legendary/lair action edge cases;
- magical item enchantments;
- class progression tables and scale values;
- complex prerequisites;
- effect persistence/stacking;
- source text AST coverage beyond entries/list/table.

These should be solved from real D&D 2024/SRD 5.2 fixtures rather than speculative fields.
