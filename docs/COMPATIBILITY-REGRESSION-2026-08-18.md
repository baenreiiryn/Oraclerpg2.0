# Compatibility Regression Audit — 2026-08-18

This audit uses previously supplied source examples only as compatibility probes. No audited source content is imported or persisted in the OracleRPG compendium.

## Result

All tested examples are representable by the current canonical schema layer without requiring a raw source-payload escape hatch. Rules that explicitly require GM judgement are represented with `ManualAdjudicationData`, not automated incorrectly.

## Class / subclass

### Barbarian + Path of the Berserker — SUPPORTED

Coverage includes Rage state/effects/recovery, conditional resistances and roll advantage, concentration/spellcasting prohibition, Unarmored Defense override, Weapon Mastery choices, conditional ability substitution, Reckless Attack effects, level grants, feat choices, Extra Attack, movement modification, Brutal Strike option progression, mutable Relentless Rage DC, initiative advantage, resource recovery, Indomitable Might minimum roll, Epic Boon choice, ability increases, Frenzy scaling/inherited damage type, condition immunity/removal, reaction attacks and Intimidating Presence repeat saves/cross-resource restoration.

## Spells

### Sunbeam — SUPPORTED

Line area, save/half damage, blinded duration, concentration duration, granted repeat activity while effect persists, and persistent bright/dim sunlight are representable.

### Summon Dragon — SUPPORTED

Referenced stat block, placement, ally relationship, shared initiative, turn order, command policy, fallback behavior, despawn rules and slot-level scaling are representable.

### Starry Wisp — SUPPORTED

Spell attack, damage scaling, temporary light emission and suppression/prevention of Invisible benefits are representable.

## Vehicle / upgrade

### Necrotic Smoke Screen — SUPPORTED

Vehicle upgrade classification, bonus-action activation, stationary cube area, heavy obscurement, entry/start-turn triggers, necrotic damage, environmental dispersal condition, duration and 24-hour recovery are representable.

### Tormentor — SUPPORTED

Capacity, cargo, conditional AC, HP, damage/mishap thresholds, speed/travel pace, abilities, immunities, movement-triggered traits, action stations, crew and cover requirements, attacks and driver-controlled reaction are representable.

## Charms / benefit-reference items

### Charm of Exorcism — SUPPORTED

Spell invocation by entity reference, material-component override, spellcasting-ability choice, one-use lifecycle and seven-day expiration are representable.

### Charm of the Black Rose — SUPPORTED

Exclusive effect choice, contextual advantage, fixed-level spell invocation, fixed save DC and consume-self lifecycle are representable.

### Charm of Feather Falling — SUPPORTED

Temporary grant of another canonical entity's benefits and timed self-expiration are representable without duplicating the referenced entity.

### Charm of Heroism — SUPPORTED

Magic-action application of another entity's benefits followed by self-consumption is representable.

## Armor / shields / artifacts

### Obsidian Flint Dragon Plate — SUPPORTED

AC, magical AC bonus, poison resistance, conditional advantage for Grappled checks/saves, Stealth disadvantage and Strength-gated speed penalty are representable.

### Shield of the Blazing Dreadnought — SUPPORTED

Timed activation state, fire immunity, disease/condition removal, action replacement for shield bash, once-per-turn limit, save/damage/Prone effects and dawn recovery are representable.

### Blackrazor — SUPPORTED

Weapon bonuses, Undead hit backlash/healing, soul-devour triggers, target HP-max runtime reference, condition immunities, Blindsight, autonomous Haste invocation, no-Concentration duration override, sentience, senses/languages/telepathy, timed hunger/agenda obligation, sunset conflict trigger, destruction text and Graze miss behavior are representable.

### Blade of Avernus — SUPPORTED

Weapon bonuses, resistance bypass, natural-20 trigger, anatomy/capability predicates, instant-kill/fallback damage, random beneficial/detrimental properties, conditional property suppression, target-scoped charm lockout, spell invocation with destination rule and explicit GM-adjudicated size exception are representable.

## Monsters

### Hyena — SUPPORTED

Base stat block, Perception/senses/CR/PB, Bite attack and Pack Tactics spatial/condition predicate are representable.

### Mammoth — SUPPORTED

Stat block, saves, Multiattack, movement-history predicate for Gore, Prone application, target-condition prerequisite and Trample save/half damage are representable.

## Species

### Dhampir — SUPPORTED

Size choice, walking/climb relationship, level-gated Spider Climb improvement, Darkvision, Necrotic resistance, Unarmed Strike attack override, post-damage exclusive empowerment choices, healing/value references, temporary future-roll bonus, PB-scaled uses and Long Rest recovery are representable.

## Feats / dark gifts

### Sharp Eye — SUPPORTED

Search/Study contextual check advantage, PB-scaled uses, Long Rest recovery and failure-dependent non-consumption are representable.

### Symbiotic Being — SUPPORTED

Linked lifecycle, proficiency/language choices, failed-save reaction using Hit Die, post-roll modifier, PB-scaled uses, natural-1 trigger, dynamic save DC, random duration, Charmed effect, on-damage repeat save and explicit GM-discretion trigger are representable.

## Background

### Haunted One — SUPPORTED

Ability-score choice package, fixed skill grants, feat/category choice, tool choice, mutually exclusive equipment bundles and reuse of the same prior Gaming Set choice are representable.

## Interpretation

`SUPPORTED` means the mechanics have canonical structures available. It does not mean an importer exists, that source parsing is implemented, or that runtime automation already executes every rule. Import and runtime execution remain later phases.
