import fs from 'node:fs/promises';

const ROOT='packages/content/data/srd-5.2';
const URL='https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/class/class-bard.json';
const LIC='https://creativecommons.org/licenses/by/4.0/';
const CLASS_ID='dnd2024:2024:class:bard:srd-5.2';
const SUBCLASS_ID='dnd2024:2024:subclass:bard:lore:srd-5.2';
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const constant=value=>({type:'constant',value});
const runtime=path=>({type:'runtime',path});
const formula=formula=>({type:'formula',formula});
const pred=description=>({type:'custom',description});
const trigger=(event,description,extra={})=>({event,...(description?{description}:{}),...extra});
const entityRef=(entityType,name,canonicalId)=>({entityType,name,canonicalId});
const choice=(options,count=1)=>({kind:'enum',count,options});
const spellQuery=(lists,count=1,maxLevel=9)=>({kind:'tagQuery',count,entityTypes:['spell'],query:{all:[{field:'data.spellLists.name',operator:'in',value:lists},{field:'data.level',operator:'lte',value:maxLevel}]}});

function base(entityType,name,id,sourceKey){return {id,canonicalId:id,entityType,name,system:{gameSystem:'dnd2024',rulesVersion:'2024'},source:{sourceId:'srd-5.2',book:'XPHB',license:'CC-BY-4.0',licenseUrl:LIC},provenance:{origin:'import',provider:'5etools',sourceKey,adapterVersion:'0.4.0',mapperVersion:'0.4.0'},schemaVersion:1};}
function classFeatureId(name){return `dnd2024:2024:feature:bard:${slug(name)}:srd-5.2`;}
function subclassFeatureId(name){return `dnd2024:2024:feature:bard:lore:${slug(name)}:srd-5.2`;}
const featureRef=name=>entityRef('feature',name,classFeatureId(name));
const itemRef=name=>entityRef('item',name,`dnd2024:2024:item:${slug(name)}:srd-5.2`);
const rules=entries=>({rules:Array.isArray(entries)?entries:[]});

const source=await (await fetch(URL)).json();
const cls=source.class.find(x=>x.name==='Bard'&&x.source==='XPHB'&&x.srd52);
const sub=source.subclass.find(x=>x.className==='Bard'&&x.classSource==='XPHB'&&x.source==='XPHB'&&x.srd52&&['Lore','College of Lore'].includes(x.shortName??x.name));
const cf=(source.classFeature??[]).filter(x=>x.className==='Bard'&&x.classSource==='XPHB'&&x.srd52);
const sf=(source.subclassFeature??[]).filter(x=>x.className==='Bard'&&x.classSource==='XPHB'&&x.subclassSource==='XPHB'&&x.srd52&&['Lore','College of Lore'].includes(x.subclassShortName));
if(!cls||!sub) throw new Error('SRD 5.2 Bard/College of Lore not found');

const excluded=new Set(['Bard Subclass','Subclass Feature']);
const classDefs=[];const seen=new Set();
for(const f of cf){if(excluded.has(f.name))continue;const id=classFeatureId(f.name);if(seen.has(id))continue;seen.add(id);classDefs.push(f);}
const subDefs=sf.filter(x=>!['College of Lore'].includes(x.name));

const inspirationDie=l=>l>=15?12:l>=10?10:l>=5?8:6;
const cantrips=[2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4];
const prepared=[4,5,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22];
const standardSlots=[
[2,0,0,0,0,0,0,0,0],[3,0,0,0,0,0,0,0,0],[4,2,0,0,0,0,0,0,0],[4,3,0,0,0,0,0,0,0],[4,3,2,0,0,0,0,0,0],[4,3,3,0,0,0,0,0,0],[4,3,3,1,0,0,0,0,0],[4,3,3,2,0,0,0,0,0],[4,3,3,3,1,0,0,0,0],[4,3,3,3,2,0,0,0,0],[4,3,3,3,2,1,0,0,0],[4,3,3,3,2,1,0,0,0],[4,3,3,3,2,1,1,0,0],[4,3,3,3,2,1,1,0,0],[4,3,3,3,2,1,1,1,0],[4,3,3,3,2,1,1,1,0],[4,3,3,3,2,1,1,1,1],[4,3,3,3,3,1,1,1,1],[4,3,3,3,3,2,1,1,1],[4,3,3,3,3,2,2,1,1]
];

