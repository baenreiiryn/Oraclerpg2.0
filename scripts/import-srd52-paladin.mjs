import fs from 'node:fs/promises';

const ROOT='packages/content/data/srd-5.2';
const URL='https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/class/class-paladin.json';
const LIC='https://creativecommons.org/licenses/by/4.0/';
const CLASS_ID='dnd2024:2024:class:paladin:srd-5.2';
const SUBCLASS_ID='dnd2024:2024:subclass:paladin:devotion:srd-5.2';
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const constant=value=>({type:'constant',value});
const runtime=path=>({type:'runtime',path});
const formula=formula=>({type:'formula',formula});
const pred=description=>({type:'custom',description});
const trigger=(event,description,extra={})=>({event,...(description?{description}:{}),...extra});
const entityRef=(entityType,name,canonicalId)=>({entityType,name,canonicalId});
const rules=entries=>({rules:Array.isArray(entries)?entries:[]});
const itemRef=name=>entityRef('item',name,`dnd2024:2024:item:${slug(name)}:srd-5.2`);
const spellRef=name=>entityRef('spell',name,`dnd2024:2024:spell:${slug(name)}:srd-5.2`);
function base(entityType,name,id,sourceKey){return {id,canonicalId:id,entityType,name,system:{gameSystem:'dnd2024',rulesVersion:'2024'},source:{sourceId:'srd-5.2',book:'XPHB',license:'CC-BY-4.0',licenseUrl:LIC},provenance:{origin:'import',provider:'5etools',sourceKey,adapterVersion:'0.9.0',mapperVersion:'0.9.0'},schemaVersion:1};}
function classFeatureId(name){return `dnd2024:2024:feature:paladin:${slug(name)}:srd-5.2`;}
function subclassFeatureId(name){return `dnd2024:2024:feature:paladin:devotion:${slug(name)}:srd-5.2`;}
const featureRef=name=>entityRef('feature',name,classFeatureId(name));

const source=await (await fetch(URL)).json();
const cls=(source.class??[]).find(x=>x.name==='Paladin'&&x.source==='XPHB'&&x.srd52);
const sub=(source.subclass??[]).find(x=>x.className==='Paladin'&&x.classSource==='XPHB'&&x.source==='XPHB'&&x.srd52&&/Devotion/i.test(`${x.name} ${x.shortName??''}`));
const cf=(source.classFeature??[]).filter(x=>x.className==='Paladin'&&x.classSource==='XPHB'&&x.srd52);
const sf=(source.subclassFeature??[]).filter(x=>x.className==='Paladin'&&x.classSource==='XPHB'&&x.subclassSource==='XPHB'&&x.srd52&&/Devotion/i.test(String(x.subclassShortName??'')));
if(!cls||!sub)throw new Error('SRD 5.2 Paladin/Oath of Devotion not found');

const excluded=new Set(['Paladin Subclass','Subclass Feature']);
const classDefs=[];const seen=new Set();for(const f of cf){if(excluded.has(f.name))continue;const id=classFeatureId(f.name);if(seen.has(id))continue;seen.add(id);classDefs.push(f);}
const subDefs=[];const sseen=new Set();for(const f of sf){if(/Oath of Devotion/i.test(f.name))continue;const id=subclassFeatureId(f.name);if(sseen.has(id))continue;sseen.add(id);subDefs.push(f);}

const prepared=cls.preparedSpellsProgression??Array(20).fill(0);
const slotRows=(cls.classTableGroups??[]).find(x=>Array.isArray(x.rowsSpellProgression))?.rowsSpellProgression??Array.from({length:20},()=>[0,0,0,0,0]);
const channelUses=l=>l>=11?3:l>=3?2:0;
const auraRange=l=>l>=18?30:(l>=6?10:0);
const weaponMasteries=()=>2;
const layOnHands=l=>5*l;
const featChoice=category=>({kind:'tagQuery',count:1,entityTypes:['feature'],query:{all:[{field:'data.featureKind',operator:'eq',value:'feat'},{field:'data.featCategory',operator:'eq',value:category}]}});

