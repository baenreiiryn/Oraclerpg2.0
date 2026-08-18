# Canonical Data Contract

This document defines the initial envelope shared by canonical OracleRPG compendium entities. Domain-specific schemas will extend this contract.

## Canonical entity envelope

```ts
export interface OracleEntity<TData = unknown> {
  id: string;
  canonicalId: string;
  entityType: string;
  name: string;

  system: {
    gameSystem: string;
    rulesVersion: string;
  };

  source: SourceRef;
  provenance: Provenance;

  schemaVersion: number;
  data: TData;

  relations: RelationRef[];
  metadata: EntityMetadata;
}
```

This is a contract sketch, not yet the final schema implementation.

## IDs

### `id`

Unique persisted OracleRPG record ID. It may differ between installations/import instances where necessary.

### `canonicalId`

Stable semantic identity used to relate the same canonical concept across imports and installations when such identity is known.

Canonical IDs:

- must not depend on localized names;
- must not change because display text changes;
- must not use an external source's transient database ID as the canonical truth;
- may include a namespace to avoid collisions between rules versions or distinct sources where two entities are not semantically identical.

Example shape (illustrative only):

```text
dnd2024:2024:monster:wolf:srd-5.2
```

The final canonical ID grammar will be locked in an ADR before content population.

## System identity

OracleRPG v1.00 targets the 2024 D&D rules. The canonical identity is:

```ts
interface SystemRef {
  gameSystem: "dnd2024" | string;
  rulesVersion: "2024" | string;
}
```

The default content authority for the open SRD package is `srd-5.2`.

`dnd5e` is not a canonical OracleRPG system ID. That identifier may appear only in provenance or documentation when referring to the external Foundry VTT D&D5e system/provider used as an architectural/import reference.

Rules version remains separate from `gameSystem` so the contract can evolve without conflating system identity, rules revision and content source.

## Source metadata

```ts
interface SourceRef {
  sourceId: string;
  book?: string;
  page?: number;
  license?: string;
  licenseUrl?: string;
}
```

`sourceId` identifies the content authority/package, for example `srd-5.2` or a private homebrew package.

## Import provenance

```ts
interface Provenance {
  origin: "oracle" | "import" | "user";
  provider?: string;
  sourceKey?: string;
  importedAt?: string;
  sourceHash?: string;
  adapterVersion?: string;
  mapperVersion?: string;
}
```

Content source and importer provider are different concepts. For example, an SRD 5.2 record may be imported through a 5etools adapter while its authoritative content source remains `srd-5.2`.

## Relationships

```ts
interface RelationRef {
  type: string;
  targetCanonicalId: string;
  metadata?: Record<string, unknown>;
}
```

Relationship payloads should remain small. Domain-specific relation metadata must eventually receive typed schemas instead of growing as arbitrary JSON.

## Metadata

```ts
interface EntityMetadata {
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  deprecated?: boolean;
}
```

Presentation-only concerns such as localized labels and artwork references may be added in dedicated structures. They must not replace mechanical fields.

## Validation rules

Canonical writes must fail when:

- required identity fields are missing;
- the entity subtype is unknown;
- the schema version is unsupported;
- mechanics violate their domain schema;
- required referenced entities cannot be resolved when the relation requires strict resolution.

Importers should return diagnostics before persistence rather than coercing malformed data silently.

## Forward compatibility

Unknown fields are not automatically accepted in canonical domain payloads. Schema extension must be deliberate. Source adapters may preserve their own temporary source record internally during import, but source-specific fields do not become canonical fields by accident.
