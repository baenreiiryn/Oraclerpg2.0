import test from 'node:test';
import assert from 'node:assert/strict';
import { importDocument } from '../import-engine/index.mjs';

const document=`PESTILENCE DOMAIN (CLERIC)
LEVEL 3: BLIGHT WEAVER
You have Resistance to Necrotic and Poison damage.

CIRCLE OF THE TITAN (DRUID)
LEVEL 3: TITAN FORM
When you use Wild Shape, you can adopt a Titan Form.

HELL KNIGHT (FIGHTER)
LEVEL 3: INFERNAL WOUND
You have one Infernal Wound Die, which is a d6.

DEMONIC SORCERY (SORCERER)
LEVEL 3: ABYSSAL RUPTURE
When you spend at least 1 Sorcery Point, unleash an effect.

PATHS OF VILLAINY
PATH OF THE DEATH KNIGHT
PATH OF THE DEATH KNIGHT FEATS
DEATH KNIGHT INITIATE
Path of the Death Knight Feat (Prerequisite: Level 4+, Weapon Mastery Feature)
Ability Score Increase. Increase your Strength or Charisma score by 1, to a maximum of 20.
Death Points. You have a number of Death Points equal to your Proficiency Bonus. You regain all expended Death Points when you finish a Long Rest.
Dread Strike. You always have the Wrathful Smite spell prepared. Charisma is your spellcasting ability for this spell. You can cast it without expending a spell slot by expending 1 Death Point.

DREAD AUTHORITY
Path of the Death Knight Feat (Prerequisite: Death Knight Initiate Feat)
Ability Score Increase. Increase your Constitution or Charisma score by 1, to a maximum of 20.
Dread Command. You always have the Command spell prepared. You can cast it without expending a spell slot by expending 1 Death Point.

HARBINGER OF DOOM
Path of the Death Knight Feat (Prerequisite: Death Knight Initiate Feat)
Ability Score Increase. Increase your Strength, Constitution, or Charisma score by 1, to a maximum of 20.
Ill Omen. You always have the Bane spell prepared.

DEATHLY PRESENCE
Path of the Death Knight Feat (Prerequisite: Level 8+, Death Knight Initiate Feat)
Ability Score Increase. Increase your Strength, Constitution, or Charisma score by 1, to a maximum of 20.
Awful Presence. You always have the Fear spell prepared.

UNHOLY STEED
Path of the Death Knight Feat (Prerequisite: Level 8+, Death Knight Initiate Feat)
Ability Score Increase. Increase your Strength or Constitution score by 1, to a maximum of 20.
Spectral Steed. You always have the Find Steed spell prepared.

DEATH KNIGHT ASCENSION
Path of the Death Knight Feat (Prerequisite: Level 12+, two Path of the Death Knight Feats)
Ability Score Increase. Increase your Strength or Charisma score by 1, to a maximum of 20.
Undead. Your creature type is Undead.
Unholy Anatomy. You have Resistance to Necrotic and Poison damage.
Hellfire Orb. As a Magic action, you can expend 1 to 5 Death Points.

PATH OF THE LICH
PATH OF THE LICH FEATS
LICH INITIATE
Path of the Lich Feat (Prerequisite: Level 4+, Spellcasting or Pact Magic Feature)
Ability Score Increase. Increase your Intelligence, Wisdom, or Charisma score by 1, to a maximum of 20.
Creating Your Spirit Jar. Choose a Tiny object of great significance to you.
Spirit Jar Destruction. If your spirit jar is destroyed, you gain 2 Exhaustion levels.
Soul Siphon. When you reduce a Humanoid enemy to 0 Hit Points, you can consume its soul. A soul consumed in this way can be restored only by a True Resurrection or Wish spell.

ARCANE RESTORATION
Path of the Lich Feat (Prerequisite: Lich Initiate Feat)
Ability Score Increase. Increase your Intelligence, Wisdom, or Charisma score by 1, to a maximum of 20.
Essence Rejuvenation. When you use Soul Siphon, recover spell slots with a combined level no more than 4. Once you use this feature, you can't use it again until you finish a Short or Long Rest.

TRANSFER LIFE
Path of the Lich Feat (Prerequisite: Lich Initiate Feat)
Ability Score Increase. Increase your Intelligence, Wisdom, or Charisma score by 1, to a maximum of 20.
Soul Transference. When you use Soul Siphon, choose a creature within 60 feet to gain Temporary Hit Points equal to your Proficiency Bonus plus your spellcasting ability modifier.

UNDEAD GRASP
Path of the Lich Feat (Prerequisite: Lich Initiate Feat)
Ability Score Increase. Increase your Intelligence, Wisdom, or Charisma score by 1, to a maximum of 20.
Paralyzing Touch. You know the Chill Touch cantrip. If you already know it, you learn another cantrip of your choice.

LICH ASCENSION
Path of the Lich Feat (Prerequisite: Level 12+, at least two Path of the Lich Feats)
Ability Score Increase. Increase your Intelligence, Wisdom, or Charisma score by 1, to a maximum of 20.
Undead. Your creature type is Undead.
Unholy Anatomy. You have Resistance to Necrotic and Poison damage.
Frightening Gaze. You learn the Fear spell if you don't already know it, and you always have it prepared. You can cast the spell without expending a spell slot a number of times equal to your spellcasting ability modifier and regain all expended uses when you finish a Long Rest.
Rejuvenation. If you die, you re-form in 1d10 days if you have a spirit jar.`;

