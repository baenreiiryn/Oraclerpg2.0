import test from 'node:test';
import assert from 'node:assert/strict';
import { importDocument } from '../import-engine/index.mjs';

const text = `vestige of war
*Armor (plate), artifact (requires attunement by a The Oath of Blood)*

The **Vestige of War** is an ancient and brutal suit of armor forged from scarlet-stained obsidian metal.
Once donned, the armor **cannot be removed willingly**.

### **Stats**
- **Armor Class**: 18 (plate)
- **Weight**: Heavy
- **Stealth**: The armor imposes **disadvantage on Dexterity (Stealth) checks**.
- **Strength Requirement**: The wearer must have a **Strength score of 18** or higher to wear this armor without penalty.

### **Properties**
- **Bloodlust**: The wearer gains a **+2 bonus to attack and damage rolls** with melee weapons.
  - When the wearer reduces a creature to **0 hit points**, they gain **temporary hit points equal to half the damage dealt**.
- **Eren’s Fury**: As a bonus action, the wearer can enter a **frenzied state** once per short or long rest. This frenzy lasts for **1 minute** and grants the following effects:
  - **Advantage on all melee attack rolls**.
  - **+15 feet to movement speed**.
  - The wearer suffers **disadvantage on Wisdom saving throws** during this frenzy.
  - **Aftermath**: Once the frenzy ends, the wearer gains **1 level of exhaustion**.
- **Relentless Assault**: When the wearer scores a **critical hit**, they can make **one additional melee weapon attack** as a reaction.
- **Unyielding Presence**: The armor emits a menacing **30-foot aura**.
  - Any creature hostile to the wearer that starts its turn within the aura must make a **DC 18 Wisdom saving throw**.
  - On a **failed save**, the creature becomes **frightened for 1 minute**.
  - On a successful save, the creature becomes **immune to this effect for 24 hours**.

### **Enhanced Properties (Post-Attunement)**
- **Battleborn Supremacy**: The wearer’s **Strength score increases by 4**, up to a maximum of **24**.
  - The wearer gains **proficiency in all melee weapons** and can use **Strength in place of Dexterity for Initiative rolls**.
- **Unrelenting Fury**: When the wearer enters a frenzied state using **Eren's Fury**, they can now maintain it for **2 minutes** instead of 1.
- **Crimson Devourer**: The **temporary hit points from Bloodlust** now also grant the wearer a **+2 bonus to AC** until the start of their next turn.
- **Warrior’s Immortality**: If the wearer is reduced to **0 hit points**, they can choose to remain at **1 hit point** instead. This effect can be used **once per long rest**.

### **Special Power - Blood Reckoning**
Once per month, the wearer can invoke **Blood Reckoning**. For **1 minute**:
- **Immunity to psychic damage** and **charmed and frightened conditions**.
- **Resistance to all damage except radiant damage**.
- **Attack rolls against the wearer have disadvantage**.
- The wearer can **add 4d10 additional slashing damage** to any melee attack they make.

**Aftermath**: After using Blood Reckoning, the wearer must make a **DC 22 Constitution saving throw**. On a failed save, they are wracked by the armor's hunger, taking **10d10 psychic damage** and becoming **incapacitated for 1d4 hours**.

### **Curses**
- **Insatiable Violence**: At the start of each combat, the wearer must make a **DC 17 Wisdom saving throw**. On a failed save, they must attack the nearest creature. If none are in sight, the wearer takes **1d10 psychic damage per round**.
- **Crimson Burden**: The Vestige of War cannot be removed willingly. The wearer must make a **DC 20 Wisdom saving throw** to attempt removal. On a failed save, they take **3d10 psychic damage** and become **cursed** until broken by **greater restoration** or **wish**.
- **Mark of the Berserker**: Creatures with insight into this mark gain **advantage on Wisdom (Insight) checks** to detect violent intentions.

### **Attunement Requirement - The Oath of Blood**
To attune, the wearer must perform the **Oath of Blood**.
- **Ritual**: battlefield, blood-soaked arena, or site of war.
- **Sacrifice**: defeat a worthy opponent in single combat.
- **Oath**: pledge their soul to the spirit of war.
- **Trial**: succeed on a **DC 22 Constitution saving throw**. On a failed save, take **12d10 psychic damage** and become unable to wear armor until the curse is broken.

### **Destruction**
The Vestige of War can only be destroyed in a moment of absolute **peace** in a sanctified battle-free zone blessed by a deity of pacifism, or by complete selfless mercy.
`;

test('Vestige of War imports as one artifact plate armor with staged powers, curses and ritual attunement', () => {
  const out = importDocument(text, { kind: 'item', format: 'markdown', sourceName: 'vestige-of-war.md' });
  const item = out.entities[0];
  assert.equal(item.name, 'Vestige of War');
  assert.equal(item.data.itemKind, 'armor');
  assert.equal(item.data.rarity, 'artifact');
  assert.equal(item.data.baseArmor, 'plate');
  assert.equal(item.data.armor?.ac, 18);
  assert.equal(item.data.armor?.strengthRequirement, 18);
  assert.equal(item.data.armor?.stealthDisadvantage, true);
  assert.equal(item.data.attunement, true);
  assert.equal(item.data.attunementDetails?.mode, 'ritualTrial');
  assert.equal(item.data.attunementDetails?.trial?.ability, 'CON');
  assert.equal(item.data.attunementDetails?.trial?.dc, 22);
  assert.equal(item.data.attunementDetails?.trial?.failureDamage?.formula, '12d10');
  assert.ok(item.data.properties?.some(x => x.name === 'Bloodlust'));
  const fury = item.data.properties?.find(x => x.name === 'Eren’s Fury');
  assert.equal(fury?.activation, 'bonusAction');
  assert.equal(fury?.duration?.value, 1);
  assert.deepEqual(fury?.recovery, ['shortRest','longRest']);
  assert.ok(item.data.enhancedProperties?.some(x => x.name === 'Battleborn Supremacy'));
  assert.ok(item.data.enhancedProperties?.some(x => x.name === 'Unrelenting Fury' && x.modifies === 'Eren’s Fury'));
  assert.ok(item.data.enhancedProperties?.some(x => x.name === 'Crimson Devourer' && x.modifies === 'Bloodlust'));
  const reckoning = item.data.activities?.find(x => x.name === 'Blood Reckoning');
  assert.equal(reckoning?.recharge?.period, 'month');
  assert.equal(reckoning?.duration?.value, 1);
  assert.equal(reckoning?.aftermath?.save?.ability, 'CON');
  assert.equal(reckoning?.aftermath?.save?.dc, 22);
  assert.equal(reckoning?.aftermath?.damage?.formula, '10d10');
  assert.equal(item.data.curses?.length, 3);
  assert.ok(item.data.curses?.some(x => x.name === 'Crimson Burden' && x.save?.dc === 20));
  assert.ok(item.data.curses?.some(x => x.name === 'Insatiable Violence' && x.save?.dc === 17));
  assert.ok(item.data.destruction?.conditions?.length >= 1);
});