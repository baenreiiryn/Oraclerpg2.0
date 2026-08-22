import test from 'node:test';
import assert from 'node:assert/strict';
import { importDocument } from '../import-engine/index.mjs';

const text = `### Werewolf Traits

**Rewritten Biology.** The nature of your affliction has rewritten much of your base race’s physiology. Because of this, you retain no additional features attributed to your base race other than your ability score improvement, size, and languages.

**Darkvision.** You can see in dim light within 60 feet. You only have darkvision in hybrid and wolf form, and it is seen in shades of red.

**Shapechanger.** As an action, you can change into your hybrid or wolf form. Your game statistics, other than your AC, remain the same in each form. Any equipment you are wearing or carrying is not transformed. You revert to your original form when you take an action to revert back, or if you are reduced to 0 hit points.

**Perks of the Predator.** You gain proficiency in the Perception and Survival skills.

**Languages.** You know the same languages as your base race would. You can speak with other canines while in wolf or hybrid form.

#### Hybrid Form

When you change into your hybrid form, your size is medium. You are still able to use your weapons and cast spells unless your weapons are made for a Small creature. If you wear armor or clothing not specially made to accommodate your hybrid form, it falls off. You have advantage on Strength checks in this form. You retain the same amount of health as you would in your normal form.

**Natural Armor**

While in hybrid form, you have an AC of 10 + your Dexterity modifier + your Strength modifier. You can still wield a shield and benefit from this ability.

**Claws and Fangs**

These are natural weapons that you have proficiency with. They deal 1d4 slashing or piercing damage. On a hit against humanoids, the target must roll a Constitution save, DC being 8 + your proficiency + Wisdom Modifier, or be cursed with lycanthropy.

**Keen Senses**

You have advantage on Wisdom (Perception) checks that rely on hearing or smell.

**Terrifying Transformation**

When you shift into hybrid form, every creature of your choice within 60 feet that can see you transform must succeed on a Wisdom saving throw or be frightened until the end of its next turn. You can use this trait once and regain its use when you finish a long rest. The saving throw DC equals 8 + your proficiency bonus + your Charisma modifier. Other lycanthropes are immune.

#### Wolf Form

When you change into your wolf form, your size is medium and you are unable to wield weapons or cast spells. You retain the same amount of health.

**Natural Armor**

You have an AC of 10 + your Dexterity modifier + your Strength modifier.

**Fangs**

You gain a bite attack, a natural weapon you have proficiency with. It deals 1d4 piercing damage.

**Disguised Predator**

Others regard you as a regular wolf unless they succeed on a Wisdom (Insight) check opposed by your Charisma (Deception) check.

**Keen Senses**

You have advantage on Wisdom (Perception) checks that rely on hearing or smell.

**Pack Tactics**

You can use the Help action as a bonus action. You can use this trait a number of times equal to your Wisdom modifier, to a minimum of once. You regain all expended uses after a long rest.

### Random Height and Weight
Base height and weight can be taken from the base race's page.

### Suggested Characteristics
Flavor tables only.`;

test('werewolf template preserves base-race inheritance and form-scoped mechanics', () => {
  const out = importDocument(text, { kind: 'species', sourceName: 'werewolf.md' });
  const s = out.entities[0];
  assert.equal(s.name, 'Werewolf');
  assert.equal(s.data.template?.appliesTo, 'species');
  assert.deepEqual(s.data.template?.retains.sort(), ['abilityScoreImprovement','languages','size']);
  assert.equal(s.data.forms?.length, 2);
  const hybrid=s.data.forms.find(x=>x.name==='Hybrid Form'), wolf=s.data.forms.find(x=>x.name==='Wolf Form');
  assert.ok(hybrid); assert.ok(wolf);
  assert.equal(hybrid.size,'medium'); assert.equal(hybrid.canCastSpells,true); assert.equal(hybrid.canUseWeapons,true);
  assert.equal(hybrid.armorClass.formula,'10 + DEX + STR'); assert.equal(hybrid.armorClass.shieldCompatible,true);
  assert.equal(hybrid.naturalWeapons[0].damage.formula,'1d4'); assert.deepEqual(hybrid.naturalWeapons[0].damage.types.sort(),['piercing','slashing']);
  assert.equal(hybrid.naturalWeapons[0].onHit.save.ability,'CON'); assert.equal(hybrid.naturalWeapons[0].onHit.save.dcFormula,'8 + PB + WIS'); assert.equal(hybrid.naturalWeapons[0].onHit.effect,'lycanthropy');
  assert.equal(hybrid.terrifyingTransformation.activation,'onEnterForm'); assert.equal(hybrid.terrifyingTransformation.range,60); assert.equal(hybrid.terrifyingTransformation.save.ability,'WIS'); assert.equal(hybrid.terrifyingTransformation.save.dcFormula,'8 + PB + CHA'); assert.equal(hybrid.terrifyingTransformation.resource.max,1); assert.deepEqual(hybrid.terrifyingTransformation.resource.recovery,['longRest']);
  assert.equal(wolf.canCastSpells,false); assert.equal(wolf.canUseWeapons,false); assert.equal(wolf.naturalWeapons[0].damage.formula,'1d4'); assert.deepEqual(wolf.naturalWeapons[0].damage.types,['piercing']);
  assert.equal(wolf.disguise.contest.observer,'WIS:Insight'); assert.equal(wolf.disguise.contest.actor,'CHA:Deception');
  assert.equal(wolf.packTactics.activation,'bonusAction'); assert.equal(wolf.packTactics.action,'Help'); assert.equal(wolf.packTactics.resource.maxFormula,'max(1, WIS)'); assert.deepEqual(wolf.packTactics.resource.recovery,['longRest']);
  assert.equal(s.data.darkvision.range,60); assert.deepEqual(s.data.darkvision.forms.sort(),['hybrid','wolf']);
  assert.deepEqual(s.data.skillProficiencies.sort(),['perception','survival']);
  assert.equal(s.data.formChange.activation,'action'); assert.deepEqual(s.data.formChange.options.sort(),['hybrid','wolf']); assert.equal(s.data.formChange.revertAtZeroHp,true);
  assert.ok(!out.entities.some(x=>/Random Height|Suggested Characteristics/i.test(x.name)));
});