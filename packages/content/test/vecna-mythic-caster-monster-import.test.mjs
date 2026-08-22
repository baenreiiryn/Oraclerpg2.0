import test from 'node:test';import assert from 'node:assert/strict';import { importDocument } from '../import-engine/index.mjs';
const text=`[**ᚨᛋᚲᛖᚾᛞᚨᛞᛖᛞ Vecna, the Whispered One**](https://www.dndbeyond.com/monsters/6551458-vecna-the-whispered-one)
*Medium Undead (Wizard), Lawful Evil*
**AC** 23 (natural armour)    **Initiative** +17 (27)
**HP** 315 (42d8 + 126)
**Speed** 30 ft.
| STR | 20 | +5 | +5 |
| DEX | 26 | +8 | +17 |
| CON | 27 | +8 | +17 |
| INT | 30 | +10 | +19 |
| WIS | 27 | +8 | +17 |
| CHA | 28 | +9 | +9 |
**Skills** [Arcana](x) +19, [History](x) +12, [Insight](x) +9, [Perception](x) +9
**Resistances** Cold, Lightning, Psychic
**Immunities** Necrotic, Poison; Charmed, Exhaustion, Frightened, Paralyzed, Poisoned
**Gear** Component Pouch
**Senses** Truesight 120 ft.; Passive Perception 21
**Languages** All
**CR** 30 (XP 155,000; PB +9)
Traits
**God of Lichdom (1/Day).** When Vecna is reduced to 0 Hit Points, he regains all of his Hit Points and unlocks access to Mythic Actions.
**Legendary Resistance (6/Day).** When Vecna fails a Saving Throw, he can choose to succeed instead.
**Magic Mastery.** Vecna has Advantage on Concentration checks, can Concentrate on up to 3 different spells at a time (when he takes damage he ends Concentration on one spell of his choice), and does not require any Verbal Components when spellcasting.
**Marked for Undeath.** Marked for Undeath is a unique condition applied only by Vecna. Creatures afflicted with this condition receive Vulnerability to Necrotic damage and, when reduced to 0 Hit Points, are raised as a mindless Zombie under Vecna's control.
**Aura of Enervation.** All creatures that start or end their turn within 30 ft. of Vecna must succeed a DC 27 Constitution Saving Throw or take 23 (4d10) Necrotic damage and receive 1 level of Exhaustion. Creatures who failed the Saving Throw by a 10 or lower also receive the Marked for Undeath condition.
**Uncanny Reflexes.** Vecna can take 1 Reaction per turn.
**Soul Regeneration.** At the start of his turn, Vecna regains 30 Hit Points. If he killed another creature in his previous turn, then he regains an additional 30 Hit Points per creature slain.
Actions
**Multiattack**. Vecna uses Rotten Fate, Flight of the Damned, or Spellcasting. He then makes three attacks using Afterthought or Eldritch Burst in any combination of his choice.
**Afterthought**. Melee Attack Roll: +16 to hit, reach 5 ft., one target. Hit: 21 (3d10+7) Piercing damage plus 11 (2d10+7) Psychic damage and the target must succeed a DC 27 Constitution Saving Throw or be Cursed, While Cursed, the target takes 10 (2d10) Necrotic damage and cannot regain any Hit Points.
**Eldritch Ray.** Ranged Attack Roll: +16 to hit, range 120 ft., up to 3 targets within range. Hit: 43 (6d10) Force damage and the target receives Marked for Undeath. Miss: Make a separate attack roll against a different creature within 60 ft. of the original target.
**Rotten Fate.** DC 27 Constitution Saving Throw: One target within 120 ft. Fail: 102 (8d10+50) Necrotic damage which is doubled against Cursed targets. Success: Half damage only. A Humanoid killed by this ability rises as a Zombie under Vecna's control.
**Flight of the Damned (Recharge 4-6).** DC 27 Wisdom Saving Throw: All creatures within a 120 ft. cone. Fail: 66 (8d10+20) Necrotic damage and Frightened for 1 minute. Success: Half damage only.
**Supreme Spellcasting.** Vecna can cast the following spells below (Spell Save DC 27)
*At-Will:* Detect Magic, Detect Thoughts, Dispel Magic, Lightning Bolt (Level 8 version), Invisibility, Fly, Animate Dead (9th level version), Dimension Door, Contingency
*3/Day Each:* Chain Lightning (Level 7 version), Circle of Death (Level 7 version), Scrying, Plane Shift, Symbol
*1/Day Each:* Dominate Monster, Globe of Invulnerability, Finger of Death (Level 8 version), Power Word Kill, Time Stop
Bonus Actions
**Vile Teleport.** Vecna teleports to any unoccupied space within 60 ft. Each creature within 15 ft. takes 10 (3d6) Psychic damage. Vecna regains 80 Hit Points for each creature damaged in this way.
**Summon Undead Legions (1/Day).** Vecna summons up to 10 Undead whose combined Hit Point Maximum does not exceed 500. These Undead must have a Challenge Rating of 22 or lower. They appear within 120 ft. and roll their own Initiative.
Reactions
**Dread Counterspell.** Trigger: A creature within 120 ft. casts a spell. Response: That creature must succeed a DC 27 Intelligence Saving Throw or the spell's effect is cancelled and the caster takes Psychic damage equal to twice the level of the spell cast.
**Vengeful Shield (1/Round).** Trigger: A creature hits Vecna with a Melee Attack. Response: Vecna gains 20 Temporary Hit Points and the attacker takes 20 Necrotic damage.
**Fell Rebuke.** Trigger: A creature within 120 ft. deals damage to Vecna. Response: Vecna deals 19 (3d10) Necrotic damage and teleports within 60 ft.
Legendary Actions
Vecna has 3 Legendary Actions, choosing out of the following options below.
**Spell Barrage.** Vecna casts two spells.
Mythic Actions
After activating his God of Lichdom trait, Vecna can use the following Legendary Actions below.
**Speech of the Whispered One (2 Legendary Actions).** Vecna casts Power Word Kill on up to 3 creatures of his choice at-will.
**Deathly Ascension (3 Legendary Actions).** Vecna ascends for 1 minute. While ascended, he gains 2 Actions, 2 Bonus Actions, regains all expended uses of Legendary Resistance, and can use Summon Undead Legions three times a day instead of once.`;

