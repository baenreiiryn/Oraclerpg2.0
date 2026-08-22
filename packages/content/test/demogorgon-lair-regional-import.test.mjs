import test from 'node:test';import assert from 'node:assert/strict';import { importDocument } from '../import-engine/index.mjs';
const text=`Demogorgon
Huge Fiend (Demon), Chaotic Evil
AC 22 (natural armor)
HP 464 (32d12 + 256)
Speed 50 ft., Swim 50 ft.
STR 29 +9 +16
DEX 14 +2 +2
CON 26 +8 +15
INT 20 +5 +12
WIS 17 +3 +10
CHA 25 +7 +14
Senses Truesight 120 ft.; Passive Perception 20
Languages all, Telepathy 120 ft.
CR 26 (XP 90,000; PB +8)
Traits
**Legendary Resistance (3/Day).** When Demogorgon fails a saving throw, he can choose to succeed instead.
Actions
**Multiattack.** Demogorgon makes two attacks.
Lair Actions
On initiative count 20 (losing initiative ties), Demogorgon takes one lair action and cannot use the same option two rounds in a row.
**Darkness.** Demogorgon casts the Darkness spell 4 times in different areas. He does not need to concentrate, and the effects end on initiative count 20 of the next round.
**Illusory Duplicate.** Demogorgon creates an illusory duplicate in his own space until initiative count 20 of the next round. He can move it a distance equal to his walking speed with no action required. The first physical interaction has a 50 percent chance to affect the duplicate instead, causing the illusion to disappear.
Regional Effects
**Beguiling Realm.** Within 6 miles, Persuasion and Performance checks have disadvantage, while Deception and Intimidation checks have advantage.
**Frenzied Animals.** Beasts within 1 mile become frenzied and violent. Animal Handling checks have disadvantage there.
**Venomous Beasts.** Within 6 miles, poisonous snakes and other venomous beasts become unusually common.
If Demogorgon dies, these effects fade over the course of 1d10 days.`;

test('Demogorgon keeps lair action economy and regional effects separate from creature actions',()=>{const out=importDocument(text,{kind:'monster',format:'markdown',sourceName:'demogorgon.md',compendium:[{canonicalId:'dnd2024:spell:darkness',entityType:'spell',name:'Darkness'}]});const m=out.entities[0];assert.equal(m.entityType,'monster');assert.equal(m.data.lairActionEconomy.initiativeCount,20);assert.equal(m.data.lairActionEconomy.losesInitiativeTies,true);assert.equal(m.data.lairActionEconomy.cannotRepeatConsecutively,true);assert.equal(m.data.lairActions.length,2);
const darkness=m.data.lairActions.find(x=>x.name==='Darkness');assert.equal(darkness.spellLike.spell,'Darkness');assert.equal(darkness.castCount,4);assert.equal(darkness.concentrationRequired,false);assert.equal(darkness.duration.until.initiativeCount,20);assert.equal(darkness.duration.until.roundOffset,1);
const duplicate=m.data.lairActions.find(x=>x.name==='Illusory Duplicate');assert.equal(duplicate.illusion.redirectChancePercent,50);assert.equal(duplicate.illusion.moveDistance,'walkingSpeed');assert.equal(duplicate.illusion.moveActivation,'none');assert.equal(duplicate.illusion.disappearsOnRedirect,true);
assert.equal(m.data.regionalEffects.length,3);const beguiling=m.data.regionalEffects.find(x=>x.name==='Beguiling Realm');assert.equal(beguiling.radius.value,6);assert.ok(beguiling.skillModifiers.disadvantage.includes('Persuasion'));assert.ok(beguiling.skillModifiers.advantage.includes('Intimidation'));const animals=m.data.regionalEffects.find(x=>x.name==='Frenzied Animals');assert.equal(animals.radius.value,1);assert.equal(animals.environmentalChange,'beastsBecomeFrenziedAndViolent');assert.ok(animals.skillModifiers.disadvantage.includes('Animal Handling'));const venom=m.data.regionalEffects.find(x=>x.name==='Venomous Beasts');assert.equal(venom.radius.value,6);assert.equal(venom.environmentalChange,'venomousBeastsOverpopulate');assert.equal(m.data.regionalEffectTermination.fadeDuration.formula,'1d10');assert.ok(m.data.references.some(x=>x.name==='Darkness'&&x.resolution.status==='resolved'));});
