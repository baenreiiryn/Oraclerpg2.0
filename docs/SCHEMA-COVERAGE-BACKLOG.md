# Schema Coverage Backlog

This document tracks canonical schema capabilities discovered through compatibility audits. Audited source files are not imported or persisted as compendium content.

## Implemented shared primitives

The following capabilities have now been implemented in the canonical schema layer:

- EffectData: persistent/temporary effects with modifiers, conditions, afflictions, areas, granted activities/entities and state variables.
- ModifierData: bonus, penalty, advantage, disadvantage, minimum, maximum, replacement, resistance/immunity changes, suppression/prevention, movement and AC modification.
- TriggerData: structured events including hit/miss/critical, damage, failed checks/saves, initiative, turn boundaries, area entry/exit, movement, rest, death/revival, dawn/sunset and manual/custom events.
- RuntimeValueRef: formulas and context references for ability scores/modifiers, proficiency bonus, class/character level, state variables and runtime paths such as damage dealt or target HP maximum.
- PredicateData: boolean/comparison predicates plus creature type, size, conditions, distance, adjacent allies, armor, movement history, anatomy, legendary actions and explicit manual predicates.
- StateVariableData: mutable state with event-driven transitions and reset rules.
- FeaturePatchData: level-based evolution of existing features.
- ConditionInteractionData: apply/remove/suppress/prevent/immunity and repeat-save behavior.
- AfflictionInteractionData: disease/curse/poison/custom affliction interaction.
- AreaEffectData: persistent areas, obscurity, light and environmental interactions.
- EntityBenefitGrantData: reference benefits of another canonical entity without copying it.
- CrossResourceRuleData: consume one resource to restore another.
- SummonSpec: referenced summon, placement, allegiance, initiative/turn policy, commands, fallback, despawn and scaling.
- VehicleData / VehicleStationData: capacity, thresholds, travel pace, stations, crew, cover and activities.
- ActionReplacementData: replace attacks/actions with another activity while preserving action economy.
- AttackOverrideData: replace or augment an existing attack mode such as an Unarmed Strike.
- UsageLimitData: turn/round/target/lifetime usage windows and event-based recovery.
- MultiattackData: compose repeated/named attacks without duplicating activities.
- OutcomeDependentCostData: consume/refund usage based on roll outcome.
- ItemSentienceData: sentient item abilities, senses, languages, telepathy, personality/purpose, autonomous activities and timed obligations.
- RandomPropertyGrantData: referenced random property pools with suppression predicates.
- LinkedLifecycleData: linked death/revival/removal/attunement lifecycles.
- ChoiceDependencyData and EquipmentBundleData: dependent choices and mutually exclusive equipment packages.
- ManualAdjudicationData: explicit representation of rules whose resolution belongs to the GM.
- InvocationSpec: invoke/cast another canonical entity with spell-level, DC, ability, component, concentration, duration and destination overrides.

## Capabilities represented through combinations of primitives

The following do not require separate one-off schemas:

- conditional roll ability override: ModifierData + PredicateData;
- structured rule prohibitions such as no spellcasting/concentration: ModifierData/EffectData suppression/prevention;
- dynamic save DCs: RuntimeValueRef + StateVariableData;
- selectable effects and option-count scaling: activities/choices + FeaturePatchData;
- inherited damage type: DamagePart.inheritDamageType / runtime context;
- repeat saves: ConditionInteractionData.repeatSave;
- spatial predicates and movement-history predicates: PredicateData;
- target-scoped lockouts: StateVariableData + target-scoped UsageLimitData;
- resistance bypass: ModifierData(mode=ignoreResistance);
- post-roll reactions: TriggerData(onFailedSave/onFailedCheck) + reaction Activity + runtime modifier;
- random durations: RuntimeValueRef(formula) in effect duration;
- relative values such as climb speed = walk speed: RuntimeValueRef(runtime path);
- level gates: AdvancementStep / FeaturePatchData;
- autonomous item behavior: ItemSentienceData.autonomousActivities;
- elapsed-time obligations/conflicts: ItemSentienceData.obligations + TriggerData;
- anatomy/capability requirements: PredicateData(anatomy/manual/custom).

## Remaining work is validation, not missing representation

The compatibility audits now show representation coverage for the tested files. The next engineering tasks are:

1. replace permissive sketches (`string`, `unknown`, generic query records) with validated domain enums/structures where appropriate;
2. implement runtime validators for the TypeScript contracts;
3. create executable compatibility fixtures/tests from audited mechanics without importing source content into the compendium;
4. define migration/versioning rules before persisted content exists;
5. implement source adapters only after validation is stable.

## Audit policy

Compatibility status means whether the canonical model can represent the mechanics without loss. Storing source text alone never counts as full support. `ManualAdjudicationData` counts as supported only for a rule that is inherently delegated to GM judgement by the source; it is not an escape hatch for mechanics that could otherwise be structured.
