const FORBIDDEN_PATH_SEGMENTS = new Set([
  "id",
  "canonicalId",
  "entityType",
  "system",
  "source",
  "provenance",
  "schemaVersion",
  "formula",
  "mode",
  "target",
  "predicate",
  "predicates",
  "triggers",
  "usage",
  "recovery",
  "modifiers",
  "prerequisites"
]);

/**
 * Presentation-only localization overlay.
 *
 * Canonical entities are never mutated. Translation entries are keyed by
 * canonicalId and JSON-like display paths (for example `name` or
 * `data.text.rules.1.name`). Any path containing an engine/mechanics field is
 * rejected. This lets the UI localize labels and prose without changing IDs,
 * formulas, enum values, relationships or action behavior.
 */
export function localizeEntity(entity, catalog) {
  if (!entity || typeof entity !== "object") return entity;
  const canonicalId = entity.canonicalId ?? entity.id;
  const overlay = catalog?.entries?.[canonicalId];
  if (!overlay) return structuredClone(entity);

  const localized = structuredClone(entity);
  for (const [path, translatedValue] of Object.entries(overlay)) {
    if (typeof translatedValue !== "string" || !isPresentationPath(path)) continue;
    setPath(localized, path, translatedValue);
  }
  return localized;
}

export function localizeEntities(entities, catalog) {
  return entities.map((entity) => localizeEntity(entity, catalog));
}

export function isPresentationPath(path) {
  if (typeof path !== "string" || path.length === 0) return false;

  // Target restriction descriptions are explanatory UI copy only. The
  // restriction type/value remains canonical and cannot be localized.
  if (/^data\.activities\.\d+\.target\.restrictions\.\d+\.description$/.test(path)) return true;

  const segments = path.split(".");
  if (segments.some((segment) => FORBIDDEN_PATH_SEGMENTS.has(segment))) return false;

  const leaf = segments.at(-1);
  if (/^\d+$/.test(leaf)) {
    // Array text nodes are allowed only below known presentation containers.
    return segments.includes("text") || segments.includes("entries") || segments.includes("description") || segments.includes("summary");
  }

  return new Set(["name", "summary", "description", "label", "title", "caption"]).has(leaf);
}

function setPath(root, path, value) {
  const parts = path.split(".");
  let cursor = root;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = /^\d+$/.test(parts[index]) ? Number(parts[index]) : parts[index];
    if (cursor == null || typeof cursor !== "object" || !(key in cursor)) return;
    cursor = cursor[key];
  }
  const finalRaw = parts.at(-1);
  const finalKey = /^\d+$/.test(finalRaw) ? Number(finalRaw) : finalRaw;

  // Localization overlays contain strings only. Never let a stale or malformed
  // presentation path replace an object/array (for example a structured rules
  // entry) with text. Missing and non-string leaves are safely ignored.
  if (
    cursor != null &&
    typeof cursor === "object" &&
    finalKey in cursor &&
    typeof cursor[finalKey] === "string"
  ) {
    cursor[finalKey] = value;
  }
}
