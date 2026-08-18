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

## Audit policy

Compatibility status means whether the canonical model can represent the mechanics without loss. Storing source text alone never counts as full support.
