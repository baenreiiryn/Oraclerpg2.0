# Foundry D&D 2024 ↔ OracleRPG Item Structure Audit

This document records a structural comparison, not a field-for-field compatibility target.

The Oracle canonical compendium separates immutable item definitions from runtime inventory state. Physical item weight is unit-aware. Runtime quantity, equipped/attuned/identified state, current uses, and parent container instance live in `InventoryItemInstanceData`.

Foundry references used for comparison: current D&D item data models and the 2024 equipment compendium structure (weapons, armor/equipment, consumables, containers, tools, and adventuring gear).

Expected alignment:
- shared physical-item primitives;
- specialized item categories;
- reusable Activities for executable item behavior;
- effects/uses separated from physical identity;
- unit-aware weight/capacity;
- runtime container membership distinct from a canonical container definition.

Intentional Oracle differences:
- armor is a strongly typed canonical kind rather than only an equipment subtype;
- packs are explicit bundle definitions;
- mount/vehicle purchase records reference Monster/Vehicle entities instead of duplicating full stat blocks;
- container compartments and per-item capacity limits are more explicit;
- canonical compendium definitions are immutable and do not contain runtime equipped/attuned/identified/current-use/container-instance state.
