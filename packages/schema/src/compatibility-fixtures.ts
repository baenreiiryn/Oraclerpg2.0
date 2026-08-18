import type { ClassData, SubclassData } from "./progression.js";

export const wizardFixture = {
  hitDie: 6,
  primaryAbilities: ["int"],
  savingThrowProficiencies: ["int", "wis"],
  spellcasting: { type: "full", ability: "int", preparation: "spellbook" },
  mechanics: {
    spellCollections: [{ id: "wizard-spellbook", kind: "spellbook", sourceList: "wizard", add: { trigger: { event: "custom", description: "wizard level gained" }, count: { type: "constant", value: 2 }, filter: { lists: ["wizard"] } }, copyRules: [{ sourceKind: "scroll", timePerSpellLevel: { value: 2, unit: "hour" }, costPerSpellLevel: { amount: 50, currency: "gp" }, filter: { lists: ["wizard"], minLevel: 1 } }] }],
    spellPreparation: [{ collectionId: "wizard-spellbook", preparedCollectionId: "wizard-prepared", count: { type: "runtime", path: "class.wizard.preparedSpells" }, refresh: "longRest", alwaysPreparedDontCount: true }],
    storedRollPools: [{ id: "portent", die: "d20", generate: { trigger: { event: "onRest", description: "finish Long Rest" }, count: { type: "constant", value: 2 } }, expires: { event: "onRest", description: "next Long Rest" }, consumeOnUse: true }]
  },
  advancement: []
} satisfies ClassData;

export const bardFixture = {
  hitDie: 8,
  primaryAbilities: ["cha"],
  savingThrowProficiencies: ["dex", "cha"],
  spellcasting: { type: "full", ability: "cha", preparation: "prepared" },
  mechanics: {
    dicePools: [{ id: "bardic-inspiration", die: "d6", count: { type: "abilityModifier", ability: "cha" }, progression: { 5: { die: "d8" }, 10: { die: "d10" }, 15: { die: "d12" } }, recovery: [{ event: "onRest", description: "Long Rest" }], transferable: true, recipientCap: { type: "constant", value: 1 }, expiration: { value: { type: "constant", value: 1 }, unit: "hour" } }],
    transferableResources: [{ resourceId: "bardic-inspiration", from: "self", to: "creature", amount: { type: "constant", value: 1 }, range: { type: "constant", value: 60 }, recipientCap: { type: "constant", value: 1 }, consumeWhen: { event: "onFailedCheck", description: "failed D20 Test" } }]
  },
  advancement: []
} satisfies ClassData;

export const clericFixture = {
  hitDie: 8,
  primaryAbilities: ["wis"],
  savingThrowProficiencies: ["wis", "cha"],
  spellcasting: { type: "full", ability: "wis", preparation: "prepared" },
  mechanics: { resourceAllocations: [{ source: { type: "formula", formula: "5 * @classLevel" }, unit: "hitPoints", targets: [{ targetType: "creature", predicate: { type: "comparison", left: { type: "runtime", path: "target.hp" }, operator: "lte", right: { type: "runtime", path: "target.halfMaxHp" } } }], perTargetCap: { type: "runtime", path: "target.hitPoints.halfMaximum" } }] },
  advancement: []
} satisfies ClassData;

export const druidFixture = {
  hitDie: 8,
  primaryAbilities: ["wis"],
  savingThrowProficiencies: ["int", "wis"],
  spellcasting: { type: "full", ability: "wis", preparation: "prepared" },
  mechanics: { transformations: [{ id: "wild-shape", source: { type: "entityChoice", entityType: "monster", knownCollectionId: "wild-shape-known-forms", filter: { type: "creatureType", creatureTypes: ["beast"] } }, duration: { value: { type: "formula", formula: "floor(@classLevel / 2)" }, unit: "hour", endTriggers: [{ event: "onDropToZero" }, { event: "onDeath" }] }, statistics: { default: "replace", retain: ["personality", "memories", "speech", "creatureType", "hitPoints", "hitDice", "abilities.int", "abilities.wis", "abilities.cha", "classFeatures", "languages", "feats"], mergeProficiencies: true, chooseHigherModifiers: ["skills", "savingThrows"] }, creatureType: { mode: "retain" }, equipment: { choices: ["drop", "merge", "wear"], practicalityRequiresGM: true, mergedItemsInactive: true }, spellcasting: { allowed: false, concentrationUnaffected: true }, tempHp: { type: "classLevel", classId: "druid" } }] },
  advancement: []
} satisfies ClassData;

export const fighterFixture = {
  hitDie: 10,
  primaryAbilities: ["str", "dex"],
  savingThrowProficiencies: ["str", "con"],
  classRules: {
    informationReveals: [{ trigger: { event: "onActivate" }, targetPredicate: { type: "distance", distance: { value: 30, unit: "ft" } }, fields: ["damageImmunities", "damageResistances", "damageVulnerabilities"], revealMode: "exact" }]
  },
  advancement: []
} satisfies ClassData;

