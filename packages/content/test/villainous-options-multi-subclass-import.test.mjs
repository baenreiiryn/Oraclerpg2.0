import test from 'node:test';
import assert from 'node:assert/strict';
import { importDocument } from '../import-engine/index.mjs';

const ua=`PESTILENCE DOMAIN (CLERIC)
Foment Plague and Rot
LEVEL 3: BLIGHT WEAVER
You gain Resistance to Necrotic and Poison damage. Damage from your Cleric spells ignores Resistance to Necrotic and Poison damage.
LEVEL 3: PESTILENCE DOMAIN SPELLS
When you reach a Cleric level specified in the Pestilence Domain Spells table, you thereafter always have the listed spells prepared.
Cleric Level  Prepared Spells
3  Detect Poison and Disease, Protection from Poison, Ray of Enfeeblement, Ray of Sickness
5  Stinking Cloud, Vampiric Touch
7  Blight, Giant Insect
9  Contagion, Insect Plague
LEVEL 3: PLAGUE BLESSING
As a Magic action, expend Channel Divinity to manifest a 5-foot Emanation for 1 minute.
LEVEL 6: VIRULENT BURST
When an enemy within 60 feet is reduced to 0 Hit Points, you can take a Reaction. You can use this feature a number of times equal to your Wisdom modifier and regain all expended uses when you finish a Long Rest.
LEVEL 17: VERMIN FORM
As a Bonus Action, shape-shift for 10 minutes. You have Resistance to Bludgeoning, Piercing, and Slashing damage.

CIRCLE OF THE TITAN (DRUID)
Wreak Colossal Havoc
LEVEL 3: CIRCLE OF THE TITAN SPELLS
When you reach a Druid level specified in the Circle of the Titan Spells table, you thereafter always have the listed spells prepared.
Druid Level  Prepared Spells
3  Cure Wounds, Longstrider, Thaumaturgy
5  Fear
7  Stoneskin
9  Destructive Wave
LEVEL 3: TITAN FORM
When you use Wild Shape, you can adopt a Titan Form, choosing from Behemoth, Leviathan, and Insectoid.
LEVEL 6: DIRE IMPACT
Whenever you hit with your Titan Form's Rend attack, choose Acid, Cold, Fire, Lightning, or Thunder damage.
LEVEL 10: PRIMAL HAVOC
You can choose to become Huge when assuming your Titan Form.
LEVEL 14: MONSTROUS APPETITE
You can choose to become Gargantuan when assuming your Titan Form.
BEHEMOTH
Large, Huge (Requires Druid Level 10+), or Gargantuan (Requires Druid Level 14+) Monstrosity.
ACTIONS
Rend. Melee Attack Roll. Hit: 1d8 plus your Wisdom modifier Slashing damage.
LEVIATHAN
Large, Huge (Requires Druid Level 10+), or Gargantuan (Requires Druid Level 14+) Monstrosity.
REACTIONS
Ink Cloud. Trigger: You take damage. Response: expend a level 1+ spell slot.
INSECTOID
Large, Huge (Requires Druid Level 10+), or Gargantuan (Requires Druid Level 14+) Monstrosity.
ACTIONS
Energizing Pollen. Expend a level 1+ spell slot to restore Hit Points.

HELL KNIGHT (FIGHTER)
Inflict Hellish Wounds and Damn Enemies
LEVEL 3: DIABOLICAL GIFT
You gain Devil's Sight and Devil's Tongue.
LEVEL 3: HELLFIRE WEAPON
When you take the Attack action, imbue one weapon with hellfire for 10 minutes.
LEVEL 3: INFERNAL WOUND
You have one Infernal Wound Die, which is a d6. You can use this feature a number of times equal to your Constitution modifier and regain all expended uses when you finish a Short or Long Rest.
LEVEL 7: ADVANCED WOUNDS
When you roll your Infernal Wound Die and roll a 6, apply one advanced wound effect.
LEVEL 7: HELL-FORGED EQUIPMENT
While wearing armor or wielding a Shield, you have Resistance to Fire damage.
LEVEL 10: HELLFIRE SURGE
When you use your Action Surge, create a 10-foot Emanation.
LEVEL 15: BLISTER OF AVERNUS
When you roll a 6 on your Infernal Wound Die, roll another d6.
LEVEL 18: HELLFIRE CONDEMNATION
Whenever damage from your Hellfire Weapon or Infernal Wound reduces a creature to 0 Hit Points, its soul rises from the River Styx.
LEVEL 18: INFERNAL BARGAIN
When you roll your Infernal Wound Die, treat a roll of 1 as a 6.

DEMONIC SORCERY (SORCERER)
Summon the Powers of the Abyss
LEVEL 3: ABYSSAL RUPTURE
When you spend at least 1 Sorcery Point as part of a Magic action or Bonus Action, unleash one magical effect.
LEVEL 3: DEMONIC SPELLS
When you reach a Sorcerer level specified in the Demonic Spells table, you thereafter always have the listed spells prepared.
Sorcerer Level  Spells
3  Detect Magic, Entangle, Misty Step, Spider Climb
5  Dispel Magic, Gaseous Form
7  Confusion, Hallucinatory Terrain
9  Contact Other Plane, Hallow
LEVEL 6: ABYSSAL AURA
When you use Innate Sorcery, reality warps in a 10-foot Emanation. Once you use this feature, you can't use it again until a Long Rest. You can restore it by spending 2 Sorcery Points.
LEVEL 14: ABYSSAL CONDUIT
Your Abyssal Aura is now a 20-foot Emanation.
LEVEL 18: FIENDISH SERVANT
You can cast Summon Fiend once without a spell slot and regain the ability when you finish a Long Rest.`;

