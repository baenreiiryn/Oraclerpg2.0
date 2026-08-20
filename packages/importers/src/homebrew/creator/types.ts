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
