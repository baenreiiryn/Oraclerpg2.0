import test from 'node:test';
import assert from 'node:assert/strict';
import { importDocument } from '../import-engine/index.mjs';

const text = `🜃 """""""The Unseen""""""" 🜃
Large unknown, Chaotic Neutral
AC 30 (natural armor)    Initiative +30 (40)
HP 264 (16d20 + 96)
Speed 25 ft., Fly 80 ft.
Mod Save
STR 27 +8 +17
DEX 30 +10 +19
CON 22 +6 +6
Mod Save
INT 29 +9 +18
WIS 23 +6 +15
CHA 19 +4 +4
Resistances All
Immunities Bludgeoning, Piercing, Poison, Slashing; Charmed, Deafened, Exhaustion, Frightened, Grappled, Paralyzed, Petrified, Poisoned, Prone, Unconscious
Senses Truesight 150 ft.; Passive Perception 33
Languages All, Telepathy 300 ft.
CR 30 (XP 155,000; PB +9)
Traits
Legendary Resistance (5/Day). Whenever the Unseen fails a Saving Throw, it can choose to succeed instead.
Supreme Invisibility. The Unseen is Invisible. Creatures who would normally be able to see through Invisibility cannot make out its true appearance, only being able to sense where it is.
Sound Nullification. An unsettling silence follows the Unseen, causing all sound to dissipate. All creatures within 30 ft. of the Unseen fall under the effects of the Silence spell.
Incorporeal Form. The Unseen can pass through creatures and objects as if moving through Difficult Terrain. Whenever it ends its turn within an object, it takes 25 (4d10) Force damage.
Soul Stealer. Whenever the Unseen reduces a creature to 0 Hit Points, that creature dies, the Unseen regains Hit Points equal to that creature's Hit Point maximum, and the Unseen gains an additional Action (there is no limit to how many times this can occur).
Soul Absorption. Whenever the Unseen kills a creature, it gains 1 Soul Point. It gains a +1 bonus to all d20 rolls, for each Soul Point it has. If it has 2 or more Soul Points, then it can expend those Soul Points at the start of any creature's turn (including itself) to regain 1 Legendary Action or recharge a Devastate Ability.
Devastate Abilities. The Unseen has the following Devastate Abilities (A Thousand Cuts, Vibrating Wave, Annihilate Consciousness, Mind Possession, and Telekinetic Grip). After using a Devastate Ability, it cannot be used again until the Unseen expends 2 Soul Points, lands a Critical Hit, or rolls a 5-6 on a d6 at the start of its turn.
Curse of the Marked Prey. Curse of the Marked Prey is a special condition applied only by the Unseen. An affected creature is Vulnerable to all damage, takes triple damage from Critical Hits, and their Armor Class is reduced by 3. Whenever the Unseen scores a Critical Hit on a creature, then that creature receives Curse of the Marked Prey.
Deadly Ambusher. The Unseen has Advantage on Initiative rolls and lands guaranteed Critical Hits against Surprised creatures. Whenever it rolls a 13 or higher when making an Initiative roll, it gains 2 additional Actions on its first turn of combat.
Vicious Critical. The Unseen lands Critical Hits on a 16-20. Whenever it scores a Critical Hit, then it rolls triple the damage dice instead of double.
Evasive Reflexes. Once per turn, when the Unseen takes damage, it takes half damage instead. Additionally, whenever the Unseen makes a Dexterity Saving Throw that deals damage, it reduces the incoming damage by 20.
Uncanny Agility. The Unseen has 1 Reaction per turn.
Actions
Multiattack. The Unseen makes three attacks using Deathly Slash or Disintegration Beam in any combination of its choice. It then uses two Devastate Abilities.
Deathly Slash. Melee Weapon Attack: +20 to hit, reach 15 ft., one target within range. Hit: 37 (4d10+10) Slashing damage plus 24 (3d10+10) Necrotic damage.
Disintegration Beam. Ranged Weapon Attack: +20 to hit, range 300 ft., one target within range. Hit: 70 (10d8+40) Force damage. If the target is reduced to 0 Hit Points, then their bodies are reduced to ash.
A Thousand Cuts (Devastate Ability). Make 5 Deathly Slash attacks. A creature cannot be reduced to 0 Hit Points by this ability.
Vibrating Wave (Devastate Ability). DC 27 Constitution Saving Throw: All creatures within a 120 ft. cone. Fail: 68 (12d6+30) Thunder damage and the affected creatures receive the Deafened and Frightened conditions until the end of their next turn. If the affected creatures failed by a 8 or lower on the Saving Throw, then they are also Stunned for 1 minute. Success: Half damage only.
Annihilate Consciousness (Devastate Ability). DC 27 Intelligence Saving Throw: One creature within 120 ft. that the Unseen can see. Fail: 39 (3d12+20) Psychic damage and the creature must roll a d20 and subtract their Intelligence score by an amount equal to the number rolled (this cannot reduce a creature's Intelligence past 1). Success: Half damage only.
Mind Possession (Devastate Ability). DC 27 Charisma Saving Throw: One creature within 120 ft. that the Unseen can see. Fail: The Unseen Possesses the target, controlling their body. The Unseen can't be targeted by any Attack, Spell, or other harmful effect, and it retains its Alignment, Intelligence, Wisdom, Charisma, and condition Immunities. It otherwise uses the Possessed target's statistics.
Telekinetic Grip (Devastate Ability). DC 27 Strength Saving Throw: One creature within 120 ft. of the Unseen. Fail: The target is suspended in midair by the telekinetic powers of the Unseen. The target is Restrained and takes 20 Force damage at the start of each turn while Restrained.
Bonus Actions
Distorting Teleport. The Unseen teleports to any unoccupied space within 60 ft. of itself. All creatures within 15 ft. of the Unseen after it teleports must succeed a DC 27 Charisma Saving Throw or takes 19 (3d10) Psychic damage and suffer the effects of the Confusion spell.
Consume Memories. DC 27 Intelligence Saving Throw: One creature within 120 ft. that the Unseen can see. Fail: 27 (5d10) Psychic damage and the Unseen steals one random memory (DM's choice) from the affected creature. Success: Half damage only.
Reactions
Devour Essence (Once per round). Trigger: A creature deals damage to the Unseen. Response: That creature must succeed a DC 27 Constitution Saving Throw or take 41 (6d10) Necrotic damage and have their Hit Point maximum reduced by an amount equal to the damage taken. If the target is below 80 Hit Points, then they must repeat the save or be reduced to 0 Hit Points.
Right Behind You. Trigger: A creature deals damage to the Unseen. Response: The Unseen teleports to any unoccupied space within 5 ft. of the attacker and makes two Deathly Slash attacks. If the Unseen is behind the attacker, then the attack is a guaranteed Critical Hit.
Legendary Actions
The Unseen has 3 Legendary Actions choosing out of the following options below. It can use one of the following Legendary Actions at the end of another creature's turn, and regains all expended Legendary Actions at the start of its next turn.
Life-Drain. DC 27 Constitution Saving Throw: All creatures within 30 ft. of the Unseen. Fail: 55 (10d10) Necrotic damage and the Unseen regains Hit Points equal to the total amount of damage dealt. Success: Half damage only.
Lethal Mind. DC 27 Intelligence Saving Throw: One creature within 120 ft. whose Intelligence score is below 14. Fail: 72 (20d8) Psychic damage and the target receives the Stunned condition until the end of their next turn. Success: Half damage only.
Face Snatch. Up to 3 creatures within 120 ft. that the Unseen must succeed a DC 27 Constitution Saving Throw or have their faces stolen, receiving the Blinded, Suffocating, and Deafened condition until the end of their next turn. Creatures that are Surprised are guaranteed to fail the save.`;

