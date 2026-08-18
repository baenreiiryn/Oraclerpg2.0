# Expanded Class Schema Stress Test — 2026-08-19

Status: schema compatibility audit only. No uploaded class content was imported or persisted.

## Scope

This pass tests the current canonical class/subclass contracts against the uploaded class files, including Artificer, Barbarian, Bard, Cleric, Druid, Fighter, Monk, Paladin, Psion, Ranger, Rogue, Sorcerer, Warlock, Wizard and their supplied subclasses.

`SUPPORTED` means the mechanic has a typed canonical representation without relying on a generic raw-source payload. `PARTIAL` means the architecture can host the feature, but one or more semantics still require a new typed primitive.

## Results

| Class | Status | Notes |
|---|---|---|
| Barbarian | SUPPORTED | Existing effect/modifier/state/feature-patch coverage remains sufficient for sampled Rage and subclass mechanics. |
| Bard | SUPPORTED | Transferable dice, post-roll modification, spell-list expansion and stored random outcomes remain covered. |
| Cleric | SUPPORTED | Shared Channel Divinity resources, distributed pools, spell-choice invocation and behavior constraints remain covered. |
| Druid | SUPPORTED | Transformation, persistent known-form collections, resource conversion and form patches remain covered. |
| Wizard | SUPPORTED | Spellbook, preparation, stored rolls, wards, spell modification and resolution overrides remain covered. |
| Sorcerer | SUPPORTED | Metamagic maps to spell modification, reroll, cost modification and cast-time/effective-level changes. |
| Ranger | SUPPORTED | Companion summons, Hunter's Mark modifications, runtime choices, transformation and mastery/effect patches are representable. |
| Psion | SUPPORTED | Psionic dice pools, conditional expenditure, spell modifications, persistent states and cantrip-for-attack replacement are representable. |
| Fighter | PARTIAL | Core Fighter and most maneuvers are covered; information-reveal mechanics need a typed inspection/reveal primitive. |
| Monk | PARTIAL | Core Focus/damage mitigation/rerolls are covered; special traversal permissions need broader movement semantics. |
| Paladin | PARTIAL | Channel Divinity, auras and smite-linked effects fit, but overlapping aura exclusivity/stacking needs a typed stacking policy. |
| Rogue | PARTIAL | Core Rogue is covered; Cunning Strike spends dice directly from a pending Sneak Attack damage pool, which needs a typed roll-dice cost primitive. Dynamic soul-trinket association also needs explicit entity-association state. |
| Warlock | PARTIAL | Pact Magic and spell modifications fit; repeatable invocations with distinct selections and prerequisite-dependent replacement locks need stronger selection/dependency policies. |
| Artificer | PARTIAL | Core spellcasting and many item interactions fit; Replicate Magic Item and Spell-Storing Item expose lifecycle/collection/attunement/granted-activity semantics not yet explicit enough. |

## Newly discovered canonical gaps

### RollDiceCostData
A feature may pay a cost by removing dice from another pending roll before resolution rather than spending a normal resource. Required by Rogue Cunning Strike/Devious Strikes.

Required semantics:
- source roll/activity or damage component;
- die count/formula removed;
- timing before roll resolution;
- multiple simultaneous option costs;
- maximum selected options;
- interaction with later scaling/patches.

### EffectStackingPolicyData
Effects such as Paladin auras can overlap while permitting only one benefit from an exclusivity group.

Required semantics:
- stacking group ID;
- stack/replace/highest/lowest/choose-one/no-stack policy;
- chooser (recipient/source/GM/system);
- scope and predicate.

### SelectionPolicyData
Repeatable options can require a different bound selection each time, and some selections cannot be replaced while another owned feature depends on them.

Required semantics:
- repeatable option;
- unique binding key;
- distinct-selection constraint;
- prerequisite/dependent-feature graph;
- replacement lock while dependents exist.

### AttunementCapacityData
Classes/features can change the maximum number of simultaneously attuned magic items.

Required semantics:
- base/add/set capacity;
- level-gated progression;
- predicates if future content restricts categories.

### CreatedEntityCollectionPolicyData
Artificer Replicate Magic Item creates a bounded collection of temporary real entities whose lifecycle depends on plans, creator death and collection overflow.

Required semantics:
- created-entity collection capacity;
- one-per-plan/distinct-plan constraints;
- overflow policy such as remove-oldest;
- invalidation when a source plan is replaced;
- delayed destruction after creator death;
- container-content ejection when a created container vanishes;
- relationship `createdByFeature` / `basedOnPlan`.

### EmbeddedEntityActivityData
Spell-Storing Item binds a selected spell effect to an arbitrary item and grants its use to the current holder.

Required semantics:
- host entity relation;
- selected spell/filter;
- granted activity to holder rather than creator;
- creator-derived spellcasting ability;
- shared use counter stored on the host;
- per-user/per-turn cooldown;
- concentration assigned to the user;
- replacement when the feature is used again.

### InformationRevealData
Some features reveal structured mechanical information rather than applying a modifier (for example Immunities, Resistances and Vulnerabilities).

Required semantics:
- subject/target;
- information domains;
- range/visibility requirements;
- partial/all reveal policy;
- duration or snapshot behavior.

### MovementPermission extensions
Movement permissions need explicit support for traversal such as moving across liquids or along vertical surfaces without falling during the movement, beyond ordinary climb speed.

### EntityAssociationStateData
Generated tokens/items can retain an association with a runtime entity (for example a soul trinket associated with the creature whose death created it).

Required semantics:
- host entity;
- associated runtime entity;
- creation trigger;
- relation metadata usable by later activities/invocations.

## Important non-gaps confirmed

The stress test confirms the existing model already handles several mechanics that initially looked unusual:

- Pact Magic can use `SpellSlotPoolData.kind = pact`.
- Metamagic is representable through `SpellModificationData`, `RerollRuleData`, `CostModificationData`, and runtime predicates.
- Psionic Energy Dice are representable as named `ResourceDicePoolData` instances, allowing class/subclass pools to remain separate.
- Companion stat blocks and command policies are representable with summon/created-entity mechanics plus behavior constraints.
- Replacement of one attack with a cantrip/spell is covered by `SpellActionReplacementData`.
- Features that restore another resource by spending spell slots are covered by cross-resource/resource-mutation rules.
- Temporary transformations and form-specific patches are already typed.

## Next regression target

After the newly discovered primitives are implemented, rerun this exact class set. The target is for every class above to reach `SUPPORTED` without weakening validators or adding raw/custom source containers merely to make a fixture pass.
