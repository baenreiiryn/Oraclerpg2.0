import test from 'node:test';
import assert from 'node:assert/strict';
import { importDocument } from '../import-engine/index.mjs';

const text = `[**𝕾𝖎𝖊𝖌𝖋𝖗𝖎𝖊𝖉 𝖙𝖍𝖊 𝖉𝖗𝖆𝖈𝖔𝖓𝖎𝖈 𝖐𝖓𝖎𝖌𝖍𝖙**](https://www.dndbeyond.com/monsters/6692634-siegfried-the-draconic-knight)

*Large Humanoid (Barbarian, Half-Black Dragon, Sorcerer, Warforged, Warlock), Chaotic Good*

**AC** 31    **Initiative** +16 (26)

**HP** 500 (20d20 + 200)

**Speed** 70 ft., Fly 120 ft. Sprouts black draconic wings (no action required) and gives Siegfried the ability to fly. The draconic wings last for 10 minutes before slowly withering away. , Climb 45 ft.

| ModSave |    |     |     |
| ------- | -- | --- | --- |
| STR     | 30 | +10 | +29 |
| DEX     | 30 | +10 | +29 |
| CON     | 30 | +10 | +19 |
| INT     | 8  | −1  | −1  |
| WIS     | 8  | −1  | −1  |
| CHA     | 30 | +10 | +10 |

**Skills** Intimidation +16
**Resistances** Lightning, Poison
**Immunities** Acid; Exhaustion, Poisoned, Prone, Restrained
**Gear** Vicious Greatsword, Adamantine Half Plate
**Senses** Blindsight 120 ft: segfried has no vision. Any creature out of A 240 foot diameter circle will not be perceived by siegfried.; Passive Perception 12
**Languages** Common, Draconic, Telepathy
**CR** 30 (XP 155,000; PB +9)

Traits

**Bloodied warriors aura**
Whenever a player enters 30 feet of Siegfried they must make a charisma saving throw, with DC of 10+ intimidation bonus.

**Graze**. If your attack roll with a Greatsword misses a creature, you can deal damage to that creature equal to the ability modifier you used to make the attack roll.

**Adamantine Armor:** has immunity to critical hits.

Actions

**Multiattack**. The knight makes two attacks, using a Vicious Greatsword.

**Vicious Greatsword. Melee Attack Roll:** +5, reach 5 ft. Hit: 10 (2d6 + 3+2d6) Slashing damage plus 4 (1d8) Radiant damage.

**Eldritch Blast**
You hurl 4 beam of crackling energy. Make a ranged spell attack against one creature or object in range per beam. On a hit, the target takes 1d10 Force damage per beam.

**Earthquake:** Choose a point on the ground that you can see within range. For the duration, an intense tremor rips through the ground in a 100-foot-radius circle centered on that point. The ground there is Difficult Terrain. When you cast this spell and at the end of each of your turns for the duration, each creature on the ground in the area makes a Dexterity saving throw. On a failed save, a creature has the Prone condition, and its Concentration is broken.

Bonus Actions

**Summoning loyal companion**
Make a dexterity saving throw with disadvantage, to open Sigfried's iron flask with a DC of 30. Upon a success releases Siegfried's Loyal steed a ancient copper dragon named Grim.

Reactions

**Parry**
*Trigger:* The knight is hit by a melee attack roll while holding a weapon. *Response:* The knight adds 2 to its AC against that attack, possibly causing it to miss.

Legendary Actions

**Siegfried's war cry of encouragement**
Once day Siegfried can cast (Mass Heal) without using a spell slot after it ends Siegfried's turn. Must be done before Siegfried have taken an action. Any creature that is been healed by Siegfried has (Advantage) on attacking rolls and are not affected by (Difficult Terrain) for 1 minute.

Mythic Actions

**Undying will**
Upon dropping to 0 hit points siegfried instead drops to 1 hit point and heals 4d10 once this ability has been used, it cannot be used again until 5 days later.
This uses up your mythical action but can be used at any time.`;

test('high-CR Siegfried monster keeps stat block, action economy, spell-like actions and mythic recovery', () => {
  const out = importDocument(text, { kind: 'monster', format: 'markdown', sourceName: 'siegfried.md', compendium: [
    { canonicalId:'dnd2024:item:vicious-greatsword', entityType:'item', name:'Vicious Greatsword' },
    { canonicalId:'dnd2024:item:adamantine-half-plate', entityType:'item', name:'Adamantine Half Plate' },
    { canonicalId:'dnd2024:spell:eldritch-blast', entityType:'spell', name:'Eldritch Blast' },
    { canonicalId:'dnd2024:spell:earthquake', entityType:'spell', name:'Earthquake' },
    { canonicalId:'dnd2024:spell:mass-heal', entityType:'spell', name:'Mass Heal' },
    { canonicalId:'dnd2024:monster:grim', entityType:'monster', name:'Grim' },
  ]});
  const m=out.entities[0];
  assert.equal(m.entityType,'monster');
  assert.match(m.name,/Siegfried the draconic knight/i);
  assert.equal(m.data.ac,31); assert.equal(m.data.hp.value,500); assert.equal(m.data.cr,30); assert.equal(m.data.pb,9);
  assert.equal(m.data.speed.walk,70); assert.equal(m.data.speed.fly,120); assert.equal(m.data.speed.climb,45); assert.equal(m.data.speed.flyDetails.duration.value,10);
  assert.equal(m.data.abilities.STR.score,30); assert.equal(m.data.abilities.STR.save,29); assert.equal(m.data.abilities.CON.save,19);
  assert.equal(m.data.senses.blindsight,120); assert.equal(m.data.senses.notes,'noVision');
  assert.ok(m.data.resistances.includes('lightning')); assert.ok(m.data.immunities.includes('acid'));
  assert.equal(m.data.actions.find(x=>x.name==='Multiattack')?.multiattack?.count,2);
  const sword=m.data.actions.find(x=>x.name.startsWith('Vicious Greatsword')); assert.equal(sword?.attack?.reach,5); assert.ok(sword?.damage?.some(x=>x.type==='radiant'));
  assert.equal(m.data.actions.find(x=>x.name==='Eldritch Blast')?.beams,4);
  assert.equal(m.data.actions.find(x=>x.name==='Earthquake')?.spellLike?.spell,'Earthquake');
  const summon=m.data.bonusActions.find(x=>x.name==='Summoning loyal companion'); assert.equal(summon?.activation,'bonusAction'); assert.equal(summon?.save?.dc,30); assert.equal(summon?.save?.disadvantage,true); assert.equal(summon?.summon?.creature,'Grim');
  const parry=m.data.reactions.find(x=>x.name==='Parry'); assert.equal(parry?.activation,'reaction'); assert.equal(parry?.acBonus?.value,2);
  const legendary=m.data.legendaryActions.find(x=>/war cry/i.test(x.name)); assert.equal(legendary?.spellGrant?.spell,'Mass Heal'); assert.equal(legendary?.recovery?.unit,'day');
  const mythic=m.data.mythicActions.find(x=>x.name==='Undying will'); assert.equal(mythic?.deathPrevention?.toHp,1); assert.equal(mythic?.healing?.formula,'4d10'); assert.equal(mythic?.recovery?.value,5);
  assert.ok(m.data.references.some(x=>x.name==='Eldritch Blast'&&x.resolution.status==='resolved'));
  assert.ok(m.data.references.some(x=>x.name==='Mass Heal'&&x.resolution.status==='resolved'));
});
