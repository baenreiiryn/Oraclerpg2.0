import test from 'node:test';
import assert from 'node:assert/strict';
import { importDocument } from '../import-engine/index.mjs';

const text = `*Unlike regular werewolves, this specific lineage carries the ****Legacy of the White Frost****. They are characterized by:*

- ***Draconic-Infused Fur:**** White, frost-coated fur that occasionally shimmers like dragon scales under the moonlight.*
- ***Piercing Dragon Eyes:**** Glowing cyan eyes with slitted pupils, a direct inheritance from their White Dragon grandfather.*
- ***Glacial Biology:**** Their internal temperature is sub-zero, allowing them to exhale icy mists and unleash a devastating freezing howl.*

*They are the bridge between two legendary predators—the relentless hunter and the ancient wyrm.*

## 🐺 Artic Werewolf Traits

Arctic Werewolves are formidable lycanthropes born of the frozen wastes.

#### ❄️ Frozen Blood

Your veins run with the essence of the tundra. You have **resistance to cold damage**, and you are naturally adapted to cold climates.

#### 🐺 Lycan Form

*As a **Bonus Action**, you can channel the dormant power of your ancestors and shift into a hybrid **Arctic Werewolf** form for **1 minute**.*

- ***Dragon-Claw Strike:**** Your unarmed strikes deal ****1d8 + Strength modifier**** Slashing damage.*
- ***Tundra Predator:**** increasing your walking speed by ****10 feet****.*
- ***Ancient Senses:**** You have ****Advantage**** on Wisdom (Perception) and Survival checks that rely on smell or tracking.*
- ***Terrifying Presence:**** You have ****Disadvantage**** on Charisma checks (except Intimidation) while in this form.*
- ***Frigid Evolution (Unlocks at Lv 6):**** You gain ****+1 AC**** and any creature that hits you with a melee attack within 5ft takes ****1d6 Cold damage****.*

*You can use this transformation once per ****Short or Long Rest***

#### 🌨️ Snow Stalker

As a predator born in the storm, Cloud is able to move silently across the snow. His footsteps leave no visible footprints.

#### 🧊 Glacial Bite

When an arctic werewolf locks its jaws on an enemy, its extreme body temperature is instantly released.

#### 🐺 Lupine Sence

Artic Werewolf closed his eyes for a moment, letting his ears catch the distant crack of a twig.

#### 🐾 Pack Tactics

The Arctic werewolf never hunts alone. When it sees an opening opened by its companion, its pack instincts take over.

#### 🌬️ Frost Presence

The temperature around the **Arctic Werewolf** drops sharply in a 10-foot radius, granting **Advantage on Charisma (Intimidation)** checks against creatures that can feel the cold.

#### ❄️ Frigid Plate

- **Reinforced Defense:** These scales grant a **+1 bonus to your Armor Class (AC)**.
- **Everfrost Spikes (Thorns):** Any creature within 5 feet that hits you with a melee attack takes **1d6 Cold damage**.
- **Rapid Regrowth:** These spikes are living extensions of your essence.

#### 🧊 Dragon-Blood Howl

When you howl, you release a blast of sub-zero arctic air in a 15-foot cone. Each creature in that area must make a **Constitution Saving Throw** (DC = 8 + your Strength modifier + your Proficiency bonus). On a failed save, a creature takes **4d8 Cold Damage** and its speed is reduced to **0** until the start of your next turn. On a successful save, the creature takes half as much damage and its speed is not reduced.`;

test('complex Arctic Werewolf species is split into traits and safe mechanics', () => {
  const out = importDocument(text, { kind: 'species', sourceName: 'arctic-werewolf.md' });
  const species = out.entities[0];
  assert.match(species.name, /Artic Werewolf/i);
  assert.doesNotMatch(species.name, /Traits$/i);
  const traits = out.entities.slice(1);
  const byName = name => traits.find(x => x.name === name);
  for (const name of ['Frozen Blood','Lycan Form','Snow Stalker','Glacial Bite','Lupine Sence','Pack Tactics','Frost Presence','Frigid Plate','Dragon-Blood Howl']) assert.ok(byName(name), name);
  assert.equal(byName('Frozen Blood').data.mechanics.resistances[0], 'cold');
  const lycan = byName('Lycan Form').data.mechanics;
  assert.equal(lycan.activation, 'bonusAction');
  assert.equal(lycan.duration.value, 1); assert.equal(lycan.duration.unit, 'minute');
  assert.equal(lycan.resource.max, 1);
  assert.deepEqual(lycan.resource.recovery.sort(), ['longRest','shortRest']);
  assert.ok(lycan.effects.some(x => x.kind === 'unarmedDamage' && x.formula === '1d8 + STR'));
  assert.ok(lycan.effects.some(x => x.kind === 'speedBonus' && x.value === 10));
  assert.ok(lycan.effects.some(x => x.kind === 'armorClassBonus' && x.value === 1 && x.requiredLevel === 6));
  assert.ok(lycan.effects.some(x => x.kind === 'reactiveDamage' && x.formula === '1d6' && x.damageType === 'cold' && x.requiredLevel === 6));
  assert.ok(!out.entities.some(x => x.name === 'Dragon-Claw Strike'), 'nested Lycan effect must not become a fake standalone entity');
  const plate = byName('Frigid Plate').data.mechanics;
  assert.ok(plate.effects.some(x => x.kind === 'armorClassBonus' && x.value === 1));
  assert.ok(plate.effects.some(x => x.kind === 'reactiveDamage' && x.formula === '1d6' && x.damageType === 'cold'));
  const howl = byName('Dragon-Blood Howl').data.mechanics;
  assert.equal(howl.area.shape, 'cone'); assert.equal(howl.area.size, 15);
  assert.equal(howl.save.ability, 'CON'); assert.equal(howl.save.dcFormula, '8 + STR + PB');
  assert.equal(howl.damage.formula, '4d8'); assert.equal(howl.damage.type, 'cold');
  assert.equal(howl.onFail.speed, 0); assert.equal(howl.onSuccess.halfDamage, true);
  assert.equal(byName('Glacial Bite').data.mechanics.semanticOnly, true);
  assert.equal(byName('Pack Tactics').data.mechanics.semanticOnly, true);
});
