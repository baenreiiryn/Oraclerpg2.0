import type { CanonicalContentType } from "@oraclerpg/schema";

export type CreatorFieldKind =
  | "text"
  | "textarea"
  | "number"
  | "boolean"
  | "select"
  | "multiselect"
  | "reference"
  | "referenceList"
  | "object"
  | "collection"
  | "subform"
  | "subformCollection"
  | "richEntries"
  | "json";

export interface CreatorFieldCondition {
  path: string;
  equals?: string | number | boolean;
  oneOf?: readonly (string | number | boolean)[];
}

export interface CreatorFieldDefinition {
  id: string;
  path: string;
  label: string;
  kind: CreatorFieldKind;
  required?: boolean;
  description?: string;
  options?: readonly string[];
  min?: number;
  max?: number;
  step?: number;
  referenceTypes?: readonly CanonicalContentType[];
  itemSchema?: readonly CreatorFieldDefinition[];
  subformId?: CreatorSubformId;
  condition?: CreatorFieldCondition;
  advanced?: boolean;
}

export interface CreatorSectionDefinition {
  id: string;
  label: string;
  description?: string;
  fields: readonly CreatorFieldDefinition[];
  condition?: CreatorFieldCondition;
}

export interface CreatorFormDefinition {
  type: CanonicalContentType;
  label: string;
  description: string;
  sections: readonly CreatorSectionDefinition[];
}

export type CreatorSubformId =
  | "entityRef"
  | "choice"
  | "activity"
  | "activityActivation"
  | "activityRange"
  | "activityTarget"
  | "attack"
  | "save"
  | "check"
  | "damagePart"
  | "healingPart"
  | "duration"
  | "uses"
  | "resourceCost"
  | "scaling"
  | "grant"
  | "advancement"
  | "predicate"
  | "trigger"
  | "effect"
  | "modifier"
  | "stateVariable"
  | "spellCastingTime"
  | "spellRange"
  | "spellDuration"
  | "spellComponents"
  | "weight"
  | "price"
  | "itemStack"
  | "containerCompartment"
  | "monsterArmorClass"
  | "monsterMovement"
  | "monsterSense"
  | "monsterProficiency"
  | "vehicleStation";

export interface CreatorSubformDefinition {
  id: CreatorSubformId;
  label: string;
  description?: string;
  fields: readonly CreatorFieldDefinition[];
}

export interface HomebrewCreatorDraft {
  type: CanonicalContentType;
  name: string;
  sourceId?: string;
  systemId?: string;
  data: unknown;
}

export interface HomebrewCreatorValidationIssue {
  severity: "error" | "warning" | "info";
  path?: string;
  code: string;
  message: string;
}
