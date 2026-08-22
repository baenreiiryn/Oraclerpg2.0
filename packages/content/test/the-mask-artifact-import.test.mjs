import test from 'node:test';
import assert from 'node:assert/strict';
import { importDocument } from '../import-engine/index.mjs';

const text = `*Wondrous Item, artifact*

An ancient green wooden mask with exaggerated features and a grin too wide to belong to any mortal creature.
Its eyes subtly move when nobody is watching.

**The Mask** is not merely magical.
It is alive!

# **Sentience**

**The Mask** is a sentient chaotic artifact with:

- Intelligence **18**
- Wisdom **16**
- Charisma **24**

It can:
- Understand all languages,
- Communicate telepathically with nearby creatures,
- Sense emotions,
- Subtly manipulate dreams.

# **Instant Attunement**
The moment a creature touches or even closely examines **The Mask** for the first time, **The Mask may immediately attune itself to that creature**.
This attunement:
- Ignores normal attunement limits,
- Requires no rest,
- Cannot be willingly refused.

# **The Mask Always Returns**
Once **The Mask** has attuned to a creature, separating from it becomes nearly impossible.
If discarded, destroyed, buried, sold, locked away, or thrown into water: **The Mask mysteriously reappears nearby after sunset**.

# **Nightbound Power**
**The Mask** functions only between sunset and sunrise.
During daylight it becomes inert and silent.

# **Shared Use**
A non-attuned wearer gains limited benefits for up to **10 minutes**:
- **Resistance** to fear,
- **Advantage** on Charisma checks.

# **Cartoon Logic**
While wearing **The Mask**:
- You are **immune** to fall damage.
- You can squeeze through impossibly small gaps.
- You can pull mundane objects from nowhere once per turn (DM discretion).
- Opportunity attacks against you are made with **disadvantage**.

# **Chaotic Arsenal**
### **Tommy Gun Frenzy** *(Recharge 10 minute)*
You conjure absurd magical firearms from nowhere.
Creatures in a 30-ft cone must make a Dexterity saving throw.
- Failure: **8d6** force damage
- Success: half damage

### **Aoooga!**
As a **bonus action**, you unleash supernatural charm energy.
Choose one creature within 60 ft.
It must succeed on a Wisdom saving throw or become:
- Charmed for 1 minute
- Incapacitated laughing for its next turn

### **Smokin’!**
Whenever you reduce a creature to 0 hit points or succeed critically on a Charisma check, you gain:
- Temporary hit points equal to your level
- **Advantage** on your next roll

# **Reality Rejection**
Whenever you fail an attack roll, ability check, or saving throw while wearing the mask, roll a **d6**:
| **d6Effect** | |
| ------------ | --- |
| 1 | You explode harmlessly into smoke and reappear 10 ft away |
| 2 | A random musical number begins nearby |
| 3 | Your pants disappear for 1 round |
| 4 | You are launched 20 ft upward |
| 5 | You summon 1d4 rubber chickens |
| 6 | Nothing happens… suspiciously |

# **Curse of Identity Erosion**
Each night spent wearing **The Mask** requires a Wisdom saving throw.
The DC begins at 10 and increases by 1 each consecutive night.
After 5 consecutive failed saves:
- The distinction between wearer and **The Mask** may disappear completely.
- Turning you into an NPC under DM control.
`;

test('The Mask imports as one artifact with structured sentience, abilities, random table and curse', () => {
  const out = importDocument(text, { kind: 'item', format: 'markdown', sourceName: 'the-mask.md' });
  const item = out.entities[0];
  assert.equal(item.name, 'The Mask');
  assert.equal(item.data.itemKind, 'wondrous');
  assert.equal(item.data.rarity, 'artifact');
  assert.deepEqual(item.data.sentience?.abilities, { INT: 18, WIS: 16, CHA: 24 });
  assert.equal(item.data.attunementDetails?.mode, 'instantForced');
  assert.equal(item.data.activationWindow?.from, 'sunset');
  assert.equal(item.data.activationWindow?.to, 'sunrise');
  assert.equal(item.data.activities.length, 3);
  const gun = item.data.activities.find(x => x.name === 'Tommy Gun Frenzy');
  assert.equal(gun.area?.shape, 'cone');
  assert.equal(gun.area?.size, 30);
  assert.equal(gun.save?.ability, 'DEX');
  assert.equal(gun.damage?.formula, '8d6');
  assert.equal(gun.damage?.type, 'force');
  assert.equal(gun.recharge?.value, 10);
  const charm = item.data.activities.find(x => x.name === 'Aoooga!');
  assert.equal(charm.activation, 'bonusAction');
  assert.equal(charm.range, 60);
  assert.equal(charm.save?.ability, 'WIS');
  assert.ok(charm.conditions?.includes('charmed'));
  assert.ok(item.data.randomTables?.some(t => t.name === 'Reality Rejection' && t.rows.length === 6));
  assert.equal(item.data.curse?.save?.ability, 'WIS');
  assert.equal(item.data.curse?.save?.baseDc, 10);
  assert.equal(item.data.curse?.save?.dcIncreasePerConsecutiveNight, 1);
  assert.equal(item.data.curse?.failureThreshold, 5);
  assert.equal(item.data.container, false);
});
