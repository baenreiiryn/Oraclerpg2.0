import fs from 'node:fs/promises';

const ROOT='packages/content/data/srd-5.2';
const CLASS_URL='https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/class/class-warlock.json';
const OPTIONS_URL='https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/optionalfeatures.json';
const LIC='https://creativecommons.org/licenses/by/4.0/';
const CLASS_ID='dnd2024:2024:class:warlock:srd-5.2';
const SUBCLASS_ID='dnd2024:2024:subclass:warlock:fiend:srd-5.2';
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const constant=value=>({type:'constant',value});
const runtime=path=>({type:'runtime',path});
const formula=formula=>({type:'formula',formula});
const pred=description=>({type:'custom',description});
const ref=(entityType,name,canonicalId)=>({entityType,name,canonicalId});
const item=name=>ref('item',name,`dnd2024:2024:item:${slug(name)}:srd-5.2`);
const spell=name=>ref('spell',name,`dnd2024:2024:spell:${slug(name)}:srd-5.2`);
const rules=entries=>({rules:Array.isArray(entries)?entries:[]});
const fid=name=>`dnd2024:2024:feature:warlock:${slug(name)}:srd-5.2`;
const iid=name=>`dnd2024:2024:feature:warlock:invocation:${slug(name)}:srd-5.2`;
const sfid=name=>`dnd2024:2024:feature:warlock:fiend:${slug(name)}:srd-5.2`;
function base(entityType,name,id,key){return{id,canonicalId:id,entityType,name,system:{gameSystem:'dnd2024',rulesVersion:'2024'},source:{sourceId:'srd-5.2',book:'XPHB',license:'CC-BY-4.0',licenseUrl:LIC},provenance:{origin:'import',provider:'5etools',sourceKey:key,adapterVersion:'1.0.0',mapperVersion:'1.0.0'},schemaVersion:1}}
function namesFromAdditional(additional){const out=[];for(const block of additional??[]){for(const bucket of ['prepared','known','innate','expanded']){for(const [level,list] of Object.entries(block?.[bucket]??{})){for(const raw of list??[]){if(typeof raw==='string')out.push({level:String(level).replace(/^s/,''),name:raw.split('|')[0]});}}}}return out}

const [src,opt]=await Promise.all([fetch(CLASS_URL).then(r=>r.json()),fetch(OPTIONS_URL).then(r=>r.json())]);
const cls=src.class.find(x=>x.name==='Warlock'&&x.source==='XPHB'&&x.srd52);
const sub=src.subclass.find(x=>x.className==='Warlock'&&x.classSource==='XPHB'&&x.shortName==='Fiend'&&x.source==='XPHB'&&x.srd52);
const cf=(src.classFeature??[]).filter(x=>x.className==='Warlock'&&x.classSource==='XPHB'&&x.srd52);
const sf=(src.subclassFeature??[]).filter(x=>x.className==='Warlock'&&x.classSource==='XPHB'&&x.subclassShortName==='Fiend'&&x.subclassSource==='XPHB'&&x.srd52);
const inv=(opt.optionalfeature??[]).filter(x=>x.source==='XPHB'&&x.srd52&&(x.featureType??[]).includes('EI')).sort((a,b)=>a.name.localeCompare(b.name));
if(!cls||!sub)throw new Error('SRD 5.2 Warlock/Fiend missing from 5etools');
if(!inv.length)throw new Error('No SRD 5.2 Eldritch Invocations found');

const excluded=new Set(['Warlock Subclass','Subclass Feature','Eldritch Invocation Options']);
const classDefs=[];for(const f of cf)if(!excluded.has(f.name)&&!classDefs.some(x=>x.name===f.name))classDefs.push(f);
const subDefs=[];for(const f of sf)if(!['Fiend Patron','The Fiend'].includes(f.name)&&!subDefs.some(x=>x.name===f.name))subDefs.push(f);
const table=(cls.classTableGroups??[]).find(x=>(x.colLabels??[]).some(v=>String(v).includes('Invocations')))?.rows??[];
const prepared=cls.preparedSpellsProgression??[],cantrips=cls.cantripProgression??[];
const invKnown=(cls.optionalfeatureProgression??[]).find(x=>(x.featureType??[]).includes('EI'))?.progression??[];
const arcanum=cls.spellsKnownProgressionFixedByLevel??{};

