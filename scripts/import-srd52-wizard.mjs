import fs from 'node:fs/promises';

const ROOT='packages/content/data/srd-5.2';
const URL='https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/class/class-wizard.json';
const LIC='https://creativecommons.org/licenses/by/4.0/';
const CLASS_ID='dnd2024:2024:class:wizard:srd-5.2';
const SUBCLASS_ID='dnd2024:2024:subclass:wizard:evoker:srd-5.2';
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const constant=value=>({type:'constant',value});
const runtime=path=>({type:'runtime',path});
const formula=formula=>({type:'formula',formula});
const ref=(entityType,name,canonicalId)=>({entityType,name,canonicalId});
const item=name=>ref('item',name,`dnd2024:2024:item:${slug(name)}:srd-5.2`);
const rules=entries=>({rules:Array.isArray(entries)?entries:[]});
const fid=name=>`dnd2024:2024:feature:wizard:${slug(name)}:srd-5.2`;
const sfid=name=>`dnd2024:2024:feature:wizard:evoker:${slug(name)}:srd-5.2`;
function base(entityType,name,id,key){return{id,canonicalId:id,entityType,name,system:{gameSystem:'dnd2024',rulesVersion:'2024'},source:{sourceId:'srd-5.2',book:'XPHB',license:'CC-BY-4.0',licenseUrl:LIC},provenance:{origin:'import',provider:'5etools',sourceKey:key,adapterVersion:'1.0.0',mapperVersion:'1.0.0'},schemaVersion:1}}

const src=await fetch(URL).then(r=>{if(!r.ok)throw new Error(`5etools Wizard fetch failed: ${r.status}`);return r.json()});
const cls=(src.class??[]).find(x=>x.name==='Wizard'&&x.source==='XPHB'&&x.srd52);
const sub=(src.subclass??[]).find(x=>x.className==='Wizard'&&x.classSource==='XPHB'&&x.shortName==='Evoker'&&x.source==='XPHB'&&x.srd52);
const cf=(src.classFeature??[]).filter(x=>x.className==='Wizard'&&x.classSource==='XPHB'&&x.source==='XPHB'&&x.srd52);
const sf=(src.subclassFeature??[]).filter(x=>x.className==='Wizard'&&x.classSource==='XPHB'&&x.subclassShortName==='Evoker'&&x.subclassSource==='XPHB'&&x.source==='XPHB'&&x.srd52);
if(!cls||!sub)throw new Error('SRD 5.2 Wizard/Evoker missing from 5etools');

const excluded=new Set(['Wizard Subclass','Subclass Feature']);
const classDefs=[];for(const f of cf)if(!excluded.has(f.name)&&!classDefs.some(x=>x.name===f.name))classDefs.push(f);
const subDefs=[];for(const f of sf)if(f.name!=='Evoker'&&!subDefs.some(x=>x.name===f.name))subDefs.push(f);
const slots=(cls.classTableGroups??[]).find(x=>Array.isArray(x.rowsSpellProgression))?.rowsSpellProgression??[];
const cantrips=cls.cantripProgression??[];
const prepared=cls.preparedSpellsProgression??[];
const bookAdds=cls.spellsKnownProgressionFixed??[];

