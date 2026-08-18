import type { ClassData, SubclassData } from "./progression.js";

export const wizardFixture = {
  hitDie: 6,
  primaryAbilities: ["int"],
  savingThrowProficiencies: ["int", "wis"],
  spellcasting: { type: "full", ability: "int", preparation: "spellbook" },
  mechanics: {
    spellCollections: [
      {
        id: "wizard-spellbook",
        kind: "spellbook",
        sourceList: "wizard",
        add: {
          trigger: { event: "custom", description: "wizard level gained" },
          count: { type: "constant", value: 2 },
          filter: { lists: ["wizard"] }
        },
        copyRules: [
          {
            sourceKind: "scroll",
            timePerSpellLevel: { value: 2, unit: "hour" },
            costPerSpellLevel: { amount: 50, currency: "gp" },
            filter: { lists: ["wizard"], minLevel: 1 }
          }
        ]
      }
    ],
    spellPreparation: [
      {
        collectionId: "wizard-spellbook",
        preparedCollectionId: "wizard-prepared",
        count: { type: "runtime", path: "class.wizard.preparedSpells" },
        refresh: "longRest",
        alwaysPreparedDontCount: true
      }
    ],
    storedRollPools: [
      {
        id: "portent",
        die: "d20",
        generate: {
          trigger: { event: "onRest", description: "finish Long Rest" },
          count: { type: "constant", value: 2 }
        },
        expires: { event: "onRest", description: "next Long Rest" },
        consumeOnUse: true
      }
    ]
  },
  advancement: []
} satisfies ClassData;

export const bardFixture = {
  hitDie: 8,
  primaryAbilities: ["cha"],
  savingThrowProficiencies: ["dex", "cha"],
  spellcasting: { type: "full", ability: "cha", preparation: "prepared" },
  mechanics: {
    dicePools: [
      {
        id: "bardic-inspiration",
        die: "d6",
        count: { type: "abilityModifier", ability: "cha" },
        progression: { 5: { die: "d8" }, 10: { die: "d10" }, 15: { die: "d12" } },
        recovery: [{ event: "onRest", description: "Long Rest" }],
        transferable: true,
        recipientCap: { type: "constant", value: 1 },
        expiration: { value: { type: "constant", value: 1 }, unit: "hour" }
      }
    ],
    transferableResources: [
      {
        resourceId: "bardic-inspiration",
        from: "self",
        to: "creature",
        amount: { type: "constant", value: 1 },
        range: { type: "constant", value: 60 },
        recipientCap: { type: "constant", value: 1 },
        consumeWhen: { event: "onFailedCheck", description: "failed D20 Test" }
      }
    ]
  },
  advancement: []
} satisfies ClassData;

export const clericFixture = {
  hitDie: 8,
  primaryAbilities: ["wis"],
  savingThrowProficiencies: ["wis", "cha"],
  spellcasting: { type: "full", ability: "wis", preparation: "prepared" },
  mechanics: {
    resourceAllocations: [
      {
        source: { type: "formula", formula: "5 * @classLevel" },
        unit: "hitPoints",
        targets: [
          {
            targetType: "creature",
            predicate: { type: "custom", description: "Bloodied creature within 30 feet" }
          }
        ],
        perTargetCap: { type: "runtime", path: "target.hitPoints.halfMaximum" }
      }
    ]
  },
  advancement: []
} satisfies ClassData;

export const druidFixture = {
  hitDie: 8,
  primaryAbilities: ["wis"],
  savingThrowProficiencies: ["int", "wis"],
  spellcasting: { type: "full", ability: "wis", preparation: "prepared" },
  mechanics: {
    transformations: [
      {
        id: "wild-shape",
        source: {
          type: "entityChoice",
          entityType: "monster",
          knownCollectionId: "wild-shape-known-forms",
          filter: {
            all: [
              { type: "creatureType", creatureTypes: ["beast"] },
              { type: "custom", description: "CR and fly-speed limits derive from Druid level" }
            ]
          }
        },
        duration: {
          value: { type: "formula", formula: "floor(@classLevel / 2)" },
          unit: "hour",
          endTriggers: [
            { event: "onDropToZero", description: "form ends by feature rule" },
            { event: "onDeath" }
          ]
        },
        statistics: {
          default: "replace",
          retain: [
            "personality", "memories", "speech", "creatureType", "hitPoints", "hitDice",
            "abilities.int", "abilities.wis", "abilities.cha", "classFeatures", "languages", "feats"
          ],
          mergeProficiencies: true,
          chooseHigherModifiers: ["skills", "savingThrows"]
        },
        creatureType: { mode: "retain" },
        equipment: {
          choices: ["drop", "merge", "wear"],
          practicalityRequiresGM: true,
          mergedItemsInactive: true
        },
        spellcasting: { allowed: false, concentrationUnaffected: true },
        tempHp: { type: "classLevel", classId: "druid" }
      }
    ]
  },
  advancement: []
} satisfies ClassData;

export const abjurerFixture = {
  parentClass: { canonicalId: "dnd2024:class:wizard", entityType: "class" },
  mechanics: {
    damageInterception: [
      {
        id: "arcane-ward",
        resourceId: "arcane-ward-hp",
        trigger: { event: "onDamageTaken" },
        target: "self",
        applyDefensesBeforeResource: true,
        overflowToTarget: true,
        canInterceptWhileEmpty: false
      }
    ]
  },
  advancement: []
} satisfies SubclassData;

export const classCompatibilityFixtures = [
  ["class", wizardFixture],
  ["class", bardFixture],
  ["class", clericFixture],
  ["class", druidFixture],
  ["subclass", abjurerFixture]
] as const;