function classFeatureData(f){const d={featureKind:'classFeature',category:'warlock',text:rules(f.entries),sourcePayload:{entries:f.entries??[],level:f.level}};switch(f.name){
case 'Pact Magic': d.classMechanics={spellCollections:[{id:'warlock-cantrips',kind:'known',sourceList:'Warlock',capacity:runtime('class.warlock.cantripsKnown'),filter:{lists:['Warlock'],levels:[0]},replace:{timing:'levelUp',count:constant(1),fromCollectionId:'warlock-cantrips'}},{id:'warlock-prepared-spells',kind:'prepared',sourceList:'Warlock',capacity:runtime('class.warlock.preparedSpells'),filter:{lists:['Warlock'],minLevel:1,maxLevel:5},replace:{timing:'levelUp',count:constant(1),fromCollectionId:'warlock-prepared-spells'}}],spellSlotPools:[{id:'warlock-pact-slots',kind:'pact',progression:Object.fromEntries(table.map((r,i)=>[i+1,{slots:r[3]??0,slotLevel:r[4]??0}])),recovery:[{trigger:{event:'onRest',description:'Short or Long Rest'},restore:'all'}]}]};d.properties=['spellcasting-ability:charisma','spellcasting-focus:arcane-focus','pact-slots:short-or-long-rest','prepared-spells-change:level-up'];break;
case 'Eldritch Invocations': d.classRules={entityCollections:[{id:'warlock-eldritch-invocations',entityTypes:['feature'],capacity:runtime('class.warlock.invocationsKnown'),filter:{type:'predicate',predicate:{type:'field',field:'data.optionKind',operator:'eq',value:'eldritchInvocation'}},chooseOn:{event:'onLevelGain'},replace:{trigger:{event:'onLevelGain',description:'Whenever you gain a Warlock level.'},count:constant(1),filter:{type:'predicate',predicate:{type:'field',field:'data.optionKind',operator:'eq',value:'eldritchInvocation'}}}}]};d.properties=['invocations:1@1,3@2,5@5,6@7,7@9,8@12,9@15,10@18'];break;
case 'Magical Cunning': d.classRules={resourceMutations:[{resourceId:'warlock-pact-slots',trigger:{event:'custom',description:'Perform the 1-minute Magical Cunning rite.'},operation:'restore',value:formula('ceil(@resources.warlock-pact-slots.max / 2)'),usage:{uses:1,recovery:'longRest'},capAtMaximum:true}]};d.properties=['activation:1-minute-rite','restore:half-max-pact-slots-rounded-up','recovery:long-rest'];break;
case 'Ability Score Improvement': d.grants=[{type:'entity',choice:{kind:'tagQuery',count:1,entityTypes:['feature'],query:{all:[{field:'data.featureKind',operator:'eq',value:'feat'}]}}}];break;
case 'Contact Patron': d.spellGrants=[{name:'Contact Patron',ability:'charisma',minimumClassLevel:9,selections:[{mode:'prepared',spell:spell('Contact Other Plane'),alwaysPrepared:true,countsAgainstPreparedLimit:false,freeUses:constant(1),recovery:'longRest'}]}];d.properties=['contact-other-plane:always-prepared','contact-other-plane:free-once-per-long-rest','contact-other-plane:auto-save-success'];break;
case 'Mystic Arcanum': d.classRules={mysticArcanum:{11:{spellLevel:6,count:1,recovery:'longRest'},13:{spellLevel:7,count:1,recovery:'longRest'},15:{spellLevel:8,count:1,recovery:'longRest'},17:{spellLevel:9,count:1,recovery:'longRest'}}};d.properties=['one-spell-each:6th,7th,8th,9th','cast-without-slot:once-per-long-rest-each'];break;
case 'Epic Boon': d.grants=[{type:'entity',choice:{kind:'tagQuery',count:1,entityTypes:['feature'],query:{all:[{field:'data.featureKind',operator:'eq',value:'feat'},{field:'data.featCategory',operator:'eq',value:'epicBoon'}]}}}];d.properties=['recommended:Boon of Fate'];break;
case 'Eldritch Master': d.classRules={resourceMutations:[{resourceId:'warlock-pact-slots',trigger:{event:'custom',description:'Use Magical Cunning.'},operation:'restore',value:runtime('resources.warlock-pact-slots.max'),capAtMaximum:true}]};d.properties=['magical-cunning:restore-all-pact-slots'];break;
}return d}

