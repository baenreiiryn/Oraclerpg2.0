import type { CanonicalContentType } from "./content.js";
import type { JsonValue } from "./primitives.js";
import { assertCanonicalContent } from "./validation.js";

export interface VersionedCanonicalRecord {
  schemaVersion: number;
  type: CanonicalContentType;
  data: JsonValue;
}

export interface SchemaMigration {
  fromVersion: number;
  toVersion: number;
  migrate(record: VersionedCanonicalRecord): VersionedCanonicalRecord;
}

const migrations = new Map<number, SchemaMigration>();

export function registerSchemaMigration(migration: SchemaMigration): void {
  if (migration.toVersion !== migration.fromVersion + 1) {
    throw new Error("Schema migrations must advance exactly one version");
  }
  if (migrations.has(migration.fromVersion)) {
    throw new Error(`A schema migration from version ${migration.fromVersion} is already registered`);
  }
  migrations.set(migration.fromVersion, migration);
}

export function migrateCanonicalRecord(
  record: VersionedCanonicalRecord,
  targetVersion: number
): VersionedCanonicalRecord {
  if (targetVersion < record.schemaVersion) {
    throw new Error("Canonical schema downgrades are not supported");
  }

  let current = record;
  while (current.schemaVersion < targetVersion) {
    const migration = migrations.get(current.schemaVersion);
    if (!migration) {
      throw new Error(`Missing schema migration from version ${current.schemaVersion}`);
    }
    current = migration.migrate(current);
    if (current.schemaVersion !== migration.toVersion) {
      throw new Error(`Migration ${migration.fromVersion}->${migration.toVersion} returned an invalid version`);
    }
  }

  assertCanonicalContent(current.type, current.data);
  return current;
}

export function clearRegisteredSchemaMigrationsForTests(): void {
  migrations.clear();
}