function classFeatureData(f){const d={featureKind:'classFeature',category:'wizard',text:rules(f.entries),sourcePayload:{entries:f.entries??[],level:f.level}};switch(f.name){
case 'Spellcasting':
 d.classMechanics={spellCollections:[
  {id:'wizard-cantrips',kind:'known',sourceList:'Wizard',capacity:runtime('class.wizard.cantripsKnown'),filter:{lists:['Wizard'],levels:[0]}},
  {id:'wizard-spellbook',kind:'spellbook',sourceList:'Wizard',capacity:null,filter:{lists:['Wizard'],minLevel:1,maxLevel:9},additions:{initial:constant(6),perLevel:constant(2),allowLowerLevel:true}},
  {id:'wizard-prepared-spells',kind:'prepared',sourceList:'Wizard',capacity:runtime('class.wizard.preparedSpells'),fromCollectionId:'wizard-spellbook',filter:{lists:['Wizard'],minLevel:1,maxLevel:9},replace:{timing:'longRest',count:runtime('class.wizard.preparedSpells'),fromCollectionId:'wizard-spellbook'}}
 ],spellSlotPools:[{id:'wizard-spell-slots',kind:'standard',progression:Object.fromEntries(slots.map((row,i)=>[i+1,Object.fromEntries(row.map((v,j)=>[j+1,v]).filter(([,v])=>v>0))])),recovery:[{trigger:{event:'onLongRest'},restore:'all'}]}]};
 d.properties=['spellcasting-ability:intelligence','spellcasting-focus:arcane-focus','prepared-spells-change:long-rest','spellbook:6-at-level-1','spellbook:+2-per-wizard-level'];break;
case 'Ritual Adept': d.properties=['ritual-casting:from-spellbook','ritual-spell:need-not-be-prepared'];break;
case 'Arcane Recovery': d.classRules={resourceMutations:[{resourceId:'wizard-spell-slots',trigger:{event:'onShortRest',description:'Finish a Short Rest and use Arcane Recovery.'},operation:'restoreSlotLevels',value:formula('ceil(@classes.wizard.level / 2)'),constraints:{maxSlotLevel:5},usage:{uses:1,recovery:'longRest'}}]};break;
case 'Scholar': d.classRules={skillExpertise:[{count:1,options:['Arcana','History','Investigation','Medicine','Nature','Religion'],requireProficiency:true}]};break;
case 'Memorize Spell': d.classRules={spellPreparationChanges:[{trigger:{event:'onShortRest'},fromCollectionId:'wizard-spellbook',collectionId:'wizard-prepared-spells',replaceCount:constant(1)}]};break;
case 'Ability Score Improvement': d.grants=[{type:'entity',choice:{kind:'tagQuery',count:1,entityTypes:['feature'],query:{all:[{field:'data.featureKind',operator:'eq',value:'feat'}]}}}];break;
case 'Spell Mastery': d.classRules={spellMastery:{choices:[{spellLevel:1,count:1},{spellLevel:2,count:1}],fromCollectionId:'wizard-spellbook',castWithoutSlot:true,atLowestLevel:true,replaceOn:'longRest'}};break;
case 'Epic Boon': d.grants=[{type:'entity',choice:{kind:'tagQuery',count:1,entityTypes:['feature'],query:{all:[{field:'data.featureKind',operator:'eq',value:'feat'},{field:'data.featCategory',operator:'eq',value:'epicBoon'}]}}}];d.properties=['recommended:Boon of Spell Recall'];break;
case 'Signature Spells': d.classRules={signatureSpells:{spellLevel:3,count:2,fromCollectionId:'wizard-spellbook',alwaysPrepared:true,freeUsesEach:constant(1),recovery:'shortOrLongRest',replaceOn:'longRest'}};break;
}return d}

function subclassFeatureData(f){const d={featureKind:'subclassFeature',category:'wizard-evoker',text:rules(f.entries),sourcePayload:{entries:f.entries??[],level:f.level}};switch(f.name){
case 'Evocation Savant': d.classRules={spellbookAdditions:[{school:'evocation',level:3,count:2,maxSpellLevel:2,cost:'free'},{trigger:'newSpellSlotLevel',school:'evocation',count:1,cost:'free'}]};break;
case 'Potent Cantrip': d.properties=['damaging-cantrip:miss-or-successful-save:half-damage','no-additional-effect-on-half-damage'];break;
case 'Sculpt Spells': d.classRules={spellTargetProtection:[{school:'evocation',protectedTargets:formula('1 + @spell.level'),automaticSaveSuccess:true,noDamageOnSuccessfulSave:true}]};break;
case 'Empowered Evocation': d.damageRules=[{trigger:'cast-wizard-evocation-spell',value:runtime('abilities.int.mod'),applyTo:'one-damage-roll'}];break;
case 'Overchannel': d.classRules={overchannel:{spellSlotLevels:[1,2,3,4,5],maximizeDamageOnCastTurn:true,firstUseSafe:true,reuseDamage:{type:'necrotic',dicePerSlotLevel:'2d12',increasePerAdditionalUse:'1d12',ignoresResistance:true,ignoresImmunity:true},recovery:'longRest'}};break;
}return d}

