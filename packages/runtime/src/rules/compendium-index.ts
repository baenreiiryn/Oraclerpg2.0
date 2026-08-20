import type { OracleEntity } from "@oraclerpg/core";
import type { ActivityData } from "@oraclerpg/schema";
import type { CompendiumLookupPort, RulesCompendiumKind, RulesCompendiumRecord } from "./types.js";

export class OracleEntityCompendiumIndex implements CompendiumLookupPort {
  private readonly byCanonicalId = new Map<string, RulesCompendiumRecord>();

  constructor(entities: readonly OracleEntity<unknown>[]) {
    for (const entity of entities) {
      const data = isRecord(entity.data) ? entity.data : {};
      this.byCanonicalId.set(entity.canonicalId, {
        canonicalId: entity.canonicalId,
        entityType: entity.entityType,
        kind: inferKind(data),
        name: entity.name,
        activities: extractActivities(data),
        data,
      });
    }
  }

  async getByCanonicalId(canonicalId: string): Promise<RulesCompendiumRecord | undefined> {
    return this.byCanonicalId.get(canonicalId);
  }
}

function inferKind(data: Readonly<Record<string, unknown>>): RulesCompendiumKind {
  if (typeof data.featureKind === "string") return "feature";
  if (typeof data.level === "number" && typeof data.school === "string") return "spell";
  if (typeof data.itemKind === "string") return "item";
  return "other";
}

function extractActivities(data: Readonly<Record<string, unknown>>): readonly ActivityData[] {
  if (!Array.isArray(data.activities)) return [];
  return data.activities.filter(isActivityData);
}

function isActivityData(value: unknown): value is ActivityData {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string" && typeof value.kind === "string";
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