export const monkFixture = {
  hitDie: 8,
  primaryAbilities: ["dex", "wis"],
  savingThrowProficiencies: ["str", "dex"],
  classRules: {
    movementPermissions: [{ subject: "self", permissions: ["moveOnVerticalSurface", "moveAcrossLiquid", "ignoreFallingDuringMovement"], predicate: { type: "not", predicate: { type: "wearingArmor" } } }]
  },
  advancement: []
} satisfies ClassData;

export const paladinFixture = {
  hitDie: 10,
  primaryAbilities: ["str", "cha"],
  savingThrowProficiencies: ["wis", "cha"],
  spellcasting: { type: "half", ability: "cha", preparation: "prepared" },
  classRules: {
    effectStackingPolicies: [{ key: "paladin-aura-of-protection", policy: "chooseOne", chooser: "recipient", comparisonValue: { type: "abilityModifier", ability: "cha", subject: "source" } }]
  },
  advancement: []
} satisfies ClassData;

export const rogueFixture = {
  hitDie: 8,
  primaryAbilities: ["dex"],
  savingThrowProficiencies: ["dex", "int"],
  classRules: {
    rollDiceCosts: [{ sourceRoll: "sneakAttack", die: "d6", dice: { type: "constant", value: 1 }, timing: "beforeRoll", maximumEffects: { type: "runtime", path: "class.rogue.cunningStrike.maxEffects" }, combineCosts: true }],
    entityAssociations: [{ collectionId: "soul-trinkets", associationId: "departed-creature", associateOn: { event: "onDeath", actor: "enemy" }, sourceEntity: "triggerSource", cardinality: "oneToOne", preservedWhileEntityExists: true }]
  },
  advancement: []
} satisfies ClassData;

export const warlockFixture = {
  hitDie: 8,
  primaryAbilities: ["cha"],
  savingThrowProficiencies: ["wis", "cha"],
  spellcasting: { type: "pact", ability: "cha", preparation: "prepared" },
  classRules: {
    selectionPolicies: [{ collectionId: "eldritch-invocations", repeatable: true, uniqueBy: "option", replacement: { trigger: { event: "custom", description: "Warlock level gained" }, count: { type: "constant", value: 1 }, blockedIfReferencedBy: ["prerequisiteDependencies"] }, prerequisiteDependencies: [{ selectedEntityId: "invocation", blocksReplacementWhileRequired: true }] }]
  },
  advancement: []
} satisfies ClassData;

export const artificerFixture = {
  hitDie: 8,
  primaryAbilities: ["int"],
  savingThrowProficiencies: ["con", "int"],
  spellcasting: { type: "half", ability: "int", preparation: "prepared" },
  classRules: {
    attunementCapacity: [{ target: "self", maximum: { type: "constant", value: 3 }, progression: [{ level: 10, maximum: { type: "constant", value: 4 } }, { level: 14, maximum: { type: "constant", value: 5 } }, { level: 18, maximum: { type: "constant", value: 6 } }] }],
    createdEntityCollections: [{ collectionId: "replicated-magic-items", entityType: "item", maximumActive: { type: "runtime", path: "class.artificer.maxReplicatedItems" }, requireDistinctSourceChoices: true, overflow: "removeOldest", onSourceSelectionReplaced: "removeCreatedEntity", onEntityRemoved: { preserveContainedEntities: true, containedEntityDestination: "sameSpace" } }],
    embeddedEntityActivities: [{ hostPredicate: { type: "holdingItem" }, embeddedEntity: { sourceCollectionId: "artificer-spell-storing-item", filter: { type: "and", all: [{ type: "hasTag", tags: ["artificer-spell"] }, { type: "comparison", left: { type: "runtime", path: "spell.level" }, operator: "lte", right: { type: "constant", value: 3 } }] } }, grantedTo: "holder", activation: "magicAction", uses: { type: "formula", formula: "max(2, 2 * @int.mod)" }, perCreatureCooldown: { event: "onTurnStart" }, usesSourceAbility: true, sourceAbility: "creatorSpellcasting", concentrationByUser: true }]
  },
  advancement: []
} satisfies ClassData;

export const abjurerFixture = {
  parentClass: { canonicalId: "dnd2024:class:wizard", entityType: "class" },
  mechanics: { damageInterception: [{ id: "arcane-ward", resourceId: "arcane-ward-hp", trigger: { event: "onDamageTaken" }, target: "self", applyDefensesBeforeResource: true, overflowToTarget: true, canInterceptWhileEmpty: false }] },
  advancement: []
} satisfies SubclassData;

export const classCompatibilityFixtures = [
  ["class", wizardFixture], ["class", bardFixture], ["class", clericFixture], ["class", druidFixture],
  ["class", fighterFixture], ["class", monkFixture], ["class", paladinFixture], ["class", rogueFixture],
  ["class", warlockFixture], ["class", artificerFixture], ["subclass", abjurerFixture]
] as const;
