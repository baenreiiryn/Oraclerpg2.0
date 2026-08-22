import test from 'node:test';import assert from 'node:assert/strict';import {importDocument} from '../import-engine/index.mjs';
const ghostblade=`*Fighter Subclass*

Some warriors master steel and strength, but Ghostblades master the art of slipping between the Material Plane and the Ethereal. By phasing in and out of reality, they strike from unexpected angles, evade deadly blows, and vanish before their enemies can react. Ghostblades are often feared as assassins, spectral duelists, or warriors bound by strange planar forces.

#### Flickering Step

*3rd-level Ghostblade feature*

Immediately after you hit a creature with a weapon attack, you can teleport up to 30 feet to an unoccupied space you can see.

If you teleport to a space within 5 feet of a different enemy creature than the one you hit, you can make one weapon attack against that creature as part of the same effect.

If you teleport within melee range of that creature, you have advantage on the next melee attack roll you make against it before the end of your turn. You can use this feature a number of times equal to your proficiency bonus. You regain one expended use when you use your Second Wind ability, and you regain all expended uses when you finish a long rest.

#### Veilwalker’s Guile

*3rd-level Ghostblade feature*

You gain proficiency in the Stealth skill. If you already have proficiency in Stealth, you instead gain expertise in it, doubling your proficiency bonus for any ability check you make using that skill.

#### Ghostveil Defense

*7th-level Ghostblade feature*

As a bonus action, you can shift part of your body into the Ethereal Plane. Until the start of your next turn, you gain the following benefits:

- You can move through creatures as if they were difficult terrain.
- You have resistance to bludgeoning, piercing, and slashing damage.

If you end your turn inside a creature or object, you are immediately shunted to the nearest unoccupied space and take 1d10 force damage.

You can use this feature a number of times equal to your proficiency bonus. You regain one expended use when you finish a short rest, and you regain all expended uses when you finish a long rest.

#### Arcane Scout

*7th-level Ghostblade feature*

You learn the clairvoyance spell. You can cast it once without expending a spell slot or material components, and you regain the ability to do so when you finish a long rest.

#### Phantom Stride

*10th-level Ghostblade feature*

When you are reduced to 0 hit points, you instead drop to 1 hit point and immediately enter the Ethereal Plane.

At the start of your next turn, you reappear in an unoccupied space you choose within 30 feet of where you vanished. If you reappear within 5 feet of an enemy creature, the first attack you make against that creature before the end of your turn has advantage and deals an extra 2d8 force damage on a hit.

Once you use this feature, you can’t use it again until you finish a long rest.

#### Ethereal Eye

*10th-level Ghostblade feature*

You learn the arcane eye spell. You can cast it once without expending a spell slot or material components, and you regain the ability to do so when you finish a long rest.

#### Spectral Riposte

*15th-level Ghostblade feature*

When you are hit with an attack roll, you can use your reaction to halve the damage and teleport up to 30 feet. If you teleport out of the attacker’s reach, the attack instead deals no damage.

You can use this feature a number of times equal to your Proficiency Bonus per long rest.

#### Ethereal Mastery

*18th-level Ghostblade feature*

Immediately after you roll initiative, you can enter a spectral state for 1 minute. While in this state, you gain the following benefits:

- You have resistance to radiant, necrotic, psychic, and force damage.
- You can move through creatures without penalty, and you can move through solid objects as if they were difficult terrain.
- Your melee weapon attacks deal an extra 2d8 force damage on a hit.

You can use this feature twice, and you regain all expended uses when you finish a long rest.`;
const compendium=[{canonicalId:'dnd:spell:clairvoyance',entityType:'spell',name:'clairvoyance'},{canonicalId:'dnd:spell:arcane-eye',entityType:'spell',name:'arcane eye'}];
test('imports standalone Ghostblade as Fighter subclass with multi-feature levels',()=>{const out=importDocument(ghostblade,{kind:'class',format:'markdown',sourceName:'ghostblade.md',compendium});const cls=out.entries.find(e=>e.entityType==='class')?.entity,sub=out.entries.find(e=>e.entityType==='subclass')?.entity,features=out.entries.filter(e=>e.category==='subclass-features').map(e=>e.entity);assert.equal(cls.name,'Fighter');assert.equal(sub.name,'Ghostblade');assert.match(sub.data.description,/Some warriors master steel/);assert.equal(features.length,8);assert.deepEqual(sub.data.advancement[2].features.length,2);assert.deepEqual(sub.data.advancement[6].features.length,2);assert.deepEqual(sub.data.advancement[9].features.length,2);const flick=features.find(f=>f.name==='Flickering Step');assert.equal(flick.data.level,3);assert.equal(flick.data.trigger,'afterWeaponAttackHit');assert.equal(flick.data.teleportFeet,30);assert.equal(flick.data.uses.formula,'PB');assert.ok(flick.data.recovery.some(r=>r.trigger==='secondWind'&&r.amount===1));const defense=features.find(f=>f.name==='Ghostveil Defense');assert.equal(defense.data.activation,'bonusAction');assert.deepEqual(defense.data.resistances,['bludgeoning','piercing','slashing']);assert.equal(defense.data.selfDamage.formula,'1d10');assert.ok(defense.data.text.rules[0].includes('- You can move through creatures'));const scout=features.find(f=>f.name==='Arcane Scout');assert.equal(scout.data.spellGrants[0].resolution.canonicalId,'dnd:spell:clairvoyance');assert.equal(scout.data.spellGrants[0].freeCast.consumesSpellSlot,false);const stride=features.find(f=>f.name==='Phantom Stride');assert.equal(stride.data.trigger,'reducedToZeroHitPoints');assert.equal(stride.data.hitPointReplacement,1);assert.deepEqual(stride.data.extraDamage,{formula:'2d8',type:'force'});const eye=features.find(f=>f.name==='Ethereal Eye');assert.equal(eye.data.spellGrants[0].resolution.canonicalId,'dnd:spell:arcane-eye');const riposte=features.find(f=>f.name==='Spectral Riposte');assert.equal(riposte.data.activation,'reaction');assert.equal(riposte.data.damageMitigation,'half');assert.equal(riposte.data.conditionalNoDamage,true);const mastery=features.find(f=>f.name==='Ethereal Mastery');assert.equal(mastery.data.trigger,'afterInitiative');assert.equal(mastery.data.duration,'1 minute');assert.equal(mastery.data.uses.fixed,2);assert.deepEqual(mastery.data.resistances,['radiant','necrotic','psychic','force']);assert.deepEqual(mastery.data.extraDamage,{formula:'2d8',type:'force'});});
