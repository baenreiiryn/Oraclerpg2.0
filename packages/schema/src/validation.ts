import {
  ABILITY_IDS, ACTIVITY_KIND_IDS, CONTENT_TYPE_IDS, CREATURE_TYPE_IDS,
  DAMAGE_TYPE_IDS, FEATURE_KIND_IDS, ITEM_KIND_IDS, MOVEMENT_TYPE_IDS, SIZE_IDS
} from "./enums.js";

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export interface ValidationResult<T = unknown> {
  ok: boolean;
  value?: T;
  issues: ValidationIssue[];
}

const hasOwn = (value: object, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const inEnum = <T extends readonly string[]>(value: unknown, values: T): value is T[number] => typeof value === "string" && values.includes(value);

function issue(issues: ValidationIssue[], path: string, code: string, message: string): void {
  issues.push({ path, code, message });
}

function validateEntityRef(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isObject(value)) return issue(issues, path, "type", "Expected entity reference object");
  if (!isNonEmptyString(value.canonicalId)) issue(issues, `${path}.canonicalId`, "required", "canonicalId is required");
}

function validateRuntimeValue(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isObject(value)) return issue(issues, path, "type", "Expected RuntimeValueRef object");
  if (!isNonEmptyString(value.type)) return issue(issues, `${path}.type`, "required", "RuntimeValueRef.type is required");
  switch (value.type) {
    case "constant":
      if (!hasOwn(value, "value")) issue(issues, `${path}.value`, "required", "constant runtime value requires value");
      break;
    case "formula":
      if (!isNonEmptyString(value.formula)) issue(issues, `${path}.formula`, "required", "formula runtime value requires formula");
      break;
    case "abilityScore":
    case "abilityModifier":
      if (!inEnum(value.ability, ABILITY_IDS)) issue(issues, `${path}.ability`, "enum", "Unknown ability id");
      break;
    case "state":
      if (!isNonEmptyString(value.stateId)) issue(issues, `${path}.stateId`, "required", "state runtime value requires stateId");
      break;
    case "runtime":
      if (!isNonEmptyString(value.path)) issue(issues, `${path}.path`, "required", "runtime reference requires a path");
      break;
  }
}

function validatePredicate(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isObject(value) || !isNonEmptyString(value.type)) issue(issues, path, "predicate", "Predicate requires a type");
}

function validateActivity(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isObject(value)) return issue(issues, path, "type", "Expected activity object");
  if (!isNonEmptyString(value.id)) issue(issues, `${path}.id`, "required", "Activity id is required");
  if (!isNonEmptyString(value.name)) issue(issues, `${path}.name`, "required", "Activity name is required");
  if (!inEnum(value.kind, ACTIVITY_KIND_IDS)) issue(issues, `${path}.kind`, "enum", "Unknown activity kind");
  if (isObject(value.target) && Array.isArray(value.target.restrictions)) {
    value.target.restrictions.forEach((predicate, index) => validatePredicate(predicate, `${path}.target.restrictions[${index}]`, issues));
  }
  if (Array.isArray(value.damage)) {
    value.damage.forEach((part, index) => {
      if (!isObject(part)) return issue(issues, `${path}.damage[${index}]`, "type", "Damage part must be an object");
      if (part.damageType !== undefined && !inEnum(part.damageType, DAMAGE_TYPE_IDS)) issue(issues, `${path}.damage[${index}].damageType`, "enum", "Unknown damage type");
      if (!isNonEmptyString(part.formula) && !isObject(part.value)) issue(issues, `${path}.damage[${index}]`, "required", "Damage part requires formula or runtime value");
    });
  }
}

function validateClassMechanics(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isObject(value)) return issue(issues, path, "type", "Expected class mechanics object");
  if (Array.isArray(value.spellCollections)) {
    value.spellCollections.forEach((collection, index) => {
      if (!isObject(collection)) return issue(issues, `${path}.spellCollections[${index}]`, "type", "Spell collection must be an object");
      if (!isNonEmptyString(collection.id)) issue(issues, `${path}.spellCollections[${index}].id`, "required", "Spell collection id is required");
      if (!isNonEmptyString(collection.kind)) issue(issues, `${path}.spellCollections[${index}].kind`, "required", "Spell collection kind is required");
    });
  }
  if (Array.isArray(value.transformations)) {
    value.transformations.forEach((transformation, index) => {
      if (!isObject(transformation)) return issue(issues, `${path}.transformations[${index}]`, "type", "Transformation must be an object");
      if (!isNonEmptyString(transformation.id)) issue(issues, `${path}.transformations[${index}].id`, "required", "Transformation id is required");
      const source = transformation.source;
      if (isObject(source) && source.type === "fixedEntities" && Array.isArray(source.entities)) {
        source.entities.forEach((ref, refIndex) => validateEntityRef(ref, `${path}.transformations[${index}].source.entities[${refIndex}]`, issues));
      }
    });
  }
  if (Array.isArray(value.storedRollPools)) {
    value.storedRollPools.forEach((pool, index) => {
      if (!isObject(pool)) return issue(issues, `${path}.storedRollPools[${index}]`, "type", "Stored roll pool must be an object");
      if (!isNonEmptyString(pool.id)) issue(issues, `${path}.storedRollPools[${index}].id`, "required", "Stored roll pool id is required");
    });
  }
}

