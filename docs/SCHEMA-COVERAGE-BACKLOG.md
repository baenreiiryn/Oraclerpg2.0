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

The class-oriented coverage discovered in the Wizard, Barbarian, Bard, Cleric and Druid audits has now been implemented through `class-mechanics.ts` and `class-rules.ts`.

Implemented structures include:

- SpellCollectionData, SpellPreparationRuleData and SpellSlotPoolData.
- SpellFilterData, SpellModificationData, CastOutcomeCostData and SpellChoiceInvocationData.
- SpellActionReplacementData for replacing one attack with a qualifying spell/cantrip.
- EntityCollectionData for persistent non-spell collections such as known Wild Shape forms.
- ResourceAllocationData, ResourceDicePoolData, TransferableResourceData and ResourceMutationData.
- StoredRollPoolData, RollReplacementData and RerollRuleData.
- DamageInterceptionData, DamageMitigationData, ResolutionOverrideData and DiceResolutionModifierData.
- RollTableOutcomeData and DistributedPoolData.
- TransformationData and transformation form patches.
- CreatedEntityData, ProxyOriginData, EffectAnchorData and ProjectedEffectData.
- ContainmentData, ConditionLevelData, CoverageData and MovementPermissionData.
- TeleportExchangeData, RuntimeChoiceStateData, GeneratedActionData and TargetRetargetData.
- BehaviorConstraintData and EntityRelationshipPredicateData.
- CostModificationData, including material/consumed-component handling and chance-to-retain rules.
- ObjectTransformationData, AgeModificationData and AttunementModificationData.
- ChainEffectData for secondary/chained targets and effects.

## Capabilities represented through combinations of primitives

The following do not require one-off schemas:

- conditional roll ability override: ModifierData + PredicateData;
- spellcasting/concentration prohibitions: ModifierData/EffectData suppression or prevention;
- dynamic save DCs: RuntimeValueRef + StateVariableData;
- selectable effects and level progression: choices + FeaturePatchData;
- inherited damage types and source-context values: runtime references;
- repeat saves: ConditionInteractionData.repeatSave;
- target-scoped lockouts: state + target-scoped usage limits;
- post-roll reactions: structured triggers + roll modifiers/rerolls;
- relative movement values: RuntimeValueRef(runtime path);
- autonomous item behavior and timed obligations: sentience + triggers/state;
- Wild Shape/Titan-style partial stat replacement: TransformationData + EntityCollectionData + form patches;
- spellbook/prepared/always-prepared distinctions: SpellCollectionData + SpellPreparationRuleData;
- wards and projected wards: created/resource-backed entities + DamageInterceptionData;
- Portent-style stored dice: StoredRollPoolData + RollReplacementData;
- Bardic Inspiration-style transferable dice: ResourceDicePoolData + TransferableResourceData;
- dynamic spell selection such as Divine Intervention/Natural Recovery: SpellChoiceInvocationData + SpellFilterData;
- moving zones and proxy spell origins: EffectAnchorData + ProxyOriginData;

## Current compatibility status

The supplied regression probes for items, monsters, spells, species, backgrounds and the five class files are representable by the current schema without a raw source-payload escape hatch.

See:

- `docs/COMPATIBILITY-REGRESSION-2026-08-18.md`
- `docs/CLASS-COMPATIBILITY-REGRESSION-2026-08-18.md`

## Remaining engineering work

Representation coverage is no longer the main blocker for the tested probes. Before source adapters/importers are implemented, the next work is:

1. replace permissive strings, `unknown` values and generic runtime paths with stricter domain enums/typed references where possible;
2. implement runtime validators for canonical schemas;
3. create executable TypeScript compatibility fixtures from the audited mechanics;
4. add schema typecheck/tests to CI;
5. define migrations/versioning before persisted compendium content exists;
6. only after those contracts are stable, implement source adapters/importers.

## Audit policy

Compatibility status means whether the canonical model can represent mechanics without loss. Storing source text alone never counts as full support. `ManualAdjudicationData` counts as supported only where the source explicitly delegates resolution to the GM; it is not an escape hatch for mechanics that can be structured.
