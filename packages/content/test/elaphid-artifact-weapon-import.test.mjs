import test from 'node:test';
import assert from 'node:assert/strict';
import { importDocument } from '../import-engine/index.mjs';

const text = `*Weapon (longsword), artifact (requires attunement by a Anyone attempting to attune might be overwhelmed by its heart-rending screams: each time they touch the sword, the user must succeed on an Intimidate check (Save 20 Charisma) to silence it, or suffer terrible pain (2d12 psychic points) every turn they wield the weapon. If the character is reduced to 0 HP, by failing to attune, his/her head explode. After ten consecutive successful attempts, the attunement is successful.)*

Sentient artifact: INT 2, WIS 6, CHA 8.

Alignment: Chaotic Evil.

Can communicate only telepathically and through sensation and emotion. It knows no language. The sword is blind and deaf.

Versatile longsword +3 accurate: 1d8+3 slashing one-handed / 1d10+3 slashing two-handed.

The sword has Vorpal properties.

The sword has 6 charges of psychic damage: +2d8 additional psychic damage per attack.

Recharge time: 1d6 charges over 2 days.

Shouts of the Balor: When you deal psychic damage to an opponent by expending a charge of Elaphid, they must make a Wisdom saving throw of 16 or become confused and frightened for 1d4 turns. To end the condition, repeat the saving throw every remaining turn until it is successful.

The sword has 10 charges for the following properties, the sword regains 1d8+2 expended charges daily at dawn. Spells: Cure Wounds - 1 charge. Magic Weapon - 2 charges. Elemental Weapon - 3 charges. Staggering Smite - 4 charges.

The sword cannot communicate and cannot hear anything… Anyone attempting to attune (except Èrakos) might be overwhelmed by its heart-rending screams: each time they touch the sword, the user must succeed on an Intimidate check (Save 20 Charisma) to silence it, or suffer terrible pain (2d12 psychic points) every turn they wield the weapon. If the character is reduced to 0 HP, by failing to attune, his/her head explode. After ten consecutive successful attempts, the attunement is successful.

The sword is terrified of Èrakos.

Proficiency with a Longsword allows you to add your proficiency bonus to the attack roll for any attack you make with it.

---

This weapon has the following mastery property. To use this property, you must have a feature that lets you use it.

[***Sap***](https://www.dndbeyond.com/sources/dnd/free-rules/equipment#Sap)***.*** If you hit a creature with this weapon, that creature has Disadvantage on its next attack roll before the start of your next turn.
`;

test('Elaphid-like artifact weapon keeps base weapon mechanics, progressive attunement and two independent charge pools', () => {
  const out = importDocument(text, { kind: 'item', format: 'markdown', sourceName: 'elaphid.md' });
  const item = out.entities[0];
  assert.equal(item.name.toLowerCase(), 'elaphid');
  assert.equal(item.data.itemKind, 'weapon');
  assert.equal(item.data.rarity, 'artifact');
  assert.equal(item.data.baseWeapon, 'longsword');
  assert.equal(item.data.attackBonus, 3);
  assert.deepEqual(item.data.damageModes, [
    { formula: '1d8+3', type: 'slashing', hands: 1 },
    { formula: '1d10+3', type: 'slashing', hands: 2 },
  ]);
  assert.ok(item.data.properties?.includes('versatile'));
  assert.ok(item.data.properties?.includes('vorpal'));
  assert.equal(item.data.mastery?.name, 'Sap');

  assert.deepEqual(item.data.sentience?.abilities, { INT: 2, WIS: 6, CHA: 8 });
  assert.equal(item.data.sentience?.alignment, 'chaotic evil');
  assert.equal(item.data.sentience?.telepathy, true);
  assert.equal(item.data.sentience?.knowsLanguages, false);
  assert.equal(item.data.sentience?.blind, true);
  assert.equal(item.data.sentience?.deaf, true);

  assert.equal(item.data.attunementDetails?.mode, 'progressiveCheck');
  assert.equal(item.data.attunementDetails?.check?.skill, 'intimidation');
  assert.equal(item.data.attunementDetails?.check?.ability, 'CHA');
  assert.equal(item.data.attunementDetails?.check?.dc, 20);
  assert.equal(item.data.attunementDetails?.successesRequired, 10);
  assert.equal(item.data.attunementDetails?.failureDamage?.formula, '2d12');
  assert.equal(item.data.attunementDetails?.failureDamage?.type, 'psychic');
  assert.ok(item.data.attunementDetails?.exceptions?.includes('Èrakos'));

  assert.equal(item.data.resources?.length, 2);
  const psychic = item.data.resources.find(x => x.id === 'psychic-charges');
  assert.equal(psychic.max, 6);
  assert.equal(psychic.spend, 1);
  assert.equal(psychic.damage?.formula, '2d8');
  assert.equal(psychic.damage?.type, 'psychic');
  assert.equal(psychic.recovery?.formula, '1d6');
  assert.equal(psychic.recovery?.intervalDays, 2);

  const spell = item.data.resources.find(x => x.id === 'spell-charges');
  assert.equal(spell.max, 10);
  assert.equal(spell.recovery?.formula, '1d8+2');
  assert.equal(spell.recovery?.timing, 'dawn');
  assert.deepEqual(spell.spells?.map(x => [x.name, x.cost]), [
    ['Cure Wounds', 1], ['Magic Weapon', 2], ['Elemental Weapon', 3], ['Staggering Smite', 4],
  ]);

  const shout = item.data.activities?.find(x => x.name === 'Shouts of the Balor');
  assert.equal(shout?.trigger?.resourceId, 'psychic-charges');
  assert.equal(shout?.save?.ability, 'WIS');
  assert.equal(shout?.save?.dc, 16);
  assert.ok(shout?.conditions?.includes('confused'));
  assert.ok(shout?.conditions?.includes('frightened'));
  assert.equal(shout?.duration?.formula, '1d4');
  assert.equal(shout?.duration?.unit, 'turn');
});