function validateClassRules(value: unknown, path: string, issues: ValidationIssue[]): void {
  if (!isObject(value)) return issue(issues, path, "type", "Expected class rules object");

  if (Array.isArray(value.rollDiceCosts)) value.rollDiceCosts.forEach((entry, index) => {
    const p = `${path}.rollDiceCosts[${index}]`;
    if (!isObject(entry)) return issue(issues, p, "type", "Roll dice cost must be an object");
    if (!isNonEmptyString(entry.sourceRoll)) issue(issues, `${p}.sourceRoll`, "required", "sourceRoll is required");
    validateRuntimeValue(entry.dice, `${p}.dice`, issues);
  });

  if (Array.isArray(value.effectStackingPolicies)) value.effectStackingPolicies.forEach((entry, index) => {
    const p = `${path}.effectStackingPolicies[${index}]`;
    if (!isObject(entry)) return issue(issues, p, "type", "Stacking policy must be an object");
    if (!isNonEmptyString(entry.key)) issue(issues, `${p}.key`, "required", "stacking key is required");
    if (!["stack","noStack","highest","lowest","replace","chooseOne"].includes(String(entry.policy))) issue(issues, `${p}.policy`, "enum", "Unknown stacking policy");
  });

  if (Array.isArray(value.selectionPolicies)) value.selectionPolicies.forEach((entry, index) => {
    const p = `${path}.selectionPolicies[${index}]`;
    if (!isObject(entry)) return issue(issues, p, "type", "Selection policy must be an object");
    if (!isNonEmptyString(entry.collectionId)) issue(issues, `${p}.collectionId`, "required", "collectionId is required");
  });

  if (Array.isArray(value.attunementCapacity)) value.attunementCapacity.forEach((entry, index) => {
    const p = `${path}.attunementCapacity[${index}]`;
    if (!isObject(entry)) return issue(issues, p, "type", "Attunement capacity must be an object");
    validateRuntimeValue(entry.maximum, `${p}.maximum`, issues);
  });

  if (Array.isArray(value.createdEntityCollections)) value.createdEntityCollections.forEach((entry, index) => {
    const p = `${path}.createdEntityCollections[${index}]`;
    if (!isObject(entry)) return issue(issues, p, "type", "Created entity collection policy must be an object");
    if (!isNonEmptyString(entry.collectionId)) issue(issues, `${p}.collectionId`, "required", "collectionId is required");
    if (!isNonEmptyString(entry.entityType)) issue(issues, `${p}.entityType`, "required", "entityType is required");
    validateRuntimeValue(entry.maximumActive, `${p}.maximumActive`, issues);
  });

  if (Array.isArray(value.embeddedEntityActivities)) value.embeddedEntityActivities.forEach((entry, index) => {
    const p = `${path}.embeddedEntityActivities[${index}]`;
    if (!isObject(entry)) return issue(issues, p, "type", "Embedded entity activity must be an object");
    validatePredicate(entry.hostPredicate, `${p}.hostPredicate`, issues);
    if (!isNonEmptyString(entry.grantedTo)) issue(issues, `${p}.grantedTo`, "required", "grantedTo is required");
  });

  if (Array.isArray(value.informationReveals)) value.informationReveals.forEach((entry, index) => {
    const p = `${path}.informationReveals[${index}]`;
    if (!isObject(entry)) return issue(issues, p, "type", "Information reveal must be an object");
    if (!Array.isArray(entry.fields) || entry.fields.length === 0) issue(issues, `${p}.fields`, "required", "At least one revealed field is required");
    if (!isObject(entry.trigger)) issue(issues, `${p}.trigger`, "required", "trigger is required");
  });

  if (Array.isArray(value.movementPermissions)) value.movementPermissions.forEach((entry, index) => {
    const p = `${path}.movementPermissions[${index}]`;
    if (!isObject(entry)) return issue(issues, p, "type", "Movement permission must be an object");
    if (!Array.isArray(entry.permissions) || entry.permissions.length === 0) issue(issues, `${p}.permissions`, "required", "Movement permissions cannot be empty");
  });

  if (Array.isArray(value.entityAssociations)) value.entityAssociations.forEach((entry, index) => {
    const p = `${path}.entityAssociations[${index}]`;
    if (!isObject(entry)) return issue(issues, p, "type", "Entity association must be an object");
    if (!isNonEmptyString(entry.collectionId)) issue(issues, `${p}.collectionId`, "required", "collectionId is required");
    if (!isNonEmptyString(entry.associationId)) issue(issues, `${p}.associationId`, "required", "associationId is required");
    if (!isObject(entry.associateOn)) issue(issues, `${p}.associateOn`, "required", "associateOn trigger is required");
  });
}

export function validateCanonicalContent(type: unknown, data: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!inEnum(type, CONTENT_TYPE_IDS)) {
    issue(issues, "type", "enum", "Unknown canonical content type");
    return { ok: false, issues };
  }
  if (!isObject(data)) {
    issue(issues, "data", "type", "Canonical content data must be an object");
    return { ok: false, issues };
  }

  switch (type) {
    case "monster": {
      if (!inEnum(data.creatureType, CREATURE_TYPE_IDS)) issue(issues, "data.creatureType", "enum", "Unknown creature type");
      if (!inEnum(data.size, SIZE_IDS)) issue(issues, "data.size", "enum", "Unknown size");
      if (!Array.isArray(data.armorClass)) issue(issues, "data.armorClass", "required", "Monster armorClass must be an array");
      if (!Array.isArray(data.movement)) issue(issues, "data.movement", "required", "Monster movement must be an array");
      else data.movement.forEach((move, index) => {
        if (!isObject(move) || !inEnum(move.type, MOVEMENT_TYPE_IDS)) issue(issues, `data.movement[${index}].type`, "enum", "Unknown movement type");
      });
      break;
    }
    case "item": {
      if (!inEnum(data.itemKind, ITEM_KIND_IDS)) issue(issues, "data.itemKind", "enum", "Unknown item kind");
      if (Array.isArray(data.activities)) data.activities.forEach((activity, index) => validateActivity(activity, `data.activities[${index}]`, issues));
      break;
    }
    case "feature": {
      if (!inEnum(data.featureKind, FEATURE_KIND_IDS)) issue(issues, "data.featureKind", "enum", "Unknown feature kind");
      if (Array.isArray(data.activities)) data.activities.forEach((activity, index) => validateActivity(activity, `data.activities[${index}]`, issues));
      if (data.classMechanics !== undefined) validateClassMechanics(data.classMechanics, "data.classMechanics", issues);
      if (data.classRules !== undefined) validateClassRules(data.classRules, "data.classRules", issues);
      break;
    }
    case "class":
    case "subclass": {
      if (!Array.isArray(data.advancement)) issue(issues, "data.advancement", "required", `${type} advancement must be an array`);
      if (data.mechanics !== undefined) validateClassMechanics(data.mechanics, "data.mechanics", issues);
      if (data.classRules !== undefined) validateClassRules(data.classRules, "data.classRules", issues);
      break;
    }
    case "species": {
      if (!Array.isArray(data.size) || data.size.some((size) => !inEnum(size, SIZE_IDS))) issue(issues, "data.size", "enum", "Species size must contain canonical sizes");
      if (!isFiniteNumber(data.speed)) issue(issues, "data.speed", "type", "Species speed must be numeric");
      break;
    }
    case "spell": {
      if (!isFiniteNumber(data.level)) issue(issues, "data.level", "type", "Spell level must be numeric");
      if (!isNonEmptyString(data.school)) issue(issues, "data.school", "required", "Spell school is required");
      if (Array.isArray(data.activities)) data.activities.forEach((activity, index) => validateActivity(activity, `data.activities[${index}]`, issues));
      break;
    }
    case "vehicle": {
      if (!isFiniteNumber(data.armorClass)) issue(issues, "data.armorClass", "type", "Vehicle armorClass must be numeric");
      if (!isObject(data.hitPoints)) issue(issues, "data.hitPoints", "required", "Vehicle hitPoints are required");
      break;
    }
  }

  return { ok: issues.length === 0, value: issues.length === 0 ? data : undefined, issues };
}

export function assertCanonicalContent(type: unknown, data: unknown): void {
  const result = validateCanonicalContent(type, data);
  if (!result.ok) {
    const message = result.issues.map((it) => `${it.path}: ${it.message}`).join("\n");
    throw new Error(`Canonical schema validation failed:\n${message}`);
  }
}

export { validateRuntimeValue };
