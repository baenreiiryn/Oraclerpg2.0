# OracleRPG 2.0 — Homebrew Importer

The homebrew importer is a staged ingestion system. No source adapter writes directly to the canonical compendium.

## Pipeline

```text
source
  -> source adapter
  -> source candidate(s)
  -> canonicalizer
  -> canonical schema validator
  -> staged batch
  -> READY / NEEDS_REVIEW / REJECTED
  -> explicit user approval
  -> persistence (future application layer)
```

Every candidate records provenance, source kind, source identifier when available, confidence, diagnostics, and whether AI assisted the conversion.

## Supported source models

### 1. 5etools Markdown

Input is Markdown exported/copied from 5etools-style content. The adapter preserves headings, sections, tables and inline 5etools tags. It can infer obvious spells, monsters and classes. Ambiguous inference remains `NEEDS_REVIEW`.

For authored Markdown, the optional directive below removes type ambiguity:

```html
<!-- oracle:type=spell -->
```

Valid values are the Oracle canonical content types.

### 2. FoundryVTT

Accepts a single Foundry document, arrays of documents, or common wrapper objects (`items`, `documents`, `entries`, `data`). Foundry `type`, `system`, `effects` and `flags` are retained as source data and provenance. Common D&D item/document types are classified, but system-specific canonical mapping is reviewed before persistence.

### 3. Oracle JSON assisted by an external AI/PDF workflow

Use `packages/importers/templates/oraclerpg-homebrew-v1.json` as the exchange envelope. The user can provide this model together with a PDF to an AI and ask it to populate the canonical OracleRPG data.

Required envelope:

```json
{
  "format": "oraclerpg-homebrew",
  "version": 1,
  "systemId": "dnd-srd-5e",
  "contents": [
    {
      "type": "feature",
      "name": "Name",
      "sourceId": "stable-source-id",
      "confidence": 0.95,
      "data": {}
    }
  ]
}
```

The AI output is never trusted merely because it is valid JSON. It is canonicalized and validated exactly like every other source.

Recommended conversion instruction for external AIs:

> Read the supplied RPG document and populate only mechanics explicitly supported by the source. Preserve numbers, formulas, requirements, choices, levels, uses, recovery, relationships and original rule text. Do not invent missing values. Use stable IDs when relationships can be resolved. If a value cannot be determined, omit it rather than guessing. Return only one valid `oraclerpg-homebrew` version 1 JSON envelope.

### 4. Analyze Text

The user can paste freeform homebrew text. `TextAnalysisHomebrewAdapter` delegates interpretation to `HomebrewTextAnalyzerPort`, so the importer itself does not depend on a specific model/provider. In the application this port should be backed by the Oracle AI operation router (for example a structured extraction operation).

AI-derived candidates carry `aiAssisted: true` and low-confidence output automatically requires review.

## Safety/integrity rules

- Adapters do not mutate the compendium.
- Source-shaped Foundry/Markdown objects are not assumed to be canonical Oracle data.
- Invalid JSON and empty AI analysis are rejected.
- Confidence below 0.85 forces review.
- Any warning forces review.
- Any validation error rejects the batch.
- Persistence must be a separate explicit step after review/approval.
- Canonical schemas never depend on importer/source formats.

## Next implementation layer

Game-system canonicalizers should map Foundry and Markdown source structures into the already-defined Oracle schemas for item, spell, feature, class, subclass, species, background, monster, vehicle, rule, table and condition. These mappings should be tested with real exported fixtures before being marked persistence-ready.
