# Class/Subclass Compatibility Regression — 2026-08-18

This audit reuses the previously supplied Wizard, Barbarian, Bard, Cleric and Druid class files strictly as schema-coverage probes. No source content is imported or persisted in the OracleRPG compendium.

## Result

All five supplied class files are representable by the current canonical schema layer without requiring a raw source-payload escape hatch.

`SUPPORTED` here means the rules can be expressed structurally by canonical OracleRPG types. It does not mean a parser/importer exists or that runtime automation is implemented.

## Wizard + supplied subclasses — SUPPORTED

Coverage now includes:

- persistent spellbook and prepared-spell collections;
- adding, copying and replacing spellbook entries with time/currency rules;
- spell-slot pools and Arcane Recovery budget selection;
- spell filters by class list, school, level and casting time;
- Spell Mastery and Signature Spells as selected spell collections with modified slot costs/usage limits;
- Arcane Ward as a created/resource-backed ward plus damage interception and overflow;
- Projected Ward as remote damage interception;
- spell-slot retention on failed Counterspell/Dispel Magic resolution;
- Bladesong state/modifiers and cross-resource restoration;
- replacement of one Attack-action attack with a qualifying Wizard cantrip;
- Conjuration spell/summon modification, temporary HP and summon-count changes;
- Portent stored d20 pools and roll replacement;
- Divination slot recovery constrained below the slot spent;
- persistent runtime choices such as Third Eye;
- Enchantment retargeting that reuses the triggering attack roll;
- Evocation automatic save outcomes, no-damage protections, damage bonuses and maximize-dice effects;
- escalating Overchannel state;
- Illusion spell component/range/casting-time changes and free-cast summon variants;
- Illusory Reality object creation/transformation constraints;
- Necromancer projected effects on created/summoned/controlled Undead;
- Transmuter's Stone as a created transferable object with bearer-projected benefits and runtime choices;
- object transformation, curse/attunement removal, condition-level changes and permanent age modification from Master Transmuter.

## Barbarian + supplied subclasses — SUPPORTED

The base Barbarian remains covered by the shared mechanics layer and class feature progression.

The additional subclasses are representable through:

- Rage-dependent effects, dynamic DCs and Rage Damage scaling;
- cross-resource restoration and shared Rage uses;
- conditional creature-type changes and transformation states;
- damage/healing values derived from damage dealt or class scales;
- persistent aura choices and runtime option states;
- projected resistances/advantages to allies and enemies in range;
- chained secondary effects/targets;
- movement-history predicates;
- generated attacks/actions and mastery-property augmentation;
- pools of healing dice and level progression;
- teleportation with willing passenger selection;
- form-specific movement modes, hover and damage-type choices.

## Bard + supplied subclasses — SUPPORTED

Coverage now includes:

- Bardic Inspiration as a scalable resource-die pool;
- transfer of a die/resource to another creature with recipient limits and expiration;
- consumption after a failed D20 Test and post-roll modification;
- Font of Inspiration recovery and spell-slot-to-resource conversion;
- rerolls with Advantage after failed saves;
- expanded prepared spell lists through Magical Secrets;
- resource floors on Initiative for Superior Inspiration;
- spell target-count modification for Words of Creation;
- unarmored defense and Unarmed Strike overrides;
- generated attacks/movement inside another action, Bonus Action or Reaction;
- projected initiative/save/defense benefits to allies;
- reaction movement that does not provoke Opportunity Attacks;
- temporary HP derived from a transferred die result;
- repeated Command casting while a concentration-backed state is active;
- forced save failure against Command for creatures Charmed by the Bard;
- post-success roll reduction such as Cutting Words;
- post-failure roll addition with outcome-dependent resource consumption such as Peerless Skill;
- roll-table outcomes and stored random spirit states for College of Spirits;
- direct-choice restrictions tied to Bardic Inspiration die size;
- multiple-roll/choose-one table behavior;
- spell modifications that add cover, healing or other effects;
- runtime state choices for Moon/Moonshae folktales;
- Combat Inspiration AC/damage modification carried by the transferred resource;
- replacement of one attack with a qualifying Bard cantrip for Valor Extra Attack.

## Cleric + supplied domains — SUPPORTED

Coverage now includes:

- prepared-spell collections and always-prepared domain spell collections;
- Channel Divinity as a shared class resource powering multiple activities;
- Divine Spark branch choices with shared rolled values;
- Turn Undead conditions plus structured behavior constraints;
- features that add damage without ending their parent effect;
- dynamic spell choice invocation for Divine Intervention, including level filters and component/slot overrides;
- Greater Divine Intervention with stateful/random Long-Rest cooldown accounting;
- subclass spell grants and school/list-restricted spell choices;
- spell modification at cast time, including save penalties, target-count increases, concentration removal and effective-level changes;
- distributed healing pools with per-target HP caps such as Preserve Life;
- maximum healing dice resolution;
- post-hit damage mitigation and critical-effect cancellation;
- environmental/area effects such as magical Darkness dispelling and light auras;
- exhaustion level application/caps and contagion prevention;
- transformation into Vermin Form with movement permissions, resistances/immunities and space-sharing triggers;
- proxy-origin spellcasting through Invoke Duplicity, movable illusion entities and teleport exchange;
- projected ally benefits and healing when a proxy ends;
- dynamic filtered spell invocation such as Mind Magic;
- resource restoration through higher-level slot expenditure.

## Druid + supplied circles — SUPPORTED

Coverage now includes:

- prepared spellcasting and class spell collections;
- Wild Shape as a canonical transformation rather than a special-case text field;
- known Beast forms as a persistent entity collection with capacity/filter progression and Long-Rest replacement;
- CR/fly-speed eligibility progression;
- partial-stat replacement with explicitly retained HP, Hit Dice, mental abilities, class features, languages and feats;
- merged proficiencies and choose-the-higher modifier behavior;
- equipment drop/merge/wear choices and GM practicality flag;
- spellcasting prohibition while retaining Concentration, later patched by Beast Spells;
- temporary HP and transformation duration/end triggers;
- Wild Shape/spell-slot cross-resource conversions;
- runtime option progression for Elemental Fury;
- moving/anchored persistent areas such as Preserved Land and Wrath of the Sea;
- per-turn entry/end-area triggers and once-per-turn limits;
- spell component removal plus chance-to-retain consumed materials;
- dynamic spell choice invocation such as Natural Recovery;
- persistent land-choice state driving prepared spells and resistances;
- Circle of the Moon transformation patches, AC override, Temp HP scaling and attack damage-type substitution;
- externally anchored Wrath of the Sea with source save DC/ability values;
- Star Map-created object state and replacement lifecycle;
- Starry Form runtime constellation choices and per-turn option switching;
- Titan Form entity collections/forms, size progression and transformation patches;
- movement permissions, difficult-terrain rules, grappling limits and containment/swallow mechanics;
- concentration-bound containment and forced release/regurgitation;
- teleportation with additional willing creatures.

## Source rules that intentionally remain GM-adjudicated

Some supplied rules explicitly delegate a decision to the DM (for example, whether equipment is practical for a Wild Shape form to wear). These are represented with `ManualAdjudicationData` rather than being falsely automated.

## Engineering interpretation

The class/subclass representation layer is now broad enough for the supplied class probes. Remaining work is implementation quality rather than schema coverage:

1. replace permissive strings/runtime paths with stricter enums and validated path/value references;
2. add runtime validators;
3. create executable TypeScript fixtures for these compatibility cases;
4. compile/typecheck the schema package in CI;
5. only then begin source adapters/importers.
