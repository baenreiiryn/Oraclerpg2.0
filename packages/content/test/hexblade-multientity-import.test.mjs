import test from 'node:test';import assert from 'node:assert/strict';import {importClass} from '../import-engine/index.mjs';
const md=`***Serve as Blade and Judgment***

Your pact is with a weapon forged in magic and malice.

#### Level 3: Hexblade Spells
When you reach a Warlock level specified in the Hexblade Spells table, you always have the listed spells prepared.
| **Warlock LevelSpells** | |
| --- | --- |
| 3 | Hex, Magic Weapon, Shield, Wrathful Smite |
| 5 | Conjure Barrage, Mirror Image |
| 7 | Freedom of Movement, Staggering Smite |
| 9 | Animate Objects, Steel Wind Strike |

#### Level 3: Cursebound Hex
You can cast Hex without expending a spell slot or material components a number of times equal to your Charisma. You regain all uses when you finish a Long Rest. Your weapon attacks against the cursed target score a critical hit on a roll of 19 or 20.

#### Level 3: Hexblade’s Weapon
You gain Proficiency with martial weapons, and Training with medium armor and shields. You learn three Hexblade Maneuvers of your choice. If a maneuver requires a saving throw, the DC is equal to your Warlock spell save DC.
| Warlock Level | Maneuvers Known | Maneuver Uses |
| :---: | :---: | :---: |
| 3-5 | 3 | 3 |
| 6-8 | 3 | 4 |
| 9-11 | 5 | 5 |
| 12-14 | 7 | 6 |
| 15+ | 7 | 7 |

#### Level 6: Shadowcurse Mastery
When you cast Hex using your Cursebound Hex feature, it does not require concentration. You can transfer Hex to another creature within 30 feet as a bonus action or a reaction.

#### Level 10: Hexblade’s Momentum
You learn two additional Hexblade Maneuvers of your choice. When a creature makes an attack roll against you, you can use your reaction. You can use this feature a number of times equal to your Proficiency Bonus, and regain all uses when you finish a Long Rest.

#### Level 14: Hexblade’s Final Judgment
When you cast Hex using your Cursebound Hex feature, your weapon attacks score a critical hit on a roll of 18–20. You learn two more Hexblade Maneuvers of your choice.

#### Hexblade Maneuvers
### **Hexblade Maneuvers (3rd-Level Requirement).**
- **Hex Interrogation**. When you reduce a creature to 0 HP, you gain advantage on your next Intelligence (Investigation) or Wisdom (Insight) check.
- **Mind Rattle**. When you hit a creature, it must succeed on an Intelligence saving throw or subtract a d6 from its next attack roll or saving throw.
- **Shadow Sweep**. When you hit a creature, it must succeed on a Strength saving throw or be knocked prone.
- **Void Spiral**. When you hit a creature, both you and the creature teleport 10 feet in opposite directions.
### **Hexblade Maneuvers (10th-Level Requirement)**
- **Chaotic Surge**. When you take elemental damage, you can take a reaction and deal an extra 1d8 of that damage type on your next hit within 1 minute.
- **Crippling Curse**. When you hit a creature, it must succeed on a Constitution saving throw or be unable to take reactions.

#### Additional Eldritch Invocations
### **Dual Pact Arms**
*Prerequisite: Level 2+ Warlock, Pact of the Blade*
When you summon your pact weapon, you may summon two one-handed weapons with the same bonus action instead.
### **Aegis of the Hexblade**
*Prerequisite: Level 5+ Hexblade Warlock*
When you take damage from a creature you can see, you can use your reaction to reduce the damage taken by 1d8 + your Charisma modifier.
`;
const compendium=['Hex','Magic Weapon','Shield','Wrathful Smite','Conjure Barrage','Mirror Image','Freedom of Movement','Staggering Smite','Animate Objects','Steel Wind Strike'].map(name=>({canonicalId:`dnd:spell:${name.toLowerCase().replaceAll(' ','-')}`,entityType:'spell',name}));
test('Hexblade document becomes subclass graph with features, maneuvers and invocations',()=>{const out=importClass(md,{sourceName:'hexblade.md',compendium});const subclass=out.entries.find(e=>e.category==='subclasses');assert.equal(subclass?.name,'Hexblade');assert.equal(subclass.entity.data.parentClassId,'homebrew:class:warlock');const sf=out.entries.filter(e=>e.category==='subclass-features');assert.deepEqual(sf.map(x=>[x.name,x.entity.data.level]),[['Hexblade Spells',3],['Cursebound Hex',3],["Hexblade’s Weapon",3],['Shadowcurse Mastery',6],["Hexblade’s Momentum",10],["Hexblade’s Final Judgment",14]]);const spells=sf.find(x=>x.name==='Hexblade Spells').entity.data.preparedSpellProgression;assert.ok(spells);const weapon=sf.find(x=>x.name==="Hexblade’s Weapon").entity.data;assert.equal(weapon.weaponProficiency,'martial');assert.equal(weapon.armorTraining.medium,true);assert.equal(weapon.optionGrant.count,3);assert.ok(weapon.maneuverProgression);const mastery=sf.find(x=>x.name==='Shadowcurse Mastery').entity.data;assert.equal(mastery.concentration,false);assert.deepEqual(mastery.modifies,['Cursebound Hex']);const finals=sf.find(x=>x.name==="Hexblade’s Final Judgment").entity.data;assert.equal(finals.criticalRange.min,18);const group=out.entries.find(e=>e.category==='feature-choices');assert.equal(group?.name,'Hexblade Maneuvers');const options=out.entries.filter(e=>e.category==='optional-features'&&e.entity.data.optionType==='maneuver');assert.equal(options.length,6);assert.equal(options.filter(x=>x.entity.data.requiredLevel===3).length,4);assert.equal(options.filter(x=>x.entity.data.requiredLevel===10).length,2);const inv=out.entries.filter(e=>e.category==='optional-features'&&e.entity.data.optionType==='eldritchInvocation');assert.deepEqual(inv.map(x=>x.name),['Dual Pact Arms','Aegis of the Hexblade']);assert.match(inv[1].entity.data.prerequisite,/Hexblade Warlock/);});
