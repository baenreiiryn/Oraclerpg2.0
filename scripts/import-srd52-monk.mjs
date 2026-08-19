import fs from 'node:fs/promises';
const ROOT='packages/content/data/srd-5.2';
const URL='https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/class/class-monk.json';
const LIC='https://creativecommons.org/licenses/by/4.0/';
const CLASS_ID='dnd2024:2024:class:monk:srd-5.2';
const SUBCLASS_ID='dnd2024:2024:subclass:monk:open-hand:srd-5.2';
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const constant=value=>({type:'constant',value});
const runtime=path=>({type:'runtime',path});
const formula=formula=>({type:'formula',formula});
const pred=description=>({type:'custom',description});
const trigger=(event,description,extra={})=>({event,...(description?{description}:{}),...extra});
const entityRef=(entityType,name,canonicalId)=>({entityType,name,canonicalId});
const rules=entries=>({rules:Array.isArray(entries)?entries:[]});
function base(entityType,name,id,sourceKey){return {id,canonicalId:id,entityType,name,system:{gameSystem:'dnd2024',rulesVersion:'2024'},source:{sourceId:'srd-5.2',book:'XPHB',license:'CC-BY-4.0',licenseUrl:LIC},provenance:{origin:'import',provider:'5etools',sourceKey,adapterVersion:'0.7.0',mapperVersion:'0.7.0'},schemaVersion:1};}
function classFeatureId(name){return `dnd2024:2024:feature:monk:${slug(name)}:srd-5.2`;}
function subclassFeatureId(name){return `dnd2024:2024:feature:monk:open-hand:${slug(name)}:srd-5.2`;}
const featureRef=name=>entityRef('feature',name,classFeatureId(name));
const noArmorOrShield={type:'and',all:[{type:'not',predicate:{type:'wearingArmor',armorCategories:['light','medium','heavy']}},{type:'not',predicate:{type:'holdingItem',tags:['shield'],description:'A Shield is being wielded.'}}]};
const source=await (await fetch(URL)).json();
const cls=source.class.find(x=>x.name==='Monk'&&x.source==='XPHB'&&x.srd52);
const sub=source.subclass.find(x=>x.className==='Monk'&&x.classSource==='XPHB'&&x.source==='XPHB'&&x.srd52&&/Open Hand/i.test(`${x.name} ${x.shortName}`));
const cf=(source.classFeature??[]).filter(x=>x.className==='Monk'&&x.classSource==='XPHB'&&x.srd52);
const sf=(source.subclassFeature??[]).filter(x=>x.className==='Monk'&&x.classSource==='XPHB'&&x.subclassSource==='XPHB'&&x.srd52&&/Open Hand/i.test(String(x.subclassShortName??'')));
if(!cls||!sub) throw new Error('SRD 5.2 Monk/Warrior of the Open Hand not found');
const excluded=new Set(['Monk Subclass','Subclass Feature']);
const classDefs=[];const seen=new Set();for(const f of cf){if(excluded.has(f.name))continue;const id=classFeatureId(f.name);if(seen.has(id))continue;seen.add(id);classDefs.push(f);}
const subDefs=[];const subSeen=new Set();for(const f of sf){if(/Warrior of the Open Hand/i.test(f.name))continue;const id=subclassFeatureId(f.name);if(subSeen.has(id))continue;subSeen.add(id);subDefs.push(f);}
const martialDie=l=>l>=17?'d12':l>=11?'d10':l>=5?'d8':'d6';
const focus=l=>l;
const movement=l=>l>=18?30:l>=14?25:l>=10?20:l>=6?15:l>=2?10:0;
function featChoice(category){return {kind:'tagQuery',count:1,entityTypes:['feature'],query:{all:[{field:'data.featureKind',operator:'eq',value:'feat'},{field:'data.featCategory',operator:'eq',value:category}]}};}
function focusUse(id,name,description,extra={}){return {id,name,kind:'utility',activation:{type:'bonusAction'},target:{type:'self'},uses:{max:constant(1),sharedResourceId:'monk-focus',recovery:[]},description,...extra};}
function classFeatureData(f){const d={featureKind:'classFeature',category:'monk',text:rules(f.entries)};switch(f.name){
case 'Martial Arts':
 d.modifiers=[{target:{domain:'unarmedStrike'},mode:'set',value:runtime('class.monk.martialArtsDie'),predicate:noArmorOrShield,description:'Use the Martial Arts die for Unarmed Strikes and eligible Monk weapons.'}];
 d.abilitySubstitutions=[{id:'martial-arts-dex-attack',target:'attackRoll',ability:'dexterity',predicate:pred('Unarmed Strike or Monk weapon; unarmored and no Shield.')},{id:'martial-arts-dex-damage',target:'damageRoll',ability:'dexterity',predicate:pred('Unarmed Strike or Monk weapon; unarmored and no Shield.')}];
 d.activities=[{id:'martial-arts-bonus-unarmed',name:'Bonus Unarmed Strike',kind:'attack',activation:{type:'bonusAction'},target:{type:'creature',count:1},attack:{classification:'special',mode:'melee'},description:'Make one Unarmed Strike as a Bonus Action while Martial Arts is available.'}];
 d.properties=['monk-weapons:simple-melee-or-light-martial-melee','grapple-shove-dc-may-use-dexterity'];break;
case 'Unarmored Defense':
 d.modifiers=[{target:{domain:'armorClass'},mode:'replace',value:formula('10 + @abilities.dex.mod + @abilities.wis.mod'),predicate:noArmorOrShield,description:'Requires no armor and no Shield.'}];break;
case "Monk's Focus":
 d.grants=[{type:'resource',value:{id:'monk-focus',max:runtime('class.monk.focusPoints'),recovery:[{period:'shortRest',amount:'all'},{period:'longRest',amount:'all'}]}}];
 d.properties=['focus-save-dc:8+wisdom-modifier+proficiency-bonus'];
 d.activities=[focusUse('flurry-of-blows','Flurry of Blows','Spend 1 Focus Point to make two Unarmed Strikes as a Bonus Action.'),{id:'patient-defense-free',name:'Patient Defense — Disengage',kind:'utility',activation:{type:'bonusAction'},target:{type:'self'},description:'Take the Disengage action as a Bonus Action.'},focusUse('patient-defense-focus','Patient Defense — Focus','Spend 1 Focus Point to take Disengage and Dodge as a Bonus Action.'),{id:'step-of-the-wind-free',name:'Step of the Wind — Dash',kind:'utility',activation:{type:'bonusAction'},target:{type:'self'},description:'Take Dash as a Bonus Action.'},focusUse('step-of-the-wind-focus','Step of the Wind — Focus','Spend 1 Focus Point to take Disengage and Dash as a Bonus Action; jump distance doubles for the turn.')];break;
case 'Unarmored Movement':
 d.modifiers=[{target:{domain:'movement',movementType:'walk'},mode:'bonus',value:runtime('class.monk.unarmoredMovement'),predicate:noArmorOrShield}];break;
case 'Uncanny Metabolism':
 d.classRules={resourceMutations:[{resourceId:'monk-focus',trigger:trigger('onInitiative','Regain all expended Focus Points.'),operation:'restoreAll'}]};
 d.triggeredGrants=[{id:'uncanny-metabolism-heal',trigger:trigger('onInitiative','When Uncanny Metabolism is used.'),grant:'hitPoints',value:formula('@classes.monk.level + 1{@classes.monk.martialArtsDie}'),usage:{max:constant(1),scope:'rest',recovery:[{period:'longRest',amount:'all'}]}}];break;
case 'Deflect Attacks':
 d.damageRules=[{id:'deflect-attacks-reduction',action:'reduceIncoming',formula:'1d10 + @abilities.dex.mod + @classes.monk.level',trigger:trigger('onDamageTaken','Reaction when an attack roll hits.'),predicate:pred('The attack includes Bludgeoning, Piercing, or Slashing damage.')}];
 d.activities=[{id:'deflect-attacks-redirect',name:'Redirect Deflected Attack',kind:'save',activation:{type:'reaction',trigger:trigger('custom','After Deflect Attacks reduces the triggering attack damage to 0.')},target:{type:'creature',count:1},save:{ability:'dexterity',dc:{type:'formula',formula:'8 + @abilities.wis.mod + @proficiency'}},damage:[{formula:'2{@classes.monk.martialArtsDie} + @abilities.dex.mod',type:'custom'}],uses:{max:constant(1),sharedResourceId:'monk-focus',recovery:[]},description:'Spend 1 Focus Point; melee trigger targets within 5 ft, ranged trigger within 60 ft; damage type matches the triggering attack.'}];break;
case 'Slow Fall':
 d.damageRules=[{id:'slow-fall',action:'reduceIncoming',value:formula('5 * @classes.monk.level'),trigger:trigger('custom','Reaction when you fall and would take falling damage.'),predicate:pred('Falling damage only.')}];break;
case 'Extra Attack':d.properties=['attack-action-count:2'];break;
case 'Stunning Strike':
 d.activities=[{id:'stunning-strike',name:'Stunning Strike',kind:'save',activation:{type:'free',trigger:trigger('onHit','Once per turn after hitting with a Monk weapon or Unarmed Strike.',{oncePerTurn:true})},target:{type:'creature',count:1},save:{ability:'constitution',dc:{type:'formula',formula:'8 + @abilities.wis.mod + @proficiency'}},conditions:[{condition:'stunned',duration:{type:'untilTrigger',endTrigger:trigger('onTurnStart','Start of your next turn.')}}],uses:{max:constant(1),sharedResourceId:'monk-focus',recovery:[]},description:'On a successful save, halve target Speed and the next attack roll against it has Advantage until the start of your next turn.'}];break;
case 'Empowered Strikes':
 d.damageRules=[{id:'empowered-strikes',action:'replaceDamageType',damageTypes:['force'],trigger:trigger('onDamage','When an Unarmed Strike deals damage.'),predicate:pred('Choose Force or the strike’s normal damage type.')}];break;
case 'Evasion':d.classMechanics={resolutionOverrides:[{domain:'save',mode:'custom',predicate:pred('Dexterity save for half damage; unavailable while Incapacitated.'),value:constant('success:no-damage;failure:half-damage')}]};break;
case 'Acrobatic Movement':d.classRules={movementPermissions:[{subject:'self',permissions:['moveOnVerticalSurface','moveAcrossLiquid','ignoreFallingDuringMovement'],predicate:noArmorOrShield}]};break;
case 'Heightened Focus':
 d.properties=['flurry-of-blows:3-unarmed-strikes','patient-defense-paid:temp-hp=2-martial-arts-dice','step-of-wind-paid:carry-willing-large-or-smaller-within-5ft-no-opportunity-attacks'];break;
case 'Self-Restoration':
 d.effects=[{id:'self-restoration-cleanse',trigger:trigger('onTurnEnd','At the end of each of your turns.'),conditions:[{action:'remove',conditions:['charmed','frightened','poisoned']}]}];d.properties=['no-exhaustion-from-forgoing-food-or-drink'];break;
case 'Deflect Energy':d.properties=['deflect-attacks:all-damage-types'];break;
case 'Disciplined Survivor':
 d.grants=[{type:'proficiency',value:['strength-save','dexterity-save','constitution-save','intelligence-save','wisdom-save','charisma-save']}];
 d.rollRules=[{id:'disciplined-survivor-reroll',target:'savingThrow',operation:'reroll',trigger:trigger('onFailedSave','Spend 1 Focus Point after failing a saving throw.'),description:'Must use the new roll.'}];d.properties=['uses-resource:monk-focus'];break;
case 'Perfect Focus':d.classRules={resourceMutations:[{resourceId:'monk-focus',trigger:trigger('onInitiative','If you do not use Uncanny Metabolism and have 3 or fewer Focus Points.'),operation:'setMinimum',value:constant(4),predicate:pred('Current Focus Points are 3 or fewer and Uncanny Metabolism was not used.')} ]};break;
case 'Superior Defense':
 d.activities=[{id:'superior-defense',name:'Superior Defense',kind:'utility',activation:{type:'free',trigger:trigger('onTurnStart','At the start of your turn.')},target:{type:'self'},duration:{type:'timed',value:constant(1),unit:'minute'},description:'Spend 3 Focus Points. Gain Resistance to all damage except Force until the effect ends or you become Incapacitated.'}];d.properties=['focus-cost:3','resistance:all-except-force'];break;
case 'Ability Score Improvement':d.grants=[{type:'entity',choice:{kind:'tagQuery',count:1,entityTypes:['feature'],query:{all:[{field:'data.featureKind',operator:'eq',value:'feat'}]}}}];break;
case 'Epic Boon':d.grants=[{type:'entity',choice:featChoice('epicBoon')}];d.properties=['recommended:Boon of Irresistible Offense'];break;
case 'Body and Mind':d.modifiers=[{target:{domain:'abilityScore',ability:'dexterity'},mode:'bonus',value:constant(4)},{target:{domain:'abilityScore',ability:'dexterity'},mode:'maximum',value:constant(25)},{target:{domain:'abilityScore',ability:'wisdom'},mode:'bonus',value:constant(4)},{target:{domain:'abilityScore',ability:'wisdom'},mode:'maximum',value:constant(25)}];break;
}
return d;}
function subclassFeatureData(f){const d={featureKind:'subclassFeature',category:'monk-open-hand',text:rules(f.entries)};switch(f.name){
case 'Open Hand Technique':d.properties=['flurry-hit-option:addled-no-opportunity-attacks','flurry-hit-option:push-15ft-strength-save','flurry-hit-option:topple-dexterity-save-prone'];d.movementInteractionRules=[{id:'open-hand-push',action:'forcedMove',subject:'target',direction:'awayFromSource',distance:{value:15,unit:'ft'},trigger:trigger('onHit','After a Flurry of Blows hit and Push is chosen.')}];break;
case 'Wholeness of Body':d.activities=[{id:'wholeness-of-body',name:'Wholeness of Body',kind:'healing',activation:{type:'bonusAction'},target:{type:'self'},healing:[{formula:'1{@classes.monk.martialArtsDie} + @abilities.wis.mod',type:'healing'}],uses:{max:runtime('abilities.wis.mod|min1'),recovery:[{period:'longRest',amount:'all'}]},description:'Minimum healing 1; uses equal Wisdom modifier, minimum 1.'}];break;
case 'Fleet Step':d.properties=['after-any-other-bonus-action:immediately-use-step-of-the-wind'];break;
case 'Quivering Palm':d.states=[{id:'quivering-palm-target',valueType:'entityRef',transitions:[{trigger:trigger('onHit','After an Unarmed Strike hits and 4 Focus Points are spent.'),operation:'set'},{trigger:trigger('custom','Ends harmlessly, target dies, vibrations are detonated, or a new target is marked.'),operation:'reset'}]}];d.activities=[{id:'quivering-palm-detonate',name:'Quivering Palm',kind:'save',activation:{type:'action'},target:{type:'creature',count:1},save:{ability:'constitution',dc:{type:'formula',formula:'8 + @abilities.wis.mod + @proficiency'}},damage:[{formula:'10d12',type:'force',onSave:'half'}],description:'Target must be the creature carrying your vibrations and on the same plane. Vibrations last a number of days equal to Monk level. You can also replace one attack of the Attack action with this detonation.'}];d.properties=['focus-cost:4','one-quivering-palm-target-at-a-time','duration-days:monk-level','detonation-can-replace-one-attack'];break;
}
return d;}
const classFeatures=classDefs.map(f=>({...base('feature',f.name,classFeatureId(f.name),`XPHB:classFeature:Monk:${f.name}:${f.level}`),data:classFeatureData(f)}));
const subFeatures=subDefs.map(f=>({...base('feature',f.name,subclassFeatureId(f.name),`XPHB:subclassFeature:Monk:OpenHand:${f.name}:${f.level}`),data:subclassFeatureData(f)}));
const byLevel=new Map();for(const f of cf){if(excluded.has(f.name))continue;const arr=byLevel.get(f.level)??[];const ref={type:'entity',entity:featureRef(f.name)};if(!arr.some(x=>x.entity?.canonicalId===ref.entity.canonicalId))arr.push(ref);byLevel.set(f.level,arr);}for(const l of [4,8,12,16]){const arr=byLevel.get(l)??[];if(!arr.some(x=>x.entity?.name==='Ability Score Improvement'))arr.push({type:'entity',entity:featureRef('Ability Score Improvement')});byLevel.set(l,arr);}
const advancement=Array.from({length:20},(_,i)=>{const level=i+1;const step={level,grants:byLevel.get(level)??[],scaleValues:{martialArtsDie:martialDie(level),focusPoints:focus(level),unarmoredMovement:movement(level)}};if(level===3)step.choices=[{kind:'tagQuery',count:1,entityTypes:['subclass'],query:{all:[{field:'data.parentClass.canonicalId',operator:'eq',value:CLASS_ID}]}}];return step;});
const item=(name,qty=1)=>({entity:entityRef('item',name,`dnd2024:2024:item:${slug(name)}:srd-5.2`),quantity:qty});
const monk={...base('class','Monk',CLASS_ID,'XPHB:class:Monk'),data:{hitDie:8,primaryAbilities:['dexterity','wisdom'],savingThrowProficiencies:['strength','dexterity'],armorTraining:[],weaponProficiencies:['simple','martial-light'],skillChoices:{kind:'enum',count:2,options:['Acrobatics','Athletics','History','Insight','Religion','Stealth']},toolChoices:{kind:'enum',count:1,options:["Artisan's Tools",'Musical Instrument']},equipmentBundles:[{id:'A',label:"Spear, 5 Daggers, Artisan's Tools or Musical Instrument, Explorer's Pack, 11 GP",grants:[item('Spear'),item('Dagger',5),{choice:{kind:'enum',count:1,options:["Artisan's Tools",'Musical Instrument']}},item("Explorer's Pack"),{currency:{amount:11,currency:'gp'}}]},{id:'B',label:'50 GP',grants:[{currency:{amount:50,currency:'gp'}}]}],advancement,text:rules(cls.entries??[])},artwork:{image:'systems/dnd5e/icons/classes/monk.webp'}};
const subByLevel=new Map();for(const f of subDefs){const arr=subByLevel.get(f.level)??[];arr.push({type:'entity',entity:entityRef('feature',f.name,subclassFeatureId(f.name))});subByLevel.set(f.level,arr);}
const openHand={...base('subclass','Warrior of the Open Hand',SUBCLASS_ID,'XPHB:subclass:Monk:OpenHand'),data:{parentClass:entityRef('class','Monk',CLASS_ID),advancement:[3,6,11,17].map(level=>({level,grants:subByLevel.get(level)??[]})),text:rules(sub.entries??[])}};
const read=async f=>JSON.parse(await fs.readFile(`${ROOT}/${f}`,'utf8'));
const upsert=(doc,items)=>{const ids=new Set(items.map(x=>x.canonicalId));doc.items=(doc.items??[]).filter(x=>!ids.has(x.canonicalId));doc.items.push(...items);doc.items.sort((a,b)=>a.name.localeCompare(b.name));doc.count=doc.items.length;return doc;};
const classes=upsert(await read('classes.json'),[monk]);const subclasses=upsert(await read('subclasses.json'),[openHand]);const features=upsert(await read('class-features.json'),[...classFeatures,...subFeatures]);
await fs.writeFile(`${ROOT}/classes.json`,JSON.stringify(classes,null,2)+'\n');await fs.writeFile(`${ROOT}/subclasses.json`,JSON.stringify(subclasses,null,2)+'\n');await fs.writeFile(`${ROOT}/class-features.json`,JSON.stringify(features,null,2)+'\n');
const report={status:'SUPPORTED',class:'Monk',subclass:'Warrior of the Open Hand',sourceClassFeatures:cf.length,canonicalClassFeatures:classFeatures.length,sourceSubclassFeatures:sf.length,canonicalSubclassFeatures:subFeatures.length,progressionRows:20,issues:[]};
await fs.writeFile(`${ROOT}/monk-import-report.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));