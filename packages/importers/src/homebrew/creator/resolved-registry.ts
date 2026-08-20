import type { CanonicalContentType } from "@oraclerpg/schema";
import { HOME_BREW_CREATOR_FORMS } from "./registry.js";
import type { CreatorFieldDefinition, CreatorFormDefinition, CreatorSubformId } from "./types.js";

const PATH_SUBFORMS: Readonly<Record<string, CreatorSubformId>> = {
  weight: "weight",
  price: "price",
  uses: "uses",
  activity: "activity",
  activities: "activity",
  actions: "activity",
  bonusActions: "activity",
  reactions: "activity",
  legendaryActions: "activity",
  lairActions: "activity",
  grants: "grant",
  startingEquipment: "grant",
  equipment: "grant",
  advancement: "advancement",
  effects: "effect",
  modifiers: "modifier",
  states: "stateVariable",
  triggers: "trigger",
  predicates: "predicate",
  castingTimes: "spellCastingTime",
  range: "spellRange",
  durations: "spellDuration",
  components: "spellComponents",
  compartments: "containerCompartment",
  contents: "itemStack",
  armorClass: "monsterArmorClass",
  movement: "monsterMovement",
  senses: "monsterSense",
  savingThrows: "monsterProficiency",
  skills: "monsterProficiency",
  stations: "vehicleStation",
};

const TYPE_PATH_OVERRIDES: Readonly<Record<string, CreatorSubformId>> = {
  "item.range": "activityRange",
  "item.damage": "damagePart",
  "monster.armorClass": "monsterArmorClass",
  "monster.movement": "monsterMovement",
  "monster.senses": "monsterSense",
  "monster.savingThrows": "monsterProficiency",
  "monster.skills": "monsterProficiency",
  "vehicle.stations": "vehicleStation",
  "spell.range": "spellRange",
};

function resolveField(type: CanonicalContentType, field: CreatorFieldDefinition): CreatorFieldDefinition {
  if (field.subformId) return field;
  const subformId = TYPE_PATH_OVERRIDES[`${type}.${field.path}`] ?? PATH_SUBFORMS[field.path];
  if (!subformId) return field;

  const isCollection = field.kind === "collection" || field.kind === "referenceList" || [
    "activities", "actions", "bonusActions", "reactions", "legendaryActions", "lairActions",
    "grants", "startingEquipment", "equipment", "advancement", "effects", "modifiers", "states",
    "triggers", "predicates", "castingTimes", "durations", "compartments", "contents", "armorClass",
    "movement", "senses", "savingThrows", "skills", "stations",
  ].includes(field.path);

  return {
    ...field,
    kind: isCollection ? "subformCollection" : "subform",
    subformId,
  };
}

export function getResolvedHomebrewCreatorForm(type: CanonicalContentType): CreatorFormDefinition {
  const form = HOME_BREW_CREATOR_FORMS[type];
  return {
    ...form,
    sections: form.sections.map((section) => ({
      ...section,
      fields: section.fields.map((field) => resolveField(type, field)),
    })),
  };
}

export function listResolvedHomebrewCreatorForms(): readonly CreatorFormDefinition[] {
  return (Object.keys(HOME_BREW_CREATOR_FORMS) as CanonicalContentType[]).map(getResolvedHomebrewCreatorForm);
}