function featureData(f){
 const d={featureKind:'classFeature',category:'paladin',text:rules(f.entries)};
 switch(f.name){
  case 'Lay On Hands':
  case 'Lay on Hands':
   d.grants=[{type:'resource',value:{id:'paladin-lay-on-hands',max:formula('5 * @classes.paladin.level'),recovery:[{period:'longRest',amount:'all'}]}}];
   d.activities=[
    {id:'lay-on-hands-heal',name:'Lay on Hands — Heal',kind:'healing',activation:{type:'bonusAction'},range:{reach:{value:5,unit:'ft'}},target:{type:'creature',count:1},healing:[{value:runtime('activity.input.poolSpend'),type:'healing'}],costs:[{resource:'classResource',resourceId:'paladin-lay-on-hands',amount:runtime('activity.input.poolSpend')}],description:'Spend any number of points from Lay on Hands, up to the amount remaining, restoring that many Hit Points.'},
    {id:'lay-on-hands-poison',name:'Lay on Hands — Cure Poisoned',kind:'utility',activation:{type:'bonusAction'},range:{reach:{value:5,unit:'ft'}},target:{type:'creature',count:1},costs:[{resource:'classResource',resourceId:'paladin-lay-on-hands',amount:5}],effects:[{id:'remove-poisoned',conditions:[{action:'remove',conditions:['poisoned']}]}],description:'Spend 5 points from Lay on Hands to remove Poisoned; those points do not also restore Hit Points.'}
   ];break;
  case 'Spellcasting':
   d.classMechanics={spellCollections:[{id:'paladin-prepared-spells',kind:'prepared',sourceList:'Paladin',capacity:runtime('class.paladin.preparedSpells'),filter:{lists:['Paladin']},replace:{timing:'longRest',count:constant(1),fromCollectionId:'paladin-prepared-spells',filter:{lists:['Paladin']}}}],spellSlotPools:[{id:'paladin-spell-slots',kind:'standard',progression:Object.fromEntries(slotRows.map((row,i)=>[i+1,Object.fromEntries(row.map((v,j)=>[j+1,v]).filter(([,v])=>v>0))])),recovery:[{trigger:trigger('onRest','Long Rest'),restore:'all'}]}]};
   d.properties=['spellcasting-ability:charisma','spellcasting-focus:holy-symbol','prepared-spells'];break;
  case 'Weapon Mastery':
   d.classRules={entityCollections:[{id:'paladin-weapon-masteries',entityTypes:['item'],capacity:constant(2),filter:pred('Weapon with which the Paladin has proficiency and that has a mastery property.'),chooseOn:trigger('onLevelGain','Choose two weapon kinds.'),replace:{trigger:trigger('onRest','Long Rest'),count:constant(2),filter:pred('Eligible proficient weapons with mastery properties.')}}]};break;
  case 'Fighting Style':
   d.grants=[{type:'entity',choice:featChoice('fightingStyle')}];
   d.spellGrantChoices=[{id:'paladin-blessed-warrior',count:1,options:[{name:'Blessed Warrior',ability:'charisma',selections:[{mode:'known',query:'Choose two Cleric cantrips; they count as Paladin spells.',count:2}]}]}];
   d.properties=['alternative-option:Blessed Warrior','replace-one-blessed-warrior-cantrip-on-paladin-level'];break;
  case "Paladin's Smite":
   d.spellGrants=[{name:"Paladin's Smite",ability:'charisma',selections:[{mode:'prepared',spell:spellRef('Divine Smite'),freeUses:1,recovery:'longRest'}]}];break;
  case 'Channel Divinity':
   d.grants=[{type:'resource',value:{id:'paladin-channel-divinity',max:runtime('class.paladin.channelDivinityUses'),recovery:[{period:'shortRest',amount:1},{period:'longRest',amount:'all'}]}}];
   d.activities=[{id:'divine-sense',name:'Divine Sense',kind:'utility',activation:{type:'bonusAction'},target:{type:'self'},duration:{type:'timed',value:10,unit:'minute'},costs:[{resource:'classResource',resourceId:'paladin-channel-divinity',amount:1}],description:'For 10 minutes, know the location and creature type of Celestials, Fiends, and Undead within 60 feet, and detect consecrated or desecrated places or objects. Ends if Incapacitated.'}];break;
  case 'Ability Score Improvement':d.grants=[{type:'entity',choice:{kind:'tagQuery',count:1,entityTypes:['feature'],query:{all:[{field:'data.featureKind',operator:'eq',value:'feat'}]}}}];break;
  case 'Extra Attack':d.properties=['attack-action-count:2'];break;
  case 'Faithful Steed':d.spellGrants=[{name:'Faithful Steed',ability:'charisma',selections:[{mode:'prepared',spell:spellRef('Find Steed'),freeUses:1,recovery:'longRest'}]}];break;
  case 'Aura of Protection':
   d.classRules={projectedEffects:[{effects:[{id:'aura-of-protection-save-bonus',modifiers:[{target:{domain:'savingThrow'},mode:'bonus',value:formula('max(1, @source.abilities.cha.mod)')}]}],recipients:{type:'alliesInRange',range:runtime('class.paladin.auraRange')},predicate:pred('Aura is inactive while the Paladin is Incapacitated. A creature benefits from only one Aura of Protection at a time.')}],effectStackingPolicies:[{key:'paladin-aura-of-protection',policy:'chooseOne',chooser:'recipient'}]};break;
  case 'Abjure Foes':
   d.activities=[{id:'abjure-foes',name:'Abjure Foes',kind:'save',activation:{type:'action'},range:{normal:{value:60,unit:'ft'}},target:{type:'creature',count:runtime('abilities.cha.mod|min1'),disposition:'enemy'},save:{ability:'wisdom',dc:{type:'spellcasting'}},conditions:[{condition:'frightened',duration:{type:'timed',value:1,unit:'minute'}}],costs:[{resource:'classResource',resourceId:'paladin-channel-divinity',amount:1}],description:'On a failed save, target is Frightened for 1 minute or until it takes damage. While frightened this way, on each turn it can only move, take an action, or take a Bonus Action.'}];
   d.classRules={behaviorConstraints:[{subject:'affectedCreature',directives:[{type:'actionEconomyLimit',allowed:['action','bonusAction','movement'],maximumSelections:1}],duration:{endTriggers:[trigger('onDamageTaken','Effect ends when the affected creature takes damage.')]}}]};break;
  case 'Aura of Courage':
   d.classRules={projectedEffects:[{effects:[{id:'aura-of-courage-immunity',conditionImmunities:['frightened']}],recipients:{type:'alliesInRange',range:runtime('class.paladin.auraRange')},predicate:pred('Uses Aura of Protection range and inactive state.')} ]};break;
  case 'Radiant Strikes':d.damageRules=[{id:'radiant-strikes',action:'extraDamage',damageTypes:['radiant'],formula:'1d8',trigger:trigger('onHit','When a melee weapon attack or Unarmed Strike hits.'),predicate:pred('Melee weapon attack or Unarmed Strike.')}];break;
  case 'Restoring Touch':
   d.effects=[{id:'restoring-touch',trigger:trigger('custom','When Lay on Hands is used on a creature.'),conditions:[{action:'remove',conditions:['blinded','charmed','deafened','frightened','paralyzed','stunned']}]}];
   d.properties=['cost:5-lay-on-hands-points-per-condition','removed-condition-cost-does-not-heal'];break;
  case 'Aura Expansion':d.patches=[{targetId:'dnd2024:2024:feature:paladin:aura-of-protection:srd-5.2',changes:[{path:'class.paladin.auraRange',operation:'set',value:30}]}];break;
  case 'Epic Boon':d.grants=[{type:'entity',choice:featChoice('epicBoon')}];d.properties=['recommended:Boon of Truesight'];break;
 }
 return d;
}