test('Vecna mythic caster preserves phase change, spell frequencies, recharge and boss action economy',()=>{const out=importDocument(text,{kind:'monster',format:'markdown',sourceName:'vecna.md',compendium:[{canonicalId:'dnd2024:spell:power-word-kill',entityType:'spell',name:'Power Word Kill'},{canonicalId:'dnd2024:spell:detect-magic',entityType:'spell',name:'Detect Magic'}]});const m=out.entities[0];assert.equal(m.entityType,'monster');assert.match(m.name,/Vecna, the Whispered One/i);assert.equal(m.data.ac,23);assert.equal(m.data.cr,30);assert.equal(m.data.skills.arcana,19);assert.equal(m.data.skills.history,12);assert.equal(m.data.senses.truesight,120);
const god=m.data.traits.find(x=>/God of Lichdom/i.test(x.name));assert.equal(god.deathPhase.restore,'fullHitPoints');assert.equal(god.deathPhase.unlocks,'mythicActions');const lr=m.data.traits.find(x=>/Legendary Resistance/i.test(x.name));assert.equal(lr.legendaryResistance.uses,6);const mm=m.data.traits.find(x=>/Magic Mastery/i.test(x.name));assert.equal(mm.concentration.maxConcurrent,3);assert.equal(mm.components.verbalRequired,false);const marked=m.data.traits.find(x=>/Marked for Undeath/i.test(x.name));assert.equal(marked.customCondition.effects.onReducedToZero.raiseAs,'Zombie');const aura=m.data.traits.find(x=>/Aura of Enervation/i.test(x.name));assert.equal(aura.aura.radius,30);assert.equal(aura.save.dc,27);assert.ok(aura.damage.some(x=>x.type==='necrotic'));assert.equal(m.data.traits.find(x=>/Soul Regeneration/i.test(x.name)).regeneration.atTurnStart,30);
const flight=m.data.actions.find(x=>/Flight of the Damned/i.test(x.name));assert.equal(flight.recharge.min,4);assert.equal(flight.recharge.max,6);assert.equal(flight.area.size,120);const casting=m.data.actions.find(x=>/Supreme Spellcasting/i.test(x.name));assert.equal(casting.spellcasting.saveDc,27);assert.equal(casting.spellcasting.groups.length,3);assert.equal(casting.spellcasting.groups[0].spells.find(x=>x.name==='Lightning Bolt').castLevel,8);assert.equal(casting.spellcasting.groups[1].spells.find(x=>x.name==='Chain Lightning').castLevel,7);
const summon=m.data.bonusActions.find(x=>/Summon Undead Legions/i.test(x.name));assert.equal(summon.summon.maxCount,10);assert.equal(summon.summon.combinedHpMax,500);assert.equal(summon.summon.crMax,22);assert.equal(m.data.reactions.find(x=>/Dread Counterspell/i.test(x.name)).onFailure.cancelSpell,true);assert.equal(m.data.legendaryActionBudget,3);assert.equal(m.data.legendaryActions.find(x=>/Spell Barrage/i.test(x.name)).spellcastingSequence.casts,2);const speech=m.data.mythicActions.find(x=>/Speech of the Whispered One/i.test(x.name));assert.equal(speech.legendaryActionCost,2);assert.equal(speech.spellGrant.spell,'Power Word Kill');const asc=m.data.mythicActions.find(x=>/Deathly Ascension/i.test(x.name));assert.equal(asc.legendaryActionCost,3);assert.equal(asc.phaseTransformation.actions,2);assert.equal(asc.phaseTransformation.bonusActions,2);assert.equal(asc.phaseTransformation.modifies[0].usesPerDay,3);assert.ok(m.data.references.some(x=>x.name==='Power Word Kill'&&x.resolution.status==='resolved'));});
