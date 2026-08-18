# Class Stress Test Regression — 2026-08-19

This report repeats the class/subclass compatibility audit after implementing the advanced class-rule primitives discovered in the first stress-test pass.

No supplied class content is imported or persisted by this audit. `SUPPORTED` means the canonical OracleRPG schema can represent the tested mechanics without relying on raw source JSON or using `custom` as an escape hatch for a mechanic that can be structured.

## Newly implemented primitives

- `RollDiceCostData`
- `EffectStackingPolicyData`
- `SelectionPolicyData`
- `AttunementCapacityData`
- `CreatedEntityCollectionPolicyData`
- `EmbeddedEntityActivityData`
- `InformationRevealData`
- expanded `MovementPermissionData`
- `EntityAssociationStateData`

These are exposed through `ClassRuleData` and validated by the canonical runtime validator.

## Regression of previously partial classes

### Fighter — SUPPORTED

Information-reveal mechanics can now explicitly reveal target immunities, resistances, vulnerabilities, and other selected canonical fields through `InformationRevealData`. Existing action, resource, reroll, mastery, companion, and generated-action mechanics remain covered by the shared class/mechanics layer.

### Monk — SUPPORTED

Acrobatic Movement is now represented without pretending it is a Climb Speed. `MovementPermissionData` supports movement along vertical surfaces, movement across liquids, and suppression of falling during that movement, with armor/shield predicates. Focus, Martial Arts dice, Deflect Attacks, action replacement, rerolls, and subclass mechanics remain covered.

### Paladin — SUPPORTED

Aura of Protection overlap is represented through `EffectStackingPolicyData(policy: "chooseOne", chooser: "recipient")`. Existing auras, Channel Divinity, Lay on Hands, spell modifications, distributed pools, transformations, and subclass features remain covered.

### Rogue — SUPPORTED

Cunning Strike/Devious Strikes use `RollDiceCostData` to remove Sneak Attack dice before the roll and may combine multiple option costs when progression allows it. Phantom Soul Trinkets use `EntityAssociationStateData` to associate a created trinket with the creature whose death produced it. Existing outcome-dependent resource costs, psionic dice, spell modification, and reaction mechanics remain covered.

### Warlock — SUPPORTED

Eldritch Invocation acquisition and replacement use `SelectionPolicyData`, including repeatable options with unique selections and replacement blocking when the selected invocation is a prerequisite for another selected invocation. Pact Magic remains represented by a pact slot pool; pact boons, familiar/weapon relationships, spell modifications, autonomous effects, and patron subclasses remain covered.

### Artificer — SUPPORTED

Replicate Magic Item uses `CreatedEntityCollectionPolicyData` for active-item caps, distinct-plan constraints, removal of the oldest item when exceeding the cap, removal when a source plan is replaced, and container-content preservation. Attunement progression uses `AttunementCapacityData`. Spell-Storing Item uses `EmbeddedEntityActivityData` to grant the stored spell activity to the holder while retaining the creator's spellcasting parameters and transferring concentration responsibility to the user. Existing companions, created entities, magic-item mutation, spell modification, and subclass constructs remain covered.

## Full class regression status

| Class | Status |
|---|---|
| Artificer | SUPPORTED |
| Barbarian | SUPPORTED |
| Bard | SUPPORTED |
| Cleric | SUPPORTED |
| Druid | SUPPORTED |
| Fighter | SUPPORTED |
| Monk | SUPPORTED |
| Paladin | SUPPORTED |
| Psion | SUPPORTED |
| Ranger | SUPPORTED |
| Rogue | SUPPORTED |
| Sorcerer | SUPPORTED |
| Warlock | SUPPORTED |
| Wizard | SUPPORTED |

## Executable regression coverage

`compatibility-fixtures.ts` now includes focused typed fixtures for Wizard, Bard, Cleric, Druid, Fighter, Monk, Paladin, Rogue, Warlock, Artificer, and Abjurer. The runtime test iterates these fixtures through `validateCanonicalContent` and also contains negative validation tests for malformed advanced class-rule structures.

## Meaning of SUPPORTED

SUPPORTED means the schema has typed structures capable of preserving the mechanics and relationships encountered in the audited files.

It does **not** mean that:

- a 5etools parser has been implemented;
- records have been imported into a compendium;
- persistence/database storage exists;
- all mechanics have runtime automation;
- UI exists for configuring or executing all mechanics.

Those are later implementation layers built on top of the canonical data contract.