function classFeatureData(f){
 const d={featureKind:'classFeature',category:'bard',text:rules(f.entries)};
 switch(f.name){
  case 'Bardic Inspiration':
   d.classMechanics={dicePools:[{id:'bardic-inspiration',die:'d6',count:formula('max(1, @abilities.cha.mod)'),progression:{5:{die:'d8'},10:{die:'d10'},15:{die:'d12'}},recovery:[trigger('onRest','Long Rest')],transferable:true,recipientCap:constant(1),expiration:{value:constant(1),unit:'hour'}}],transferableResources:[{resourceId:'bardic-inspiration',from:'self',to:'creature',amount:constant(1),range:constant(60),duration:{value:constant(1),unit:'hour'},recipientCap:constant(1),consumeWhen:trigger('onFailedCheck','After the recipient fails a D20 Test and chooses to roll the die.'),predicate:pred('Recipient must be able to see or hear the Bard.')} ]};
   d.activities=[{id:'bardic-inspiration',name:'Bardic Inspiration',kind:'utility',activation:{type:'bonusAction',cost:1},target:{type:'creature',count:1},range:{type:'distance',distance:{value:60,unit:'ft'}},uses:{max:formula('max(1, @abilities.cha.mod)'),sharedResourceId:'bardic-inspiration',recovery:[{period:'longRest',amount:'all'}]},roll:{formula:'@scale.bard.inspiration',name:'Bardic Inspiration'},duration:{type:'timed',value:constant(1),unit:'hour'},description:'Grant one Bardic Inspiration die. The recipient can expend it after failing a D20 Test to add the die to the d20.'}];
   break;
  case 'Spellcasting':
   d.classMechanics={spellCollections:[{id:'bard-prepared-spells',kind:'prepared',sourceList:'Bard',capacity:runtime('class.bard.preparedSpells'),filter:{lists:['Bard']},replace:{timing:'levelUp',count:constant(1),fromCollectionId:'bard-prepared-spells',filter:{lists:['Bard']}}}],spellSlotPools:[{id:'bard-spell-slots',kind:'standard',progression:Object.fromEntries(standardSlots.map((row,i)=>[i+1,Object.fromEntries(row.map((v,j)=>[j+1,v]).filter(([,v])=>v>0))])),recovery:[{trigger:trigger('onRest','Long Rest'),restore:'all'}]}]};
   d.properties=['spellcasting-ability:charisma','spellcasting-focus:musical-instrument','prepared-spells'];
   break;
  case 'Expertise': d.proficiencyChoices=[{kind:'tagQuery',count:2,entityTypes:['proficiency'],query:{all:[{field:'kind',operator:'eq',value:'skill'},{field:'proficient',operator:'eq',value:true}]}}]; d.properties=['expertise-repeat:level-9']; break;
  case 'Jack of All Trades': d.modifiers=[{target:{domain:'abilityCheck'},mode:'bonus',value:formula('floor(@proficiency / 2)'),predicate:pred('Only an ability check that does not already include your Proficiency Bonus.')}]; break;
  case 'Font of Inspiration': d.classRules={resourceMutations:[{resourceId:'bardic-inspiration',trigger:trigger('onRest','Short Rest'),operation:'restoreAll'}]}; d.crossResourceRules=[{trigger:trigger('custom','Immediately after you expend a Bardic Inspiration use, you can expend a spell slot to regain one use.'),consume:{resourceId:'spell-slot:selected',amount:constant(1)},restore:{resourceId:'bardic-inspiration',amount:constant(1)}}]; break;
  case 'Countercharm': d.classMechanics={rerolls:[{target:'savingThrow',trigger:trigger('onFailedSave','You or a creature within 30 feet fails a save against Charmed or Frightened.'),mustUseNewRoll:true,advantage:true,predicate:pred('Target must be within 30 feet.')} ]}; d.activities=[{id:'countercharm',name:'Countercharm',kind:'utility',activation:{type:'reaction',trigger:trigger('onFailedSave','You or a creature within 30 feet fails a saving throw against Charmed or Frightened.')},target:{type:'creature',count:1},range:{type:'distance',distance:{value:30,unit:'ft'}},description:'Cause the saving throw to be rerolled with Advantage; the new roll must be used.'}]; break;
  case 'Magical Secrets': d.classMechanics={spellCollections:[{id:'bard-magical-secrets',kind:'prepared',sourceList:'Expanded Bard',capacity:runtime('class.bard.preparedSpells'),filter:{lists:['Bard','Cleric','Druid','Wizard']},replace:{timing:'levelUp',count:constant(1),fromCollectionId:'bard-prepared-spells',filter:{lists:['Bard','Cleric','Druid','Wizard']}}}]}; d.properties=['expands-prepared-spell-lists:bard,cleric,druid,wizard']; break;
  case 'Superior Inspiration': d.classRules={resourceMutations:[{resourceId:'bardic-inspiration',trigger:trigger('onInitiative','When you roll Initiative.'),operation:'setMinimum',value:constant(2)}]}; break;
  case 'Epic Boon': d.grants=[{type:'entity',choice:{kind:'tagQuery',count:1,entityTypes:['feature'],query:{all:[{field:'data.featCategory',operator:'eq',value:'epicBoon'}]}}}]; break;
  case 'Words of Creation': d.spellGrants=[{name:'Words of Creation',ability:'charisma',selections:[{mode:'prepared',spell:entityRef('spell','Power Word Heal','dnd2024:2024:spell:power-word-heal:srd-5.2')},{mode:'prepared',spell:entityRef('spell','Power Word Kill','dnd2024:2024:spell:power-word-kill:srd-5.2')}]}]; d.classMechanics={spellModifications:[{id:'words-of-creation-second-target',trigger:trigger('custom','When casting Power Word Heal or Power Word Kill.'),filter:{tags:['Power Word Heal','Power Word Kill']},changes:[{type:'targetCount',operation:'add',value:constant(1)}]}]}; d.properties=['second-target-within-10-feet-of-first']; break;
  case 'Ability Score Improvement': d.grants=[{type:'entity',choice:{kind:'tagQuery',count:1,entityTypes:['feature'],query:{all:[{field:'data.featureKind',operator:'eq',value:'feat'}]}}}]; break;
 }
 return d;
}

