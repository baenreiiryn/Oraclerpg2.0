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

## New gaps discovered by class/subclass audits

These capabilities are not yet represented cleanly enough to mark the new class files fully supported:

- SpellCollectionData / SpellbookData: persistent learned-spell collections distinct from prepared spells, including add/copy/replace rules, capacity/ownership, source restrictions and spellbook-dependent features.
- SpellPreparationRuleData: prepared-spell capacity, always-prepared exceptions, replacement cadence, multi-list access and preparation sourced from another collection such as a spellbook.
- SpellSlotPoolData: explicit slot progression/resource pools and constrained recovery rules.
- ResourceAllocationData: choose multiple resources to recover/spend under a combined budget (for example Arcane Recovery/Natural Recovery, where total recovered slot levels are capped and individual slot levels are restricted).
- StoredRollPoolData: roll and store one or more die results, consume them later as roll replacements, discard unused values on reset and change pool size by level (Portent/Greater Portent).
- RerollRuleData: reroll a resolved/failed D20 Test, optionally with Advantage/Disadvantage, and mandate use of the new result.
- DamageInterceptionData: redirect incoming damage to a ward/secondary HP pool, apply resistances/vulnerabilities in a defined order and pass overflow damage to the original target (Arcane Ward/Projected Ward).
- DamageMitigationData: reduce/halve incoming damage by formula or resource expenditure, including post-hit reactions and critical-hit interaction.
- ResolutionOverrideData: alter success/failure outcomes rather than only the numeric roll (Evasion-style no-damage/half-damage mappings, force an attack to miss, automatic save success/failure, cancel critical-triggered consequences).
- DiceResolutionModifierData: maximize dice, replace dice, change die size/count, or otherwise modify how an existing damage/healing roll resolves (Supreme Healing, Overchannel, Potent Cantrip edge cases).
- SpellModificationData: filter spells by class/school/level/tags and modify an existing cast's range, target count, school, components, concentration, effective slot level, damage type, save behavior, summon count/statistics, or granted secondary effects without copying the spell.
- CastOutcomeCostData: spend/refund a spell slot or other resource depending on whether the invoked spell succeeds at its purpose (Spell Breaker).
- TransferableResourceData: grant a die/resource to another actor with source ownership, recipient limits, duration, later consumption and scaling from the grantor (Bardic Inspiration and Combat Inspiration).
- RollTableOutcomeData: roll on a canonical table, persist the selected result, optionally choose instead of rolling under constraints, then later unleash/consume that stored outcome (College of Spirits).
- DistributedPoolData: divide a finite healing/damage/resource pool among multiple selected targets with per-target caps (Preserve Life).
- TransformationData: replace game statistics from a referenced stat block while retaining selected source statistics/features/proficiencies/resources, define equipment merge/wear/drop behavior, duration/end conditions, type/size overrides and later feature patches (Wild Shape, Polymorph modifications, Titan Form, Vermin Form).
- CreatedEntityData: create a temporary or persistent canonical object/entity tied to a feature, with replacement/destruction lifecycle and bearer-based effects (Transmuter's Stone, Star Map, illusion-made-real cases).
- EffectAnchorData / ProxyOriginData: create a movable non-creature anchor/illusion from which range/origin can be measured or spells can be cast, without treating it as a normal summon (Invoke Duplicity, movable preservation zones where appropriate).
- ConditionLevelData: increment/decrement/cap leveled conditions such as Exhaustion rather than treating them as simple booleans.
- ContainmentData: swallow/contain another creature, apply internal conditions/cover, capacity limits, concentration/lifecycle rules and forced release placement.
- CoverageData: grant Half/Three-Quarters/Total Cover as a structured effect and allow effects to suppress or alter cover.
- TeleportExchangeData: swap positions of two entities or teleport multiple linked targets with destination constraints.
- RuntimeChoiceStateData: persistent mutually exclusive modes/options whose downstream features depend on the current selection (Storm Aura environment, Circle of the Land choice, Starry Form constellation, Transmuter's Stone benefits).
- GeneratedActionData: add an attack/move/cast inside another action or as part of spending a resource, distinct from replacing an attack (Agile Strikes, Bladesinger cantrip-in-Extra-Attack, Battle Magic).
- TargetRetargetData: redirect an already-resolved/triggering attack to another legal target while reusing the same attack roll (Instinctive Charm).
- ResourceDicePoolData: resources measured as dice rather than scalar uses, with die-size/count progression and selective spending (Bardic Inspiration variants, Warrior of the Gods).

## Remaining work after this audit

The earlier audited item/monster/spell/species/background examples remain representable, but the new class files are only partially covered until the class-oriented primitives above are implemented. After implementation, rerun the same files as regression probes before changing importers.

## Audit policy

Compatibility status means whether the canonical model can represent the mechanics without loss. Storing source text alone never counts as full support. `ManualAdjudicationData` counts as supported only for a rule that is inherently delegated to GM judgement by the source; it is not an escape hatch for mechanics that could otherwise be structured.