const features=[...classDefs.map(f=>({...base('feature',f.name,fid(f.name),`XPHB:classFeature:Wizard:${f.name}:${f.level}`),data:classFeatureData(f)})),...subDefs.map(f=>({...base('feature',f.name,sfid(f.name),`XPHB:subclassFeature:Wizard:Evoker:${f.name}:${f.level}`),data:subclassFeatureData(f)}))];

const byLevel=new Map();for(const f of cf){if(excluded.has(f.name))continue;const a=byLevel.get(f.level)??[];const id=fid(f.name);if(!a.some(x=>x.entity?.canonicalId===id))a.push({type:'entity',entity:ref('feature',f.name,id)});byLevel.set(f.level,a)}
const advancement=Array.from({length:20},(_,i)=>{const level=i+1,row=slots[i]??[];const x={level,grants:byLevel.get(level)??[],scaleValues:{cantripsKnown:cantrips[i]??0,preparedSpells:prepared[i]??0,spellbookAdditions:bookAdds[i]??0,spellSlots:Object.fromEntries(row.map((v,j)=>[j+1,v]).filter(([,v])=>v>0))}};if(level===3)x.choices=[{kind:'tagQuery',count:1,entityTypes:['subclass'],query:{all:[{field:'data.parentClass.canonicalId',operator:'eq',value:CLASS_ID}]}}];return x});

const wizard={...base('class','Wizard',CLASS_ID,'XPHB:class:Wizard'),data:{hitDie:6,primaryAbilities:['intelligence'],savingThrowProficiencies:['intelligence','wisdom'],armorTraining:[],weaponProficiencies:['simple'],skillChoices:{kind:'enum',count:2,options:['Arcana','History','Insight','Investigation','Medicine','Nature','Religion']},equipmentBundles:[{id:'A',label:"2 Daggers, Arcane Focus (Quarterstaff), Robe, Spellbook, Scholar's Pack, 5 GP",grants:[{entity:item('Dagger'),quantity:2},{entity:item('Quarterstaff')},{entity:item('Robe')},{entity:item('Spellbook')},{entity:item("Scholar's Pack")},{currency:{amount:5,currency:'gp'}}]},{id:'B',label:'55 GP',grants:[{currency:{amount:55,currency:'gp'}}]}],spellcasting:{type:'full',ability:'intelligence',preparation:'prepared',sourceCollectionId:'wizard-spellbook'},advancement,subclassLevel:3,text:rules(cls.entries??[])}};

const subBy=new Map();for(const f of subDefs){const a=subBy.get(f.level)??[];a.push({type:'entity',entity:ref('feature',f.name,sfid(f.name))});subBy.set(f.level,a)}
const evoker={...base('subclass','Evoker',SUBCLASS_ID,'XPHB:subclass:Wizard:Evoker'),data:{parentClass:ref('class','Wizard',CLASS_ID),advancement:[3,6,10,14].map(level=>({level,grants:subBy.get(level)??[]})),text:rules(sub.entries??[]),sourcePayload:{additionalSpells:sub.additionalSpells??[]}}};

async function read(file,type){try{return JSON.parse(await fs.readFile(`${ROOT}/${file}`,'utf8'))}catch{return{format:'oraclerpg-compendium',version:1,contentSource:'srd-5.2',entityType:type,count:0,items:[]}}}
function upsert(doc,xs){const ids=new Set(xs.map(x=>x.canonicalId));doc.items=doc.items.filter(x=>!ids.has(x.canonicalId)).concat(xs).sort((a,b)=>a.name.localeCompare(b.name));doc.count=doc.items.length;return doc}
await fs.writeFile(`${ROOT}/classes.json`,JSON.stringify(upsert(await read('classes.json','class'),[wizard]),null,2)+'\n');
await fs.writeFile(`${ROOT}/subclasses.json`,JSON.stringify(upsert(await read('subclasses.json','subclass'),[evoker]),null,2)+'\n');
await fs.writeFile(`${ROOT}/class-features.json`,JSON.stringify(upsert(await read('class-features.json','feature'),features),null,2)+'\n');
const report={status:'SUPPORTED',class:'Wizard',subclass:'Evoker',sourceClassFeatures:cf.length,canonicalClassFeatures:classDefs.length,sourceSubclassFeatures:sf.length,canonicalSubclassFeatures:subDefs.length,progressionRows:20,issues:[]};
await fs.writeFile(`${ROOT}/wizard-import-report.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