function invocationData(o){return{featureKind:'classFeature',category:'warlock-invocation',optionKind:'eldritchInvocation',text:rules(o.entries),requirements:{prerequisite:o.prerequisite??[]},spellPayload:o.additionalSpells??[],resourcePayload:o.consumes??null,sourcePayload:{entries:o.entries??[],prerequisite:o.prerequisite??null,additionalSpells:o.additionalSpells??null,consumes:o.consumes??null,repeatable:o.repeatable??null}}}

function subclassFeatureData(f){const d={featureKind:'subclassFeature',category:'warlock-fiend',text:rules(f.entries),sourcePayload:{entries:f.entries??[],level:f.level}};switch(f.name){
case 'Fiend Spells': {const list=namesFromAdditional(sub.additionalSpells);d.spellGrants=list.map(x=>({name:'Fiend Spells',ability:'charisma',minimumClassLevel:Number(x.level)||3,selections:[{mode:'prepared',spell:spell(x.name),alwaysPrepared:true,countsAgainstPreparedLimit:false}]}));d.properties=['always-prepared','counts-as-warlock-spells'];break;}
case "Dark One's Blessing": d.classRules={temporaryHitPoints:[{trigger:{event:'custom',description:'When an enemy within the feature range dies.'},value:formula('@classes.warlock.level + @abilities.cha.mod')}]};break;
case "Dark One's Own Luck": d.activities=[{id:'dark-ones-own-luck',name:"Dark One's Own Luck",kind:'utility',activation:{type:'none'},target:{type:'self'},uses:{max:runtime('abilities.cha.mod'),recovery:[{period:'longRest',amount:'all'}]},description:'Add 1d10 to an eligible ability check or saving throw, as defined by the source rules.'}];break;
case 'Fiendish Resilience': d.classRules={entityCollections:[{id:'fiendish-resilience-damage-type',entityTypes:['damageType'],capacity:constant(1),filter:{kind:'enum',options:['acid','cold','fire','lightning','necrotic','poison','psychic','radiant','thunder']},chooseOn:{event:'onRest'}}]};d.properties=['resistance:selected-damage-type','selection:after-short-or-long-rest'];break;
case 'Hurl Through Hell': d.activities=[{id:'hurl-through-hell',name:'Hurl Through Hell',kind:'utility',activation:{type:'special'},uses:{max:constant(1),recovery:[{period:'longRest',amount:'all'}]},description:'Apply the source-defined banishment and damage rider after an eligible hit.'}];break;
}return d}

const features=[...classDefs.map(f=>({...base('feature',f.name,fid(f.name),`XPHB:classFeature:Warlock:${f.name}:${f.level}`),data:classFeatureData(f)})),...inv.map(o=>({...base('feature',o.name,iid(o.name),`XPHB:optionalFeature:EI:${o.name}`),data:invocationData(o)})),...subDefs.map(f=>({...base('feature',f.name,sfid(f.name),`XPHB:subclassFeature:Warlock:Fiend:${f.name}:${f.level}`),data:subclassFeatureData(f)}))];