const compendium=['Wrathful Smite','Command','Bane','Fear','Find Steed','Chill Touch','True Resurrection','Wish'].map((name,i)=>({canonicalId:`spell:${i}`,entityType:'spell',name}));

test('Villainous Options keeps four subclasses and two independent feat paths in one import graph',()=>{
  const out=importDocument(document,{kind:'class',format:'markdown',sourceName:'UA2026-VillainousOptions.pdf',compendium});
  assert.equal(out.entries.filter(e=>e.category==='subclasses').length,4);
  const feats=out.entries.filter(e=>e.category==='feats');
  assert.equal(feats.length,11);
  assert.equal(feats.filter(e=>e.entity.data.pathName==='Path of the Death Knight').length,6);
  assert.equal(feats.filter(e=>e.entity.data.pathName==='Path of the Lich').length,5);

  const initiate=feats.find(e=>e.name==='Death Knight Initiate')?.entity;
  assert.match(initiate.data.prerequisite,/Level 4\+/);
  assert.deepEqual(initiate.data.abilityChoices.options,['STR','CHA']);
  assert.deepEqual(initiate.data.resource,{name:'Death Points',maxFormula:'PB',recovery:'longRest'});
  assert.equal(initiate.data.spellGrants.find(g=>g.name==='Wrathful Smite').resolution.status,'resolved');
  assert.ok(initiate.data.features.some(f=>f.name==='Dread Strike'));

  const dread=feats.find(e=>e.name==='Dread Authority')?.entity;
  assert.match(dread.data.prerequisite,/Death Knight Initiate/);
  assert.equal(dread.data.spellGrants.find(g=>g.name==='Command').resolution.status,'resolved');

  const dkAsc=feats.find(e=>e.name==='Death Knight Ascension')?.entity;
  assert.equal(dkAsc.data.creatureTypeChange,'undead');
  assert.match(dkAsc.data.prerequisite,/Level 12\+/);
  assert.ok(dkAsc.data.features.some(f=>f.name==='Hellfire Orb'));

  const lich=feats.find(e=>e.name==='Lich Initiate')?.entity;
  assert.match(lich.data.prerequisite,/Spellcasting or Pact Magic/);
  assert.deepEqual(lich.data.abilityChoices.options,['INT','WIS','CHA']);
  assert.equal(lich.data.spellGrants.find(g=>g.name==='True Resurrection').resolution.status,'resolved');
  assert.equal(lich.data.spellGrants.find(g=>g.name==='Wish').resolution.status,'resolved');
  assert.ok(lich.data.features.some(f=>f.name==='Creating Your Spirit Jar'));
  assert.ok(lich.data.features.some(f=>f.name==='Soul Siphon'));

  const grasp=feats.find(e=>e.name==='Undead Grasp')?.entity;
  assert.equal(grasp.data.spellGrants.find(g=>g.name==='Chill Touch').resolution.status,'resolved');
  const lichAsc=feats.find(e=>e.name==='Lich Ascension')?.entity;
  assert.equal(lichAsc.data.creatureTypeChange,'undead');
  assert.equal(lichAsc.data.spellGrants.find(g=>g.name==='Fear').resolution.status,'resolved');

  assert.equal(out.entries.filter(e=>e.category==='classes').length,4);
  assert.equal(new Set(feats.map(e=>e.canonicalId)).size,11);
});