function subclassData(f){
 const d={featureKind:'subclassFeature',category:'paladin-devotion',text:rules(f.entries)};
 switch(f.name){
  case 'Oath of Devotion Spells':
   d.spellGrants=[{name:'Oath of Devotion Spells',ability:'charisma',selections:[
    {mode:'prepared',characterLevel:3,spell:spellRef('Protection from Evil and Good')},{mode:'prepared',characterLevel:3,spell:spellRef('Shield of Faith')},
    {mode:'prepared',characterLevel:5,spell:spellRef('Aid')},{mode:'prepared',characterLevel:5,spell:spellRef('Zone of Truth')},
    {mode:'prepared',characterLevel:9,spell:spellRef('Beacon of Hope')},{mode:'prepared',characterLevel:9,spell:spellRef('Dispel Magic')},
    {mode:'prepared',characterLevel:13,spell:spellRef('Freedom of Movement')},{mode:'prepared',characterLevel:13,spell:spellRef('Guardian of Faith')},
    {mode:'prepared',characterLevel:17,spell:spellRef('Commune')},{mode:'prepared',characterLevel:17,spell:spellRef('Flame Strike')}]}];break;
  case 'Sacred Weapon':
   d.activities=[{id:'sacred-weapon',name:'Sacred Weapon',kind:'enchant',activation:{type:'free',trigger:trigger('custom','When taking the Attack action.')},target:{type:'object',count:1},duration:{type:'timed',value:10,unit:'minute'},costs:[{resource:'classResource',resourceId:'paladin-channel-divinity',amount:1}],description:'Imbue one held melee weapon. Add Charisma modifier (minimum +1) to its attack rolls, choose normal or Radiant damage on each hit, and emit bright/dim light 20/20 feet. Ends if not carrying the weapon or used again.'}];
   d.modifiers=[{target:{domain:'attackRoll'},mode:'bonus',value:formula('max(1, @abilities.cha.mod)'),predicate:pred('Attack roll made with the Sacred Weapon while the effect is active.')}];
   d.damageRules=[{id:'sacred-weapon-radiant',action:'replaceDamageType',damageTypes:['radiant'],trigger:trigger('onDamage','When Sacred Weapon deals damage.'),predicate:pred('Choose normal damage type or Radiant for each hit.')}];break;
  case 'Aura of Devotion':d.classRules={projectedEffects:[{effects:[{id:'aura-of-devotion-immunity',conditionImmunities:['charmed']}],recipients:{type:'alliesInRange',range:runtime('class.paladin.auraRange')},predicate:pred('Uses Aura of Protection range and inactive state.')} ]};break;
  case 'Smite of Protection':d.classRules={projectedEffects:[{effects:[{id:'smite-of-protection-half-cover',benefits:[{type:'cover',value:'half'}]}],recipients:{type:'alliesInRange',range:runtime('class.paladin.auraRange')},predicate:pred('Active after casting Divine Smite until the start of your next turn.')} ]};d.properties=['trigger:cast-divine-smite','duration:until-start-of-next-turn'];break;
  case 'Holy Nimbus':
   d.activities=[{id:'holy-nimbus',name:'Holy Nimbus',kind:'utility',activation:{type:'bonusAction'},target:{type:'self'},duration:{type:'timed',value:10,unit:'minute'},uses:{max:1,recovery:[{period:'longRest',amount:'all'}]},description:'Imbue Aura of Protection for 10 minutes. Can also restore the use by expending a level 5 spell slot.'}];
   d.saveRules=[{id:'holy-ward',abilities:['strength','dexterity','constitution','intelligence','wisdom','charisma'],mode:'advantage',predicate:pred('Saving throw forced by a Fiend or Undead while Holy Nimbus is active.')}];
   d.damageRules=[{id:'holy-nimbus-radiant',action:'extraDamage',damageTypes:['radiant'],value:formula('@abilities.cha.mod + @proficiency'),trigger:trigger('onTurnStart','Enemy starts its turn in Aura of Protection while Holy Nimbus is active.'),predicate:pred('Enemy is inside the aura.')}];
   d.properties=['aura-bright-light:sunlight','restore-use-cost:level-5-spell-slot'];break;
 }
 return d;
}