const byLevel=new Map();for(const f of cf){if(excluded.has(f.name))continue;const a=byLevel.get(f.level)??[];const id=fid(f.name);if(!a.some(x=>x.entity?.canonicalId===id))a.push({type:'entity',entity:ref('feature',f.name,id)});byLevel.set(f.level,a)}
const advancement=Array.from({length:20},(_,i)=>{const level=i+1,row=table[i]??[];const x={level,grants:byLevel.get(level)??[],scaleValues:{invocationsKnown:invKnown[i]??row[0]??0,cantripsKnown:cantrips[i]??row[1]??0,preparedSpells:prepared[i]??row[2]??0,pactSlots:row[3]??0,pactSlotLevel:row[4]??0,mysticArcanum:arcanum[String(level)]??null}};if(level===3)x.choices=[{kind:'tagQuery',count:1,entityTypes:['subclass'],query:{all:[{field:'data.parentClass.canonicalId',operator:'eq',value:CLASS_ID}]}}];return x});
const warlock={...base('class','Warlock',CLASS_ID,'XPHB:class:Warlock'),data:{hitDie:8,primaryAbilities:['charisma'],savingThrowProficiencies:['wisdom','charisma'],armorTraining:['light'],weaponProficiencies:['simple'],skillChoices:{kind:'enum',count:2,options:['Arcana','Deception','History','Intimidation','Investigation','Nature','Religion']},equipmentBundles:[{id:'A',label:"Leather Armor, Sickle, 2 Daggers, Arcane Focus (Orb), Book, Scholar's Pack, 15 GP",grants:[{entity:item('Leather Armor')},{entity:item('Sickle')},{entity:item('Dagger'),quantity:2},{entity:item('Orb')},{entity:item('Book')},{entity:item("Scholar's Pack")},{currency:{amount:15,currency:'gp'}}]},{id:'B',label:'100 GP',grants:[{currency:{amount:100,currency:'gp'}}]}],spellcasting:{type:'pact',ability:'charisma',preparation:'prepared'},advancement,subclassLevel:3,text:rules(cls.entries??[])}};
const subBy=new Map();for(const f of subDefs){const a=subBy.get(f.level)??[];a.push({type:'entity',entity:ref('feature',f.name,sfid(f.name))});subBy.set(f.level,a)}
const fiend={...base('subclass','Fiend Patron',SUBCLASS_ID,'XPHB:subclass:Warlock:Fiend'),data:{parentClass:ref('class','Warlock',CLASS_ID),advancement:[3,6,10,14].map(level=>({level,grants:subBy.get(level)??[]})),text:rules(sub.entries??[]),sourcePayload:{additionalSpells:sub.additionalSpells??[]}}};

async function read(file,type){try{return JSON.parse(await fs.readFile(`${ROOT}/${file}`,'utf8'))}catch{return{format:'oraclerpg-compendium',version:1,contentSource:'srd-5.2',entityType:type,count:0,items:[]}}}
function upsert(doc,xs){const ids=new Set(xs.map(x=>x.canonicalId));doc.items=doc.items.filter(x=>!ids.has(x.canonicalId)).concat(xs).sort((a,b)=>a.name.localeCompare(b.name));doc.count=doc.items.length;return doc}
await fs.writeFile(`${ROOT}/classes.json`,JSON.stringify(upsert(await read('classes.json','class'),[warlock]),null,2)+'\n');
await fs.writeFile(`${ROOT}/subclasses.json`,JSON.stringify(upsert(await read('subclasses.json','subclass'),[fiend]),null,2)+'\n');
await fs.writeFile(`${ROOT}/class-features.json`,JSON.stringify(upsert(await read('class-features.json','feature'),features),null,2)+'\n');
const report={status:'SUPPORTED',class:'Warlock',subclass:'Fiend Patron',sourceClassFeatures:cf.length,canonicalClassFeatures:classDefs.length,eldritchInvocations:inv.length,sourceSubclassFeatures:sf.length,canonicalSubclassFeatures:subDefs.length,progressionRows:20,issues:[]};
await fs.writeFile(`${ROOT}/warlock-import-report.json`,JSON.stringify(report,null,2)+'\n');
console.log(report);
