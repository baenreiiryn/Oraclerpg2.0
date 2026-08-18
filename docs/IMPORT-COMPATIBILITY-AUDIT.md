# Import Compatibility Audit

Before OracleRPG imports external content, source files can be evaluated in a non-persistent audit mode.

The question is deliberately simple:

> If this source entity were imported, can the current canonical OracleRPG schemas represent every meaningful field and relationship without loss?

## Audit rules

An audit MUST NOT:

- write to the compendium;
- create canonical IDs permanently;
- create relationships permanently;
- mutate source files;
- silently discard unsupported mechanics;
- declare compatibility from source metadata alone.

## Statuses

- `supported`: every meaningful source field can be represented canonically or is intentionally source-only metadata.
- `partial`: the entity can mostly be represented, but one or more fields/mechanics require schema work or a mapping decision.
- `unsupported`: a required source construct cannot currently be represented without information loss.
- `empty`: a valid source envelope was detected but no entity payload exists to test.

## Field-level audit

Every source field that affects identity, rules, filtering, relationships, progression, presentation, or provenance should be classified as one of:

1. mapped directly to a canonical field;
2. normalized into a canonical primitive;
3. represented as a canonical relationship/grant/choice/activity;
4. preserved as editorial source text where it is genuinely non-mechanical;
5. intentionally ignored as transient source/UI metadata;
6. unsupported and therefore reported as an issue.

Unknown fields must never be copied into an arbitrary `extra`, `raw`, or catch-all JSON field merely to make the audit pass.

## 5etools sublist envelopes

5etools saved sublists use an envelope similar to:

```json
{
  "fileType": "bestiary-sublist",
  "siteVersion": "2.33.3",
  "items": [],
  "sources": [],
  "saveId": "..."
}
```

This is a list/save envelope, not a monster schema. `fileType`, `siteVersion`, and `saveId` describe the source artifact. The actual compatibility audit requires entity payloads inside `items` (or a raw 5etools data record supplied separately).

If `items` is empty, the correct result is `status: empty`; the audit must not infer that monsters, spells, items, feats, vehicles, rewards, objects, or character creation options are fully supported.

## Required source-family auditors

As representative payloads become available, add dedicated auditors for:

- bestiary / monster;
- spells;
- items/equipment;
- feats/features;
- classes/subclasses;
- species;
- backgrounds;
- vehicles;
- objects;
- rewards;
- character creation options;
- conditions/rules/tables where applicable.

Each dedicated auditor should produce a coverage matrix showing source path → canonical path and explicit issues for anything not represented.

## Release discipline

A canonical schema family should not be considered stable merely because one SRD fixture passes. Before locking a schema, audit representative simple, complex, and edge-case entities from both SRD 5.2 and compatible 2024 homebrew structures.
