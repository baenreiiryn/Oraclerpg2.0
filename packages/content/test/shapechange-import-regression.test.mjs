import test from 'node:test';
import assert from 'node:assert/strict';
import { importDocument } from '../import-engine/index.mjs';

const lycanthrope = `Werewolf Sentinel
Medium Monstrosity, Chaotic Neutral
AC 14
HP 58 (9d8 + 18)
Speed 30 ft.
STR 16 +3 +5
DEX 14 +2 +2
CON 15 +2 +4
INT 10 +0 +0
WIS 12 +1 +3
CHA 10 +0 +0
Senses Passive Perception 13
Languages Common
CR 3 (XP 700; PB +2)
Traits
Shapechanger. As an action, the werewolf can change into a wolf-humanoid hybrid or into a wolf, or back into its true form. Its game statistics, other than its AC, are the same in each form. Any equipment it is wearing or carrying is not transformed. It reverts to its true form if it dies.
Actions
Claw. Melee Weapon Attack: +5 to hit, reach 5 ft. Hit: 7 (1d8+3) Slashing damage.`;

const doppelganger = `Mirror Stalker
Medium Monstrosity, Neutral
AC 14
HP 52 (8d8 + 16)
Speed 30 ft.
STR 11 +0 +0
DEX 18 +4 +6
CON 14 +2 +2
INT 11 +0 +0
WIS 12 +1 +3
CHA 14 +2 +4
Senses Darkvision 60 ft.; Passive Perception 13
Languages Common
CR 3 (XP 700; PB +2)
Traits
Shapechanger. The doppelganger can use its action to polymorph into a Small or Medium humanoid it has seen, or back into its true form. Its statistics, other than its size, are the same in each form. Any equipment it is wearing or carrying is not transformed. It reverts to its true form if it dies.
Actions
Slam. Melee Weapon Attack: +6 to hit, reach 5 ft. Hit: 7 (1d6+4) Bludgeoning damage.`;

const vampire = `Night Sovereign
Medium Undead, Lawful Evil
AC 16
HP 144 (17d8 + 68)
Speed 30 ft.
STR 18 +4 +9
DEX 18 +4 +9
CON 18 +4 +9
INT 17 +3 +3
WIS 15 +2 +7
CHA 18 +4 +9
Senses Darkvision 120 ft.; Passive Perception 17
Languages Common
CR 13 (XP 10,000; PB +5)
Traits
Shapechanger. If the vampire is not in sunlight or running water, it can use its action to polymorph into a Tiny bat or a Medium cloud of mist, or back into its true form. Its statistics are the same in each form. Any equipment it is wearing or carrying is not transformed. It reverts to its true form if it dies. In bat form, it cannot speak and has a flying speed of 30 feet. In mist form, it cannot take actions or speak, has a flying speed of 20 feet, and can hover.
Actions
Unarmed Strike. Melee Weapon Attack: +9 to hit, reach 5 ft. Hit: 8 (1d8+4) Bludgeoning damage.`;

const selkieSpecies = `### Selkie Traits

**Dual Nature.** You can live as a humanoid or seal.

**Shapechanger.** As an action, you can change into your seal form or revert to your original form. Your game statistics, other than your speed, remain the same. Any equipment you are wearing or carrying is not transformed. You revert to your original form if you are reduced to 0 hit points.

#### Seal Form

When you change into your seal form, your size is medium and you are unable to wield weapons or cast spells. You retain the same amount of hit points.

**Natural Weapon**

Your bite is a natural weapon that deals 1d4 piercing damage.`;

test('fixed-form lycanthrope monster keeps form options and preservation rules', () => {
  const out=importDocument(lycanthrope,{kind:'monster',sourceName:'werewolf-sentinel.md'});
  const m=out.entities[0];
  assert.equal(m.data.formChanges.length,1);
  const c=m.data.formChanges[0];
  assert.equal(c.activation,'action');
  assert.equal(c.mode,'fixedForms');
  assert.ok(c.forms.some(x=>x.id==='hybrid'));
  assert.ok(c.forms.some(x=>x.id==='wolf'));
  assert.deepEqual(c.preservation.exceptions,['ac']);
  assert.equal(c.equipment.transforms,false);
  assert.equal(c.revertOnDeath,true);
});

test('doppelganger-style shapechange is modeled as copied target rather than fake fixed form', () => {
  const out=importDocument(doppelganger,{kind:'monster',sourceName:'mirror-stalker.md'});
  const c=out.entities[0].data.formChanges[0];
  assert.equal(c.mode,'copyTarget');
  assert.equal(c.target.kind,'humanoid');
  assert.deepEqual(c.target.sizes.sort(),['medium','small']);
  assert.equal(c.target.seenRequired,true);
  assert.deepEqual(c.preservation.exceptions,['size']);
});

test('vampire-style shapechange preserves restrictions and form-specific capabilities', () => {
  const out=importDocument(vampire,{kind:'monster',sourceName:'night-sovereign.md'});
  const c=out.entities[0].data.formChanges[0];
  assert.equal(c.mode,'fixedForms');
  assert.deepEqual(c.restrictions.sort(),['runningWater','sunlight']);
  const bat=c.forms.find(x=>x.id==='bat'),mist=c.forms.find(x=>x.id==='mist');
  assert.ok(bat); assert.ok(mist);
  assert.equal(bat.size,'tiny'); assert.equal(bat.speed.fly,30); assert.equal(bat.canSpeak,false);
  assert.equal(mist.size,'medium'); assert.equal(mist.speed.fly,20); assert.equal(mist.canTakeActions,false); assert.equal(mist.canSpeak,false); assert.equal(mist.hover,true);
});

test('a second playable species with a single alternate form uses the same form-state model', () => {
  const out=importDocument(selkieSpecies,{kind:'species',sourceName:'selkie.md'});
  const s=out.entities[0];
  assert.equal(s.data.forms.length,1);
  const seal=s.data.forms[0];
  assert.equal(seal.id,'seal');
  assert.equal(seal.size,'medium');
  assert.equal(seal.canUseWeapons,false);
  assert.equal(seal.canCastSpells,false);
  assert.equal(seal.naturalWeapons[0].damage.formula,'1d4');
  assert.deepEqual(seal.naturalWeapons[0].damage.types,['piercing']);
  assert.equal(s.data.formChange.activation,'action');
  assert.deepEqual(s.data.formChange.options,['seal']);
  assert.equal(s.data.formChange.revertAtZeroHp,true);
});
