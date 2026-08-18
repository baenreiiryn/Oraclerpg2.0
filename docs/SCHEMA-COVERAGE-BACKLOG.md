# Schema Coverage Backlog

This document tracks canonical schema capabilities discovered through compatibility audits. Audited source files are not imported or persisted as compendium content.

## Implemented shared primitives

The canonical schema now includes the shared mechanics discovered by item, monster, spell, species, background, class and subclass audits:

- EffectData, ModifierData, TriggerData, RuntimeValueRef, PredicateData and StateVariableData.
- FeaturePatchData, ConditionInteractionData, AfflictionInteractionData and AreaEffectData.
- EntityBenefitGrantData, CrossResourceRuleData, SummonSpec and VehicleData / VehicleStationData.
- ActionReplacementData, AttackOverrideData, UsageLimitData, MultiattackData and OutcomeDependentCostData.
- ItemSentienceData, RandomPropertyGrantData, LinkedLifecycleData, ChoiceDependencyData and EquipmentBundleData.
- ManualAdjudicationData and InvocationSpec.

## Implemented class/subclass mechanics layer

The class-oriented coverage discovered in the Wizard, Barbarian, Bard, Cleric and Druid audits has been implemented through `class-mechanics.ts` and `class-rules.ts`.

Implemented structures include spell collections/preparation/slot pools, stored rolls, transferable dice/resources, wards/damage interception, spell modifications, transformations, created/proxy entities, containment, runtime choices, resource allocation, generated actions, retargeting, cost modification, behavior constraints, object/age/attunement modification, chain effects and persistent entity collections.

## Validation foundation implemented

The schema package now also includes:

- canonical enum registries in `enums.ts`;
- stricter primitive aliases backed by those registries;
- typed JSON/query values instead of arbitrary `unknown` payloads in core containers;
- runtime validation through `validateCanonicalContent` and `assertCanonicalContent`;
- typed compatibility fixtures for Wizard, Bard, Cleric, Druid and Abjurer;
- executable positive and negative regression tests;
- GitHub Actions CI for typecheck and tests;
- schema migration/versioning contracts in `migration.ts`.

## Current compatibility status

The supplied regression probes for items, monsters, spells, species, backgrounds and the previously audited class files are representable by the current schema without a raw source-payload escape hatch.

The next class-file round should be treated as a stress test against both compile-time contracts and runtime validation. New source files remain probes only; they are not imported into the compendium during this phase.

## Remaining engineering work

1. Continue replacing permissive free-form strings and runtime paths with domain-specific enums/reference types when new probes prove the domain is stable enough.
2. Expand validators deeper into every nested mechanics structure as coverage grows.
3. Add more typed fixtures for every newly discovered edge case.
4. Keep all schema changes migration-aware even before persisted content exists.
5. Implement source adapters/importers only after the compatibility surface is stable.

## Audit policy

Compatibility status means whether the canonical model can represent mechanics without loss. Storing source text alone never counts as full support. `ManualAdjudicationData` counts as supported only where the source explicitly delegates resolution to the GM; it is not an escape hatch for mechanics that can be structured.