const classFeatures=classDefs.map(f=>({...base('feature',f.name,classFeatureId(f.name),`XPHB:classFeature:Paladin:${f.name}:${f.level}`),data:featureData(f)}));
const subFeatures=subDefs.map(f=>({...base('feature',f.name,subclassFeatureId(f.name),`XPHB:subclassFeature:Paladin:Devotion:${f.name}:${f.level}`),data:subclassData(f)}));

const byLevel=new Map();for(const f of cf){if(excluded.has(f.name))continue;const arr=byLevel.get(f.level)??[];const id=classFeatureId(f.name);if(!arr.some(x=>x.entity?.canonicalId===id))arr.push({type:'entity',entity:featureRef(f.name)});byLevel.set(f.level,arr);}for(const l of [4,8,12,16]){const arr=byLevel.get(l)??[];if(!arr.some(x=>x.entity?.name==='Ability Score Improvement'))arr.push({type:'entity',entity:featureRef('Ability Score Improvement')});byLevel.set(l,arr);}
const advancement=Array.from({length:20},(_,i)=>{const level=i+1;const row=slotRows[i]??[];const step={level,grants:byLevel.get(level)??[],scaleValues:{preparedSpells:prepared[i]??0,channelDivinityUses:channelUses(level),auraRange:auraRange(level),weaponMasteriesKnown:weaponMasteries(),layOnHandsPool:layOnHands(level),spellSlots:Object.fromEntries(row.map((v,j)=>[j+1,v]).filter(([,v])=>v>0))}};if(level===3)step.choices=[{kind:'tagQuery',count:1,entityTypes:['subclass'],query:{all:[{field:'data.parentClass.canonicalId',operator:'eq',value:CLASS_ID}]}}];return step;});
const paladin={...base('class','Paladin',CLASS_ID,'XPHB:class:Paladin'),data:{hitDie:10,primaryAbilities:['strength','charisma'],savingThrowProficiencies:['wisdom','charisma'],armorTraining:['light','medium','heavy','shield'],weaponProficiencies:['simple','martial'],skillChoices:{kind:'enum',count:2,options:['Athletics','Insight','Intimidation','Medicine','Persuasion','Religion']},equipmentBundles:[{id:'A',label:"Chain Mail, Shield, Longsword, 6 Javelins, Holy Symbol, Priest's Pack, 9 GP",grants:[{entity:itemRef('Chain Mail')},{entity:itemRef('Shield')},{entity:itemRef('Longsword')},{entity:itemRef('Javelin'),quantity:6},{entity:itemRef('Holy Symbol')},{entity:itemRef("Priest's Pack")},{currency:{amount:9,currency:'gp'}}]},{id:'B',label:'150 GP',grants:[{currency:{amount:150,currency:'gp'}}]}],spellcasting:{type:'half',ability:'charisma',preparation:'prepared',progression:slotRows.map(row=>Object.fromEntries(row.map((v,j)=>[j+1,v]).filter(([,v])=>v>0)))},advancement,subclassLevel:3,text:rules(cls.entries??[])}};

const subByLevel=new Map();for(const f of subDefs){const arr=subByLevel.get(f.level)??[];arr.push({type:'entity',entity:entityRef('feature',f.name,subclassFeatureId(f.name))});subByLevel.set(f.level,arr);}const devotion={...base('subclass','Oath of Devotion',SUBCLASS_ID,'XPHB:subclass:Paladin:Devotion'),data:{parentClass:entityRef('class','Paladin',CLASS_ID),advancement:[3,7,15,20].map(level=>({level,grants:subByLevel.get(level)??[]})),text:rules(sub.entries??[])}};

async function read(file,entityType){try{return JSON.parse(await fs.readFile(`${ROOT}/${file}`,'utf8'));}catch{return {format:'oraclerpg-compendium',version:1,contentSource:'srd-5.2',entityType,count:0,items:[]};}}
function upsert(doc,items){const ids=new Set(items.map(x=>x.canonicalId));doc.items=(doc.items??[]).filter(x=>!ids.has(x.canonicalId)).concat(items);doc.items.sort((a,b)=>a.name.localeCompare(b.name));doc.count=doc.items.length;return doc;}
const classes=upsert(await read('classes.json','class'),[paladin]);const subclasses=upsert(await read('subclasses.json','subclass'),[devotion]);const features=upsert(await read('class-features.json','feature'),[...classFeatures,...subFeatures]);
await fs.writeFile(`${ROOT}/classes.json`,JSON.stringify(classes,null,2)+'\n');await fs.writeFile(`${ROOT}/subclasses.json`,JSON.stringify(subclasses,null,2)+'\n');await fs.writeFile(`${ROOT}/class-features.json`,JSON.stringify(features,null,2)+'\n');
const report={status:'SUPPORTED',class:'Paladin',subclass:'Oath of Devotion',sourceClassFeatures:cf.length,canonicalClassFeatures:classFeatures.length,sourceSubclassFeatures:sf.length,canonicalSubclassFeatures:subFeatures.length,progressionRows:20,issues:[]};await fs.writeFile(`${ROOT}/paladin-import-report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
