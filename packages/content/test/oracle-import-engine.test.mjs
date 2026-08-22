import test from 'node:test';
import assert from 'node:assert/strict';
import { importClass, parse5etoolsJson } from '../import-engine/index.mjs';

const bloodHunterMarkdown = `## Blood Hunter

#### Level 1: Hemocraft
You have survived the Hunter's Bane.

***Blood Curses.*** You learn 2 blood curses from the Blood Curse Options list.

#### Level 1: Weapon Mastery
Your training with weapons allows you to use two mastery properties.

#### Level 2: Crimson Rite
Choose one Crimson Rite from the list below.

***Rite of the Flame.*** The extra damage is Fire damage.

***Rite of the Frozen.*** The extra damage is Cold damage.

#### Level 2: Fighting Style
You gain a Fighting Style feat.

#### Level 3: Blood Hunter Subclass
You gain a Blood Hunter subclass of your choice.

#### Level 4: Ability Score Improvement
You gain a feat.

#### Level 5: Extra Attack
You can attack twice.

#### Level 6: Brand of Castigation
You brand a foe.

#### Level 7: Subclass Feature
You gain a subclass feature.

#### Level 8: Ability Score Improvement
You gain a feat.

#### Level 9: Grim Psychometry
You have the Identify spell prepared.

#### Level 10: Dark Augmentation
Your speed increases.

#### Level 11: Subclass Feature
You gain a subclass feature.

#### Level 12: Ability Score Improvement
You gain a feat.

#### Level 13: Improved Brand of Castigation
Your brand improves.

#### Level 14: Hardened Soul
You are immune to Charmed and Frightened.

#### Level 15: Subclass Feature
You gain a subclass feature.

#### Level 16: Ability Score Improvement
You gain a feat.

#### Level 17: Cursed Brand
Your curse improves.

#### Level 18: Subclass Feature
You gain a subclass feature.

#### Level 19: Epic Boon
You gain an Epic Boon.

#### Level 20: Sanguine Mastery
Your blood magic reaches its height.

## Order of the Ghostslayer

***Level 3: Rite of the Dawn.*** You learn the Rite of the Dawn.
***Level 3: Curse Specialist.*** You can invoke two blood curses.

#### Aether Walk
You step between planes.

#### Brand of Sundering
Your brand sunders spirits.

## Order of the Lycan

***Level 3: Hybrid Transformation.*** You transform into a hybrid form.

#### Stalker's Prowess
Your body grows stronger.

## Order of the Mutant

***Level 3: Mutagencraft.*** You learn mutagen formulae.

#### Alchemical Metabolism
You resist poison.

## Order of the Profane Soul

***Level 3: Otherworldly Attunement.*** Choose a creature type.

***Level 3: Pact Magic.*** You have learned to cast spells.

| Level | Cantrips Known | Spells Known | Spell Slots | Spell Slot Level |
| ----- | -------------- | ------------ | ----------- | ---------------- |
| 3     | 2              | 2            | 1           | 1                |
| 4     | 2              | 2            | 1           | 1                |
| 5     | 2              | 3            | 1           | 1                |
| 20    | 3              | 11           | 2           | 4                |

#### Mystic Frenzy
You can replace an attack with a cantrip.
`;

test('Oracle Import Engine compiles Blood Hunter-style Markdown into a class graph', () => {
  const result = importClass(bloodHunterMarkdown, { format: 'markdown', sourceName: 'classes.md' });
  const classEntry = result.entries.find((entry) => entry.category === 'classes');
  const subclasses = result.entries.filter((entry) => entry.category === 'subclasses');
  const classFeatures = result.entries.filter((entry) => entry.category === 'class-features');
  const subclassFeatures = result.entries.filter((entry) => entry.category === 'subclass-features');

  assert.equal(classEntry.name, 'Blood Hunter');
  assert.equal(classEntry.entity.data.advancement.length, 20);
  assert.equal(subclasses.length, 4);
  assert.ok(classFeatures.some((entry) => entry.name === 'Hemocraft' && entry.entity.data.level === 1));
  assert.ok(classFeatures.some((entry) => entry.name === 'Sanguine Mastery' && entry.entity.data.level === 20));
  assert.ok(subclassFeatures.some((entry) => entry.name === 'Rite of the Dawn' && entry.entity.data.level === 3));

  const level3 = classEntry.entity.data.advancement[2];
  assert.equal(level3.featureChoices[0].kind, 'subclass');
  assert.equal(level3.featureChoices[0].optionIds.length, 4);

  const pactMagic = subclassFeatures.find((entry) => entry.name === 'Pact Magic');
  assert.equal(pactMagic.entity.data.spellcastingProgression.type, 'pact');
  assert.equal(pactMagic.entity.data.spellcastingProgression.rows.at(-1)[4], '4');

  const aetherWalk = subclassFeatures.find((entry) => entry.name === 'Aether Walk');
  assert.equal(aetherWalk.entity.data.level, null);
  assert.equal(aetherWalk.entity.data.importStatus, 'partial');
  assert.ok(aetherWalk.entity.data.unresolved.some((item) => item.field === 'level'));
});

test('structured 5etools adapter keeps native mechanics instead of reparsing prose', () => {
  const ir = parse5etoolsJson({
    class: [{
      name: 'Oracle Knight', source: 'HB', hd: { number: 1, faces: 10 }, proficiency: ['str', 'con'],
      startingProficiencies: { armor: ['light', 'medium'], weapons: ['simple'] },
      classFeatures: ['Blood Mark|Oracle Knight|HB|1'],
    }],
    classFeature: [{ name: 'Blood Mark', className: 'Oracle Knight', classSource: 'HB', level: 1, entries: ['Mark a foe.'] }],
    subclass: [{ name: 'Order of Ash', shortName: 'Ash', className: 'Oracle Knight', classSource: 'HB', source: 'HB' }],
    subclassFeature: [{ name: 'Ashen Mark', className: 'Oracle Knight', subclassShortName: 'Ash', level: 3, entries: ['Your mark burns.'] }],
  });
  const cls = ir.entities[0];
  assert.equal(cls.data.hitDie, 10);
  assert.deepEqual(cls.data.savingThrows, ['str', 'con']);
  assert.ok(cls.children.some((child) => child.kind === 'classFeature' && child.name === 'Blood Mark'));
  assert.ok(cls.children.some((child) => child.kind === 'subclass' && child.children[0].name === 'Ashen Mark'));
});
