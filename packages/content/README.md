# @oraclerpg/content

This package contains compendium package manifests and curated OracleRPG-native content assets.

It does **not** define canonical schemas and it does **not** contain importer logic.

Planned structure:

```text
packages/content/
  manifests/
    dnd5e/
      2014/
        srd-5.1/
      2024/
        srd-5.2/
  fixtures/
    dnd5e/
```

SRD manifests identify package membership and authoritative source metadata. Structured entity records must pass through the canonical schema and validation pipeline before becoming compendium content.
