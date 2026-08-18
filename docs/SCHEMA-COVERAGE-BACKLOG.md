# Schema Coverage Backlog

This document tracks canonical schema capabilities discovered through compatibility audits. Audited source files are not imported or persisted as compendium content.

## Required shared primitives

- EffectData: persistent or temporary effects with apply/remove/suppress/immunity semantics.
- ModifierData: bonus, penalty, advantage, disadvantage, minimum, replacement/override, resistance/immunity changes, movement and AC modifiers.
- TriggerData: structured events such as onHit, onMiss, onDamage, onTurnStart, onTurnEnd, onEnterArea, onLeaveArea, onReduceToZero, onCritical, onInitiative, onRest and custom conditional triggers.
- StateVariableData: mutable counters/values with reset and transition rules.
- FeaturePatchData: level-based evolution of existing features without duplicating the feature.
- ConditionInteraction: apply, remove, suppress, prevent, immunity and repeat-save behavior.
- AreaEffectData: persistent areas, obscurity, light, environmental interactions and per-turn entry/start effects.
- GrantedActivityData: effects that temporarily grant new actions/activities.
- EntityBenefitGrant: grant or reference benefits of another canonical entity without copying it.
- CrossResourceRule: consume one resource to restore or power another.
- SummonSpec: referenced summoned entity/stat block, allegiance, initiative/turn policy, commands, fallback behavior, despawn and scaling.
- VehicleData: capacities, thresholds, travel pace, stations, crew requirements, cover and movement-triggered mechanics.

## Additional needs from complex classes/features

- Conditional roll ability override (e.g. use Strength for selected skills while another state is active).
- Structured rule prohibitions (e.g. cannot cast spells / cannot maintain Concentration).
- Dynamic save DCs and formulas referencing state variables.
- Multi-option activities with selectable effects and option-count scaling.
- Inherited damage type / source-context formulas.
- Repeat saves on specific timings.

## Additional needs from item, monster, species, feat and background audits

- ActionReplacementData: replace one attack/action component with another activity while preserving action economy.
- UsageLimitData: once-per-turn, once-per-round and other windowed usage constraints distinct from rest/dawn recharge.
- RecoveryTriggerData: dawn, sunset, elapsed-hours/days and other calendar/event recovery timings.
- SpatialPredicateData: ally/enemy proximity, distance, line/adjacency and target-state predicates.
- MovementHistoryPredicate: distance moved, direction/straight-line movement and movement immediately before an effect.
- MultiattackData: compose repeated/named attacks without duplicating activities.
- OutcomeDependentCost: expend/refund uses depending on success/failure or other resolved outcomes.
- ContextValueRef: formulas referencing damage dealt, target HP maximum, ability modifier used, source damage type, proficiency bonus and other runtime values.
- TargetScopedState: persistent per-target lockouts or flags (for example, an ability that can no longer affect one specific target).
- ResistanceBypass: ignore a specific resistance or immunity under defined conditions.
- ItemSentienceData: sentient item abilities, senses, languages, telepathy, alignment/personality, agenda and autonomous actions.
- AutonomousActivityPolicy: an item/entity can decide when to activate/end an effect independently from the wielder.
- TimedObligation/ConflictData: elapsed-time hunger/agenda rules that trigger checks or conflicts at later events such as sunset.
- RandomPropertyGrant: roll/select properties from referenced property tables, including suppression conditions.
- ManualAdjudicationPredicate: explicitly mark rules that require GM judgement rather than pretending they are fully automatable.
- Anatomy/CreatureCapabilityPredicate: head/limb/creature-type or similar target capabilities when mechanics depend on anatomy.
- LinkedLifecycleData: a secondary being/entity shares death/revival or other lifecycle with its host without necessarily being targetable.
- PostRollReactionModifier: reactions after seeing a failed roll that can add dice/bonuses and potentially change the result.
- RandomDurationData: durations expressed as dice/formulas such as 1d12 hours.
- ChoiceDependencyData: nested/dependent choices where later grants/equipment depend on an earlier selection.
- EquipmentBundleData: mutually exclusive starting-equipment packages with quantities, currency and references.
- RelativeValueData: movement or other values equal to another derived value (for example climb speed equals walking speed).
- LevelGateData: unlock or modify part of a feature at a character level without duplicating the whole feature.
- AttackModeOverride: replace/augment an Unarmed Strike or weapon mode with alternate damage/formula.

## Audit policy

Compatibility status means whether the canonical model can represent the mechanics without loss. Storing source text alone never counts as full support.
