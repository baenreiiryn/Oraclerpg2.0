# Import Pipeline

## Purpose

Importers translate external structured data into validated OracleRPG canonical entities. They are compatibility layers, not persistence models.

## Stages

```text
1. Acquire source record
2. Parse source format
3. Normalize source variants
4. Map normalized fields to canonical fields
5. Resolve/rewrite relationships
6. Validate canonical schema
7. Emit diagnostics
8. Persist only valid entities
```

## Adapter responsibility

A source adapter knows the quirks of one external format.

Example responsibilities for a future 5etools adapter:

- normalize scalar-vs-array variants;
- expand compact source conventions into predictable internal structures;
- retain source keys needed for relationship resolution;
- identify unsupported constructs;
- never decide OracleRPG persistence shape.

Adapters output a normalized source record that is still source-oriented but predictable.

## Mapper responsibility

A mapper knows both a normalized source contract and the Oracle canonical target schema.

Examples:

```text
5etools monster speed         → Oracle movement
5etools monster ac            → Oracle armor class
5etools monster hp            → Oracle hit points
5etools monster save          → Oracle saves
5etools monster skill         → Oracle skills
5etools monster resist        → Oracle resistances
5etools monster immune        → Oracle immunities
5etools monster action        → Oracle structured activities/actions
```

Mappings are versioned independently from canonical schemas.

## Diagnostics

Import results should separate errors, warnings and informational notices.

```ts
interface ImportDiagnostic {
  severity: "error" | "warning" | "info";
  code: string;
  path?: string;
  message: string;
  sourceValue?: unknown;
}
```

Examples:

- unsupported action construct;
- ambiguous source relationship;
- field mapped losslessly;
- source field intentionally ignored because it is presentation-only;
- invalid canonical damage type.

## No generic escape hatch

The following anti-pattern is forbidden:

```ts
canonical.data.sourceSpecific = raw5etoolsObject;
```

Raw source data may be retained transiently during an import job or stored separately for private audit/debug purposes, but it is not part of the canonical game model.

## SRD-guided import

For SRD compendium packages, the SRD functions as a manifest/authority for package membership.

Example:

```text
SRD manifest says Wolf belongs to the target package
             ↓
resolve matching structured source record
             ↓
adapt + map + validate
             ↓
store canonical Wolf with SRD source metadata
```

The PDF does not need to be the parser source for every stat block when an equivalent structured representation can be legally and reliably transformed.

## Importer references

Foundry-compatible 5etools import modules can be studied for practical source parsing and transformation patterns. OracleRPG should copy neither their persistence model nor implementation blindly; the useful artifact is the mapping knowledge and edge-case catalog.

## Test strategy

Every importer family should include:

- minimal fixtures;
- representative complex fixtures;
- expected canonical output snapshots or schema assertions;
- diagnostics assertions;
- relationship-resolution tests;
- regression fixtures for every discovered edge case.

Mass import begins only after representative fixtures pass validation.