function subclassFeatureData(f){
 const d={featureKind:'subclassFeature',category:'bard-lore',text:rules(f.entries)};
 switch(f.name){
  case 'Bonus Proficiencies': d.proficiencyChoices=[{kind:'tagQuery',count:3,entityTypes:['proficiency'],query:{all:[{field:'kind',operator:'eq',value:'skill'}]}}]; break;
  case 'Cutting Words': d.activities=[{id:'cutting-words',name:'Cutting Words',kind:'utility',activation:{type:'reaction',trigger:trigger('custom','A visible creature within 60 feet makes a damage roll or succeeds on an ability check or attack roll.')},target:{type:'creature',count:1},range:{type:'distance',distance:{value:60,unit:'ft'}},roll:{formula:'@scale.bard.inspiration',name:'Bardic Inspiration'},description:'Expend one Bardic Inspiration use and subtract the die from the triggering roll.'}]; d.rollRules=[{id:'cutting-words-check',target:'abilityCheck',operation:'subtract',formula:'@scale.bard.inspiration',trigger:trigger('custom','After the creature succeeds on an ability check.')},{id:'cutting-words-attack',target:'attackRoll',operation:'subtract',formula:'@scale.bard.inspiration',trigger:trigger('custom','After the creature succeeds on an attack roll.')},{id:'cutting-words-damage',target:'damageRoll',operation:'subtract',formula:'@scale.bard.inspiration',trigger:trigger('custom','When the creature makes a damage roll.')}]; d.crossResourceRules=[{trigger:trigger('custom','Use Cutting Words.'),consume:{resourceId:'bardic-inspiration',amount:constant(1)},restore:{resourceId:'none',amount:constant(0)}}]; break;
  case 'Magical Discoveries': d.spellGrantChoices=[{id:'lore-magical-discoveries',count:2,options:[{name:'Choose spell',ability:'charisma',selections:[{mode:'prepared',query:'Any Cleric, Druid, or Wizard spell you can cast',count:1}]}],distinctAcrossRepeats:true}]; d.properties=['spell-lists:cleric,druid,wizard','counts-as-bard-spells']; break;
  case 'Peerless Skill': d.rollRules=[{id:'peerless-skill',target:'abilityCheck',operation:'add',formula:'@scale.bard.inspiration',trigger:trigger('onFailedCheck','After you fail an ability check.'),description:'Expend one Bardic Inspiration use and add the die, potentially turning the failure into a success.'}]; d.crossResourceRules=[{trigger:trigger('onFailedCheck','Use Peerless Skill.'),consume:{resourceId:'bardic-inspiration',amount:constant(1)},restore:{resourceId:'none',amount:constant(0)}}]; break;
 }
 return d;
}

const classFeatures=classDefs.map(f=>({...base('feature',f.name,classFeatureId(f.name),`XPHB:classFeature:Bard:${f.name}:${f.level}`),data:classFeatureData(f)}));
const subFeatures=subDefs.map(f=>({...base('feature',f.name,subclassFeatureId(f.name),`XPHB:subclassFeature:Bard:Lore:${f.name}:${f.level}`),data:subclassFeatureData(f)}));