test('Villainous Options imports four subclasses belonging to four different classes',()=>{
  const out=importDocument(ua,{kind:'class',format:'markdown',sourceName:'UA2026-VillainousOptions.pdf'});
  const classes=out.entries.filter(e=>e.category==='classes');
  const subclasses=out.entries.filter(e=>e.category==='subclasses');
  assert.deepEqual(classes.map(e=>e.name).sort(),['Cleric','Druid','Fighter','Sorcerer']);
  assert.deepEqual(subclasses.map(e=>e.name).sort(),['Circle Of The Titan','Demonic Sorcery','Hell Knight','Pestilence Domain']);
  for(const sub of subclasses){assert.ok(sub.entity.data.parentClassId.startsWith('homebrew:class:'));assert.equal(sub.entity.data.features.length>0,true)}

  const pest=out.entries.find(e=>e.name==='Pestilence Domain Spells')?.entity;
  assert.equal(pest.data.level,3); assert.equal(pest.data.preparedSpellProgression.rows.length,4);
  const burst=out.entries.find(e=>e.name==='Virulent Burst')?.entity;
  assert.equal(burst.data.activation,'reaction'); assert.equal(burst.data.uses.formula,'WIS');

  const titan=out.entries.find(e=>e.name==='Titan Form')?.entity;
  assert.deepEqual(titan.data.modifies,['Wild Shape']);
  const forms=out.entries.find(e=>e.category==='feature-choices'&&e.name==='Titan Forms')?.entity;
  assert.equal(forms.data.choiceKind,'form'); assert.equal(forms.data.optionIds.length,3);
  assert.deepEqual(out.entries.filter(e=>e.entity?.data?.optionType==='titanForm').map(e=>e.name).sort(),['Behemoth','Insectoid','Leviathan']);

  const wound=out.entries.find(e=>e.name==='Infernal Wound')?.entity;
  assert.equal(wound.data.resourceDie,'d6'); assert.equal(wound.data.uses.formula,'CON'); assert.equal(wound.data.recovery,'shortRest');
  const surge=out.entries.find(e=>e.name==='Hellfire Surge')?.entity;
  assert.deepEqual(surge.data.modifies,['Action Surge']); assert.equal(surge.data.areaFeet,10);

  const rupture=out.entries.find(e=>e.name==='Abyssal Rupture')?.entity;
  assert.equal(rupture.data.resourceReference,'Sorcery Points');
  const aura=out.entries.find(e=>e.name==='Abyssal Aura')?.entity;
  assert.deepEqual(aura.data.modifies,['Innate Sorcery']); assert.equal(aura.data.areaFeet,10);
  const demonicSpells=out.entries.find(e=>e.name==='Demonic Spells')?.entity;
  assert.equal(demonicSpells.data.preparedSpellProgression.rows.length,4);

  assert.equal(out.entries.filter(e=>e.category==='classes').length,4);
  assert.equal(out.entries.filter(e=>e.category==='subclasses').length,4);
  assert.ok(out.entries.filter(e=>e.category==='subclass-features').length>=22);
});