test('The Unseen preserves plain-text boss mechanics, custom resources, devastates and legendary economy', () => {
  const out=importDocument(text,{kind:'monster',format:'markdown',sourceName:'the-unseen.txt'});
  const m=out.entities[0];
  assert.equal(m.entityType,'monster');
  assert.equal(m.name,'The Unseen');
  assert.equal(m.data.size,'Large'); assert.equal(m.data.type,'unknown'); assert.equal(m.data.alignment,'Chaotic Neutral');
  assert.equal(m.data.ac,30); assert.equal(m.data.acDetails,'(natural armor)'); assert.equal(m.data.initiative.bonus,30); assert.equal(m.data.initiative.score,40);
  assert.equal(m.data.hp.value,264); assert.equal(m.data.hp.formula,'16d20 + 96'); assert.equal(m.data.speed.walk,25); assert.equal(m.data.speed.fly,80);
  assert.equal(m.data.abilities.STR.save,17); assert.equal(m.data.abilities.INT.score,29); assert.equal(m.data.abilities.WIS.save,15);
  assert.ok(m.data.resistances.includes('all')); assert.ok(m.data.immunities.includes('bludgeoning')); assert.ok(m.data.immunities.includes('unconscious'));
  assert.equal(m.data.senses.truesight,150); assert.equal(m.data.senses.passivePerception,33); assert.equal(m.data.telepathy.range,300); assert.equal(m.data.cr,30); assert.equal(m.data.pb,9);
  const lr=m.data.traits.find(x=>x.name.startsWith('Legendary Resistance')); assert.equal(lr?.legendaryResistance?.uses,5);
  const soul=m.data.traits.find(x=>x.name==='Soul Absorption'); assert.equal(soul?.resource?.gain?.amount,1); assert.equal(soul?.spend?.cost,2);
  const devastate=m.data.traits.find(x=>x.name==='Devastate Abilities'); assert.equal(devastate?.recharge?.min,5); assert.equal(devastate?.recharge?.max,6); assert.ok(devastate?.rechargeAlternatives?.includes('land a Critical Hit'));
  const curse=m.data.traits.find(x=>x.name==='Curse of the Marked Prey'); assert.equal(curse?.customCondition?.effects?.acModifier,-3); assert.equal(curse?.customCondition?.effects?.criticalDamageMultiplier,3);
  const crit=m.data.traits.find(x=>x.name==='Vicious Critical'); assert.equal(crit?.critical?.range?.min,16); assert.equal(crit?.critical?.damageDiceMultiplier,3);
  assert.equal(m.data.traits.find(x=>x.name==='Uncanny Agility')?.reactionsPerTurn,1);
  const multi=m.data.actions.find(x=>x.name==='Multiattack'); assert.equal(multi?.multiattack?.count,3); assert.equal(multi?.multiattack?.additional?.count,2);
  const slash=m.data.actions.find(x=>x.name==='Deathly Slash'); assert.equal(slash?.attack?.bonus,20); assert.equal(slash?.attack?.reach,15); assert.ok(slash?.damage?.some(x=>x.type==='necrotic'));
  const beam=m.data.actions.find(x=>x.name==='Disintegration Beam'); assert.equal(beam?.attack?.range,300); assert.ok(beam?.damage?.some(x=>x.type==='force'));
  const cuts=m.data.actions.find(x=>x.name==='A Thousand Cuts (Devastate Ability)'); assert.equal(cuts?.sequence?.count,5); assert.equal(cuts?.cannotReduceBelowHp,1);
  const wave=m.data.actions.find(x=>x.name==='Vibrating Wave (Devastate Ability)'); assert.equal(wave?.save?.ability,'CON'); assert.equal(wave?.save?.dc,27); assert.equal(wave?.area?.shape,'cone'); assert.equal(wave?.area?.size,120); assert.ok(wave?.conditionsApplied?.includes('Stunned'));
  assert.equal(m.data.bonusActions.find(x=>x.name==='Consume Memories')?.save?.ability,'INT');
  assert.equal(m.data.reactions.find(x=>x.name.startsWith('Devour Essence'))?.save?.dc,27);
  assert.equal(m.data.legendaryActionBudget,3);
  const lethal=m.data.legendaryActions.find(x=>x.name==='Lethal Mind'); assert.equal(lethal?.save?.ability,'INT'); assert.ok(lethal?.conditionsApplied?.includes('Stunned'));
  const face=m.data.legendaryActions.find(x=>x.name==='Face Snatch'); assert.ok(face?.conditionsApplied?.includes('Blinded')); assert.ok(face?.conditionsApplied?.includes('Suffocating')); assert.ok(face?.conditionsApplied?.includes('Deafened'));
});