const featureLevels=new Map(); for(const f of cf){if(!excluded.has(f.name)&&!featureLevels.has(f.name))featureLevels.set(f.name,f.level);} 
const byLevel=new Map(); for(const f of cf){if(excluded.has(f.name))continue;const id=classFeatureId(f.name);const arr=byLevel.get(f.level)??[];if(!arr.some(x=>x.entity?.canonicalId===id))arr.push({type:'entity',entity:featureRef(f.name)});byLevel.set(f.level,arr);} 
const asiLevels=[4,8,12,16]; for(const l of asiLevels){const arr=byLevel.get(l)??[];if(!arr.some(x=>x.entity?.name==='Ability Score Improvement'))arr.push({type:'entity',entity:featureRef('Ability Score Improvement')});byLevel.set(l,arr);} 
const advancement=Array.from({length:20},(_,i)=>{const level=i+1;const step={level,grants:byLevel.get(level)??[],scaleValues:{bardicInspirationDie:`d${inspirationDie(level)}`,cantrips:cantrips[i],preparedSpells:prepared[i]}};if(level===3)step.choices=[{kind:'tagQuery',count:1,entityTypes:['subclass'],query:{all:[{field:'data.parentClass.canonicalId',operator:'eq',value:CLASS_ID}]}}];if(level===9)step.choices=[{kind:'tagQuery',count:2,entityTypes:['proficiency'],query:{all:[{field:'kind',operator:'eq',value:'skill'},{field:'proficient',operator:'eq',value:true}]}}];return step;});

const bard={...base('class','Bard',CLASS_ID,'XPHB:class:Bard'),data:{hitDie:8,primaryAbilities:['charisma'],savingThrowProficiencies:['dexterity','charisma'],armorTraining:['light'],weaponProficiencies:['simple'],toolChoices:choice(['Musical Instrument'],3),skillChoices:{kind:'tagQuery',count:3,entityTypes:['proficiency'],query:{all:[{field:'kind',operator:'eq',value:'skill'}]}},equipmentBundles:[{id:'A',label:"Leather Armor, 2 Daggers, Musical Instrument, Entertainer's Pack, and 19 GP",grants:[{entity:itemRef('Leather Armor')},{entity:itemRef('Dagger'),quantity:2},{entity:itemRef("Entertainer's Pack")},{currency:{amount:19,currency:'gp'}}]},{id:'B',label:'90 GP',grants:[{currency:{amount:90,currency:'gp'}}]}],spellcasting:{type:'full',ability:'charisma',preparation:'prepared',focus:['musicalInstrument']},advancement,subclassLevel:3,text:rules(cls.entries)}};
const lore={...base('subclass','College of Lore',SUBCLASS_ID,'XPHB:subclass:Bard:Lore'),data:{parentClass:entityRef('class','Bard',CLASS_ID),subclassLevel:3,advancement:[3,6,14].map(level=>({level,grants:subFeatures.filter(x=>{const src=subDefs.find(f=>subclassFeatureId(f.name)===x.canonicalId);return src?.level===level;}).map(x=>({type:'entity',entity:entityRef('feature',x.name,x.canonicalId)}))})),text:rules(sub.entries)}};

async function load(file,entityType){try{return JSON.parse(await fs.readFile(`${ROOT}/${file}`,'utf8'));}catch{return {format:'oraclerpg-compendium',version:1,contentSource:'srd-5.2',entityType,count:0,items:[]};}}
async function mergeFile(file,entityType,newItems,replacePred){const doc=await load(file,entityType);doc.items=(doc.items??[]).filter(x=>!replacePred(x)).concat(newItems);doc.count=doc.items.length;await fs.writeFile(`${ROOT}/${file}`,JSON.stringify(doc,null,2)+'\n');}
await mergeFile('classes.json','class',[bard],x=>x.canonicalId===CLASS_ID);
await mergeFile('subclasses.json','subclass',[lore],x=>x.canonicalId===SUBCLASS_ID);
await mergeFile('class-features.json','feature',[...classFeatures,...subFeatures],x=>x.canonicalId?.startsWith('dnd2024:2024:feature:bard:'));

const report={status:'SUPPORTED',source:{classFeatureRecords:cf.length,subclassFeatureRecords:sf.length},oracle:{classes:1,subclasses:1,classFeatureDefinitions:classFeatures.length,subclassFeatureDefinitions:subFeatures.length,structuredDefinitions:[...classFeatures,...subFeatures].filter(x=>Object.keys(x.data).some(k=>!['featureKind','category','text'].includes(k))).length},progression:{levels:20,rows:advancement.map(x=>({level:x.level,...x.scaleValues}))},issues:[]};
await fs.writeFile(`${ROOT}/bard-import-report.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
