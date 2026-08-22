import test from 'node:test';
import assert from 'node:assert/strict';
import { importDocument } from '../import-engine/index.mjs';

const spell={canonicalId:'dnd:spell:fire-bolt',entityType:'spell',name:'Fire Bolt'};
const rope={canonicalId:'dnd:item:rope',entityType:'item',name:'Rope'};

test('species markdown produces traits, movement, languages and spell grants',()=>{
  const md=`# Emberkin\n\n**Size:** Medium\n**Speed:** 30 ft.\n**Languages:** Common and choose 1 language\n\n## Cinder Magic\nYou know the {@spell Fire Bolt} cantrip.\n\n## Ashen Resilience\nYou have resistance to fire damage.`;
  const out=importDocument(md,{kind:'species',format:'markdown',sourceName:'emberkin.md',compendium:[spell]});
  assert.equal(out.entities[0].name,'Emberkin');
  assert.equal(out.entities[0].data.speed,30);
  assert.equal(out.entities[0].data.traits.length,2);
  assert.equal(out.entities[0].data.spellGrants[0].resolution.canonicalId,spell.canonicalId);
});

test('background markdown preserves skill/language choices, equipment and features',()=>{
  const md=`# Ruin Scholar\n\n**Skill Proficiencies:** Choose 2 skills: Arcana, History, Investigation\n**Languages:** Choose 2 languages\n\n## Starting Equipment\n- 1 Scholar's Pack\n- 2 Ink Bottles\n\n## Researcher\nYou know where to find obscure information.`;
  const out=importDocument(md,{kind:'background',format:'markdown',sourceName:'ruin-scholar.md'});
  const bg=out.entities[0];
  assert.equal(bg.data.skillChoices.count,2);
  assert.equal(bg.data.languageChoices.count,2);
  assert.equal(bg.data.startingEquipment.length,2);
  assert.equal(out.entities[1].name,'Researcher');
});

test('feat markdown preserves prerequisite, activities and explicit spell references',()=>{
  const md=`# Ember Adept\n\n**Prerequisite:** Level 4+\n\n## Bonus Action: Ignite\nAs a bonus action, cast {@spell Fire Bolt}.`;
  const out=importDocument(md,{kind:'feat',format:'markdown',sourceName:'ember-adept.md',compendium:[spell]});
  const feat=out.entities[0];
  assert.equal(feat.data.prerequisite,'Level 4+');
  assert.equal(feat.data.activities[0].type,'bonusAction');
  assert.equal(feat.data.spellGrants[0].resolution.status,'resolved');
});

test('container item markdown preserves contents and resolves known references',()=>{
  const md=`# Explorer's Pack\n\n*Equipment Pack*\n\n## Contents\n- 1 Rope\n- 10 Torches\n\n## Use\nAs an action, you can retrieve an item from the pack.`;
  const out=importDocument(md,{kind:'item',format:'markdown',sourceName:'explorers-pack.md',compendium:[rope]});
  const item=out.entities[0];
  assert.equal(item.data.container,true);
  assert.equal(item.data.containedItems.length,2);
  assert.equal(item.data.containedItems[0].resolution.canonicalId,rope.canonicalId);
  assert.equal(out.unresolved.length,1);
});
