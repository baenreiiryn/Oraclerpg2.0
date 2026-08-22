import test from 'node:test';
import assert from 'node:assert/strict';
import { hardenMarkdown, importDocument } from '../import-engine/index.mjs';

const fireBolt={canonicalId:'dnd:spell:fire-bolt',entityType:'spell',name:'Fire Bolt'};
const mistyStep={canonicalId:'dnd:spell:misty-step',entityType:'spell',name:'Misty Step'};
const rope={canonicalId:'dnd:item:rope',entityType:'item',name:'Rope'};
const arrows={canonicalId:'dnd:item:arrows',entityType:'item',name:'Arrows'};

test('species accepts irregular heading depth, em-dash metadata and bold-only traits',()=>{
 const md=`### Cambion\n\n**Size.** Medium\n**Speed —** 30 feet\n**Languages.** Common, Infernal\n\n**Darkvision.** You can see in darkness.\n\n**Infernal Legacy.** You know the {@spell Fire Bolt} cantrip.`;
 const out=importDocument(md,{kind:'species',format:'markdown',sourceName:'cambion.md',compendium:[fireBolt]});
 const species=out.entities[0];
 assert.equal(species.name,'Cambion');
 assert.equal(species.data.speed,30);
 assert.deepEqual(species.data.traits.map(x=>x.name),['Darkvision','Infernal Legacy']);
 assert.equal(species.data.spellGrants[0].resolution.canonicalId,fireBolt.canonicalId);
});

test('background accepts plain/bold title, dotted fields, inline equipment and bold feature',()=>{
 const md=`**Ruined Scholar**\n\n**Skill Proficiencies.** Choose 2 skills: Arcana, History, Investigation\n**Languages —** Choose 1 language\nStarting Equipment — Backpack, 10 Torches, Rope\n\n**Feature: Researcher.** You usually know where obscure lore can be found.`;
 const out=importDocument(md,{kind:'background',format:'markdown',sourceName:'ruined-scholar.md'});
 const bg=out.entities[0];
 assert.equal(bg.name,'Ruined Scholar');
 assert.equal(bg.data.skillChoices.count,2);
 assert.equal(bg.data.languageChoices.count,1);
 assert.equal(bg.data.startingEquipment.length,3);
 assert.equal(out.entities.find(e=>e.name==='Researcher')?.data.featureKind,'backgroundFeature');
});

test('feat accepts deep title, prerequisite punctuation and bold bonus-action feature',()=>{
 const md=`#### Veil Adept\n\nPrerequisite — Level 4+\n\n**Bonus Action — Veil Step.** As a bonus action, you cast {@spell Misty Step}.`;
 const out=importDocument(md,{kind:'feat',format:'markdown',sourceName:'veil-adept.md',compendium:[mistyStep]});
 const feat=out.entities[0];
 assert.equal(feat.name,'Veil Adept');
 assert.equal(feat.data.prerequisite,'Level 4+');
 assert.equal(feat.data.activities[0].type,'bonusAction');
 assert.equal(feat.data.spellGrants[0].resolution.canonicalId,mistyStep.canonicalId);
});

test('container accepts plain title and comma-separated inline contents',()=>{
 const md=`Explorer's Pack\n*Equipment Pack*\n\nContents: Rope, 10 Torches, Bedroll\n\n**Use.** As an action, retrieve one stored item.`;
 const out=importDocument(md,{kind:'item',format:'markdown',sourceName:'explorers-pack.md',compendium:[rope]});
 const item=out.entities[0];
 assert.equal(item.name,"Explorer's Pack");
 assert.equal(item.data.container,true);
 assert.equal(item.data.containedItems.length,3);
 assert.equal(item.data.containedItems[0].resolution.canonicalId,rope.canonicalId);
 assert.equal(item.data.activities.length,1);
});

test('container accepts Item/Quantity Markdown tables without flattening quantities into prose',()=>{
 const md=`# Quiver of Plenty\n*Container*\n\n| Item | Quantity |\n| --- | ---: |\n| Arrows | 20 |\n| Rope | 1 |`;
 const out=importDocument(md,{kind:'item',format:'markdown',sourceName:'quiver.md',compendium:[arrows,rope]});
 const item=out.entities[0];
 assert.equal(item.data.container,true);
 assert.equal(item.data.containedItems.length,2);
 assert.equal(item.data.containedItems[0].name,'Arrows');
 assert.equal(item.data.containedItems[0].quantity,20);
 assert.equal(item.data.containedItems[0].resolution.canonicalId,arrows.canonicalId);
 assert.equal(item.data.containedItems[1].resolution.canonicalId,rope.canonicalId);
});

test('wrapper headings are flattened away while real nested traits survive',()=>{
 const md=`# Hollowborn\n\n## Species Traits\n\n### Hollow Sight\nYou see through magical darkness.\n\n### Grave Spark\nYou know {@spell Fire Bolt}.`;
 const normalized=hardenMarkdown(md,{expectedKind:'species',sourceName:'hollowborn.md'});
 assert.doesNotMatch(normalized,/Species Traits/);
 const out=importDocument(md,{kind:'species',format:'markdown',sourceName:'hollowborn.md',compendium:[fireBolt]});
 assert.deepEqual(out.entities[0].data.traits.map(x=>x.name),['Hollow Sight','Grave Spark']);
});

test('unknown references remain unresolved instead of creating duplicate entities',()=>{
 const md=`# Strange Satchel\n*Container*\n\nContents — Rope, Impossible Compass`;
 const out=importDocument(md,{kind:'item',format:'markdown',sourceName:'strange-satchel.md',compendium:[rope]});
 assert.equal(out.entities[0].data.containedItems.length,2);
 assert.equal(out.unresolved.length,1);
 assert.equal(out.unresolved[0].name,'Impossible Compass');
});
