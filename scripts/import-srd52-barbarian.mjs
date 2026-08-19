import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT='packages/content/data/srd-5.2';
const URL='https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/class/class-barbarian.json';
const LIC='https://creativecommons.org/licenses/by/4.0/';
const CLASS_ID='dnd2024:2024:class:barbarian:srd-5.2';
const SUBCLASS_ID='dnd2024:2024:subclass:barbarian:berserker:srd-5.2';
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const constant=value=>({type:'constant',value});
const runtime=path=>({type:'runtime',path});
const formula=formula=>({type:'formula',formula});
const pred=description=>({type:'custom',description});
const trigger=(event,description,extra={})=>({event,...(description?{description}:{}),...extra});
const entityRef=(entityType,name,canonicalId)=>({entityType,name,canonicalId});
const choice=(options,count=1)=>({kind:'enum',count,options});
const featureRef=(name,level)=>entityRef('feature',name,classFeatureId(name,level));
const itemRef=name=>entityRef('item',name,`dnd2024:2024:item:${slug(name)}:srd-5.2`);

function base(entityType,name,id,sourceKey){return {id,canonicalId:id,entityType,name,system:{gameSystem:'dnd2024',rulesVersion:'2024'},source:{sourceId:'srd-5.2',book:'XPHB',license:'CC-BY-4.0',licenseUrl:LIC},provenance:{origin:'import',provider:'5etools',sourceKey,adapterVersion:'0.4.0',mapperVersion:'0.4.0'},schemaVersion:1};}
function classFeatureId(name,level){
  if(name==='Ability Score Improvement') return 'dnd2024:2024:feature:barbarian:ability-score-improvement:srd-5.2';
  if(name==='Improved Brutal Strike') return `dnd2024:2024:feature:barbarian:improved-brutal-strike:${level}:srd-5.2`;
  return `dnd2024:2024:feature:barbarian:${slug(name)}:srd-5.2`;
}
function subclassFeatureId(name){return `dnd2024:2024:feature:barbarian:berserker:${slug(name)}:srd-5.2`;}
function rules(entries){return {rules:Array.isArray(entries)?entries:[]};}

const source=await (await fetch(URL)).json();
const cls=source.class.find(x=>x.source==='XPHB'&&x.srd52);
const sub=source.subclass.find(x=>x.source==='XPHB'&&x.classSource==='XPHB'&&x.srd52&&x.shortName==='Berserker');
const cf=source.classFeature.filter(x=>x.className==='Barbarian'&&x.classSource==='XPHB'&&x.srd52);
const sf=source.subclassFeature.filter(x=>x.className==='Barbarian'&&x.classSource==='XPHB'&&x.subclassSource==='XPHB'&&x.subclassShortName==='Berserker'&&x.srd52);
if(!cls||!sub) throw new Error('SRD 5.2 Barbarian/Berserker not found');

const progression=cls.classTableGroups[0].rows.map((row,i)=>({level:i+1,rages:Number(row[0]),rageDamage:Number(row[1].value),weaponMastery:Number(row[2])}));
const excluded=new Set(['Barbarian Subclass','Subclass Feature']);
const classDefs=[]; const seen=new Set();
for(const f of cf){
  if(excluded.has(f.name)) continue;
  const id=classFeatureId(f.name,f.level);
  if(seen.has(id)) continue;
  seen.add(id); classDefs.push(f);
}
const subDefs=sf.filter(x=>x.name!=='Path of the Berserker');

function rageData(f){return {
  featureKind:'classFeature',category:'barbarian',text:rules(f.entries),
  activities:[{id:'rage',name:'Rage',kind:'utility',activation:{type:'bonusAction',cost:1,predicate:pred('You cannot activate Rage while wearing Heavy armor.')},target:{type:'self'},duration:{type:'special',value:constant(10),unit:'minute'},uses:{max:runtime('class.barbarian.rages'),sharedResourceId:'barbarian-rage',recovery:[{period:'shortRest',amount:1},{period:'longRest',amount:'all'}]},description:'Enter Rage. It initially lasts through the end of your next turn, can be extended by attacking, forcing a save, or using a Bonus Action, and has a maximum duration of 10 minutes.'}],
  states:[{id:'rage-active',valueType:'boolean',initial:constant(false),transitions:[{trigger:trigger('onActivate','Rage is activated.'),operation:'set',value:constant(true)},{trigger:trigger('custom','End Rage if you don Heavy armor, become Incapacitated, fail to extend it before the end of your next turn, or reach the maximum duration.'),operation:'set',value:constant(false)},{trigger:trigger('custom','Extend Rage to the end of your next turn after an attack roll against an enemy, forcing an enemy saving throw, or spending the Bonus Action to extend Rage.'),operation:'set',value:constant(true)}]}],
  effects:[{id:'rage-benefits',predicate:pred('While Rage is active.'),modifiers:[
    {target:{domain:'damageResistance',damageType:'bludgeoning'},mode:'grantResistance'},
    {target:{domain:'damageResistance',damageType:'piercing'},mode:'grantResistance'},
    {target:{domain:'damageResistance',damageType:'slashing'},mode:'grantResistance'},
    {target:{domain:'abilityCheck',ability:'strength'},mode:'advantage'},
    {target:{domain:'savingThrow',ability:'strength'},mode:'advantage'},
    {target:{domain:'spellcasting'},mode:'prevent'},
    {target:{domain:'concentration'},mode:'prevent'}
  ]}],
  damageRules:[{id:'rage-damage',action:'extraDamage',value:runtime('class.barbarian.rageDamage'),inheritDamageType:true,trigger:trigger('onDamage','Strength-based weapon or Unarmed Strike deals damage.'),predicate:pred('Rage is active and the attack uses Strength.')}],
  properties:['sustained-round-by-round','maximum-duration:10-minutes']
};}

function classFeatureData(f){
  const d={featureKind:'classFeature',category:'barbarian',text:rules(f.entries)};
  switch(f.name){
    case 'Rage': return rageData(f);
    case 'Unarmored Defense': d.modifiers=[{target:{domain:'armorClass'},mode:'replace',value:formula('10 + @abilities.dex.mod + @abilities.con.mod'),predicate:{type:'not',predicate:{type:'wearingArmor',armorCategories:['light','medium','heavy']}},description:'A Shield is allowed.'}]; break;
    case 'Weapon Mastery': d.classRules={entityCollections:[{id:'barbarian-weapon-masteries',entityTypes:['item'],capacity:runtime('class.barbarian.weaponMastery'),filter:pred('Simple or Martial Melee weapons only.'),chooseOn:trigger('onApply','Choose mastered weapon kinds when the feature is gained.'),replace:{trigger:trigger('onRest','After a Long Rest, you may replace one mastered weapon.'),count:constant(1),filter:pred('Simple or Martial Melee weapons only.')}}]}; break;
    case 'Danger Sense': d.saveRules=[{id:'danger-sense',abilities:['dexterity'],mode:'advantage',predicate:{type:'lacksCondition',condition:'incapacitated'}}]; break;
    case 'Reckless Attack': d.activities=[{id:'reckless-attack',name:'Reckless Attack',kind:'utility',activation:{type:'free',trigger:trigger('onAttack','When you make your first attack roll on your turn.',{firstTimeOnTurn:true})},target:{type:'self'},effects:[{id:'reckless-attack-effect',duration:{type:'untilTrigger',endTrigger:trigger('onTurnStart','Start of your next turn.')},modifiers:[{target:{domain:'attackRoll',ability:'strength'},mode:'advantage'},{target:{domain:'incomingAttackRoll'},mode:'advantage'}]}]}]; break;
    case 'Primal Knowledge': d.proficiencyChoices=[choice(['Animal Handling','Athletics','Intimidation','Nature','Perception','Survival'],1)]; d.abilitySubstitutions=[{id:'primal-knowledge-strength',target:'abilityCheck',ability:'strength',skills:['Acrobatics','Intimidation','Perception','Stealth','Survival'],predicate:pred('Only while Rage is active.')}]; break;
    case 'Ability Score Improvement': d.grants=[{type:'entity',choice:{kind:'tagQuery',count:1,entityTypes:['feature'],query:{all:[{field:'data.featureKind',operator:'eq',value:'feat'}]}}}]; break;
    case 'Extra Attack': d.classMechanics={generatedActions:[{trigger:trigger('custom','When you take the Attack action on your turn.'),action:'attack',asPartOfTriggeringAction:true,count:constant(1)}]}; break;
    case 'Fast Movement': d.modifiers=[{target:{domain:'movement',movementType:'walk'},mode:'bonus',value:constant(10),predicate:{type:'not',predicate:{type:'wearingArmor',armorCategories:['heavy']}}}]; break;
    case 'Feral Instinct': d.rollRules=[{id:'feral-instinct',target:'initiative',operation:'advantage'}]; break;
    case 'Instinctive Pounce': d.movementInteractionRules=[{id:'instinctive-pounce',action:'move',subject:'self',distance:formula('@movement.walk / 2'),trigger:trigger('onActivate','As part of the Bonus Action used to enter Rage.')}]; break;
    case 'Brutal Strike': d.damageRules=[{id:'brutal-strike-damage',action:'extraDamage',formula:'1d10',inheritDamageType:true,trigger:trigger('onHit','When the chosen Strength-based attack hits.'),predicate:pred('Use Reckless Attack, forgo Advantage on this attack, and the attack must not have Disadvantage.')}]; d.movementInteractionRules=[{id:'forceful-blow-push',action:'forcedMove',subject:'target',direction:'awayFromSource',distance:{value:15,unit:'ft'},trigger:trigger('onHit','Forceful Blow')},{id:'forceful-blow-follow',action:'move',subject:'self',direction:'towardSource',distance:formula('@movement.walk / 2'),trigger:trigger('onHit','After Forceful Blow; this movement does not provoke Opportunity Attacks.')},{id:'hamstring-blow',action:'setSpeed',subject:'target',distance:formula('@movement.walk - 15'),trigger:trigger('onHit','Hamstring Blow; lasts until start of your next turn.')}]; d.properties=['brutal-strike-options:forceful-blow,hamstring-blow']; break;
    case 'Relentless Rage': d.states=[{id:'relentless-rage-dc',valueType:'number',initial:constant(10),min:10,transitions:[{trigger:trigger('custom','After each use after the first.'),operation:'add',value:constant(5)},{trigger:trigger('onRest','Short or Long Rest.'),operation:'reset'}]}]; d.triggeredGrants=[{id:'relentless-rage',trigger:trigger('onDropToZero','While Rage is active and you are not killed outright.'),grant:'setHitPoints',value:formula('2 * @classes.barbarian.level'),predicate:pred('Succeeds on a Constitution saving throw against the current Relentless Rage DC.')}]; break;
    case 'Improved Brutal Strike': if(f.level===13){d.effects=[{id:'staggering-blow',duration:{type:'untilTrigger',endTrigger:trigger('onTurnStart','Start of your next turn.')},modifiers:[{target:{domain:'savingThrow'},mode:'disadvantage'}],description:'Target also cannot make Opportunity Attacks.'},{id:'sundering-blow',duration:{type:'untilTrigger',endTrigger:trigger('onAttack','Consumed by the next qualifying attack from another creature.')},modifiers:[{target:{domain:'incomingAttackRoll'},mode:'bonus',value:constant(5)}]}];d.properties=['adds-brutal-options:staggering-blow,sundering-blow'];} else {d.damageRules=[{id:'improved-brutal-strike-damage',action:'extraDamage',formula:'2d10',inheritDamageType:true,trigger:trigger('onHit','Replaces the 1d10 Brutal Strike extra damage at Barbarian level 17.'),predicate:pred('A qualifying Brutal Strike.') }];d.properties=['brutal-strike-option-count:2','replaces-brutal-strike-damage:2d10'];} break;
    case 'Persistent Rage': d.classRules={resourceMutations:[{resourceId:'barbarian-rage',trigger:trigger('onInitiative','Regain all expended Rage uses once per Long Rest.'),operation:'restoreAll'}]}; d.properties=['rage-no-round-extension-required','rage-ends-on-unconscious-or-heavy-armor','initiative-refresh-once-per-long-rest']; break;
    case 'Indomitable Might': d.classMechanics={resolutionOverrides:[{domain:'check',mode:'replaceTotal',value:{type:'abilityScore',ability:'strength'},predicate:pred('Strength check total is lower than your Strength score.')},{domain:'save',mode:'replaceTotal',value:{type:'abilityScore',ability:'strength'},predicate:pred('Strength saving throw total is lower than your Strength score.')}]}; break;
    case 'Epic Boon': d.grants=[{type:'entity',choice:{kind:'tagQuery',count:1,entityTypes:['feature'],query:{all:[{field:'data.featureKind',operator:'eq',value:'feat'}]}}}]; d.properties=['recommended:Boon of Irresistible Offense']; break;
    case 'Primal Champion': d.modifiers=[{target:{domain:'abilityScore',ability:'strength'},mode:'bonus',value:constant(4)},{target:{domain:'abilityScore',ability:'strength'},mode:'maximum',value:constant(25)},{target:{domain:'abilityScore',ability:'constitution'},mode:'bonus',value:constant(4)},{target:{domain:'abilityScore',ability:'constitution'},mode:'maximum',value:constant(25)}]; break;
  }
  return d;
}

function subclassFeatureData(f){
  const d={featureKind:'subclassFeature',category:'barbarian-berserker',text:rules(f.entries)};
  switch(f.name){
    case 'Frenzy': d.damageRules=[{id:'frenzy-damage',action:'extraDamage',formula:'{@classScale barbarian.rageDamage}d6',inheritDamageType:true,trigger:trigger('onHit','First target hit on your turn.'),predicate:pred('Rage is active, Reckless Attack was used, and the attack is Strength-based.')}]; break;
    case 'Mindless Rage': d.effects=[{id:'mindless-rage-immunity',predicate:pred('While Rage is active.'),conditions:[{action:'immunity',conditions:['charmed','frightened']}]},{id:'mindless-rage-cleanse',trigger:trigger('onActivate','When Rage begins.'),conditions:[{action:'remove',conditions:['charmed','frightened']}]}]; break;
    case 'Retaliation': d.activities=[{id:'retaliation',name:'Retaliation',kind:'attack',activation:{type:'reaction',trigger:trigger('onDamageTaken','A creature within 5 feet damages you.')},target:{type:'creature',count:1,restrictions:[pred('The creature that damaged you is within 5 feet.')]},attack:{classification:'special',mode:'melee'},description:'Make one melee attack using a weapon or an Unarmed Strike against the triggering creature.'}]; break;
    case 'Intimidating Presence': d.activities=[{id:'intimidating-presence',name:'Intimidating Presence',kind:'save',activation:{type:'bonusAction'},target:{type:'creature',count:formula('@chosen'),disposition:'enemy',area:{shape:'emanation',size:{value:30,unit:'ft'}}},save:{ability:'wisdom',dc:{type:'formula',formula:'8 + @abilities.str.mod + @proficiency'}},conditions:[{condition:'frightened',duration:{type:'timed',value:constant(1),unit:'minute'},end:'Repeat the save at the end of each turn, ending on success.'}],uses:{max:1,sharedResourceId:'berserker-intimidating-presence',recovery:[{period:'longRest',amount:'all'}]},description:'Once per Long Rest, or restore the use by expending one Rage use.'}]; d.crossResourceRules=[{trigger:trigger('custom','Spend one Rage use to restore Intimidating Presence.'),consume:{resourceId:'barbarian-rage',amount:constant(1)},restore:{resourceId:'berserker-intimidating-presence',amount:constant(1)}}]; break;
  }
  return d;
}

const classFeatures=classDefs.map(f=>({...base('feature',f.name,classFeatureId(f.name,f.level),`XPHB:classFeature:Barbarian:${f.name}:${f.level}`),data:classFeatureData(f)}));
const subclassFeatures=subDefs.map(f=>({...base('feature',f.name,subclassFeatureId(f.name),`XPHB:subclassFeature:Barbarian:Berserker:${f.name}:${f.level}`),data:subclassFeatureData(f)}));

const classFeatureAt=(name,level)=>entityRef('feature',name,classFeatureId(name,level));
const adv=[];
for(const p of progression){
  const grants=[];
  for(const f of cf.filter(x=>x.level===p.level&&!excluded.has(x.name))){
    const r=classFeatureAt(f.name,f.level); if(!grants.some(g=>g.entity?.canonicalId===r.canonicalId)) grants.push({type:'entity',entity:r});
  }
  const step={level:p.level,grants,scaleValues:{rages:p.rages,rageDamage:p.rageDamage,weaponMastery:p.weaponMastery}};
  if(p.level===3) step.choices=[{kind:'tagQuery',count:1,entityTypes:['subclass'],query:{all:[{field:'data.parentClass.canonicalId',operator:'eq',value:CLASS_ID}]}}];
  adv.push(step);
}
const classEntity={...base('class','Barbarian',CLASS_ID,'XPHB:class:Barbarian'),data:{hitDie:12,primaryAbilities:['strength'],savingThrowProficiencies:['strength','constitution'],armorTraining:['light','medium','shield'],weaponProficiencies:['simple','martial'],skillChoices:choice(['Animal Handling','Athletics','Intimidation','Nature','Perception','Survival'],2),equipmentBundles:[{id:'A',label:'Greataxe, Handaxes, Explorer’s Pack, and 15 GP',grants:[{entity:itemRef('Greataxe')},{entity:itemRef('Handaxe'),quantity:4},{entity:itemRef("Explorer's Pack")},{currency:{amount:15,currency:'gp'}}]},{id:'B',label:'75 GP',grants:[{currency:{amount:75,currency:'gp'}}]}],spellcasting:{type:'none'},advancement:adv,subclassLevel:3,text:{rules:[]}}};

const subAdv=subDefs.map(f=>({level:f.level,grants:[{type:'entity',entity:entityRef('feature',f.name,subclassFeatureId(f.name))}]}));
const subclassEntity={...base('subclass','Path of the Berserker',SUBCLASS_ID,'XPHB:subclass:Barbarian:Berserker'),data:{parentClass:entityRef('class','Barbarian',CLASS_ID),advancement:subAdv,text:{rules:(sf.find(x=>x.name==='Path of the Berserker')?.entries??[])}}};

await fs.mkdir(ROOT,{recursive:true});
async function write(file,entityType,items){await fs.writeFile(path.join(ROOT,file),JSON.stringify({format:'oraclerpg-compendium',version:1,contentSource:'srd-5.2',entityType,count:items.length,items},null,2)+'\n');}
await write('classes.json','class',[classEntity]);
await write('class-features.json','feature',[...classFeatures,...subclassFeatures]);
await write('subclasses.json','subclass',[subclassEntity]);

const issues=[];
if(cf.length!==26) issues.push(`Expected 26 source class-feature records, got ${cf.length}`);
if(sf.length!==5) issues.push(`Expected 5 source Berserker records, got ${sf.length}`);
if(progression.length!==20) issues.push(`Expected 20 progression rows, got ${progression.length}`);
if(classFeatures.length!==19) issues.push(`Expected 19 canonical Barbarian class-feature definitions, got ${classFeatures.length}`);
if(subclassFeatures.length!==4) issues.push(`Expected 4 canonical Berserker feature definitions, got ${subclassFeatures.length}`);
for(const name of ['Rage','Weapon Mastery','Reckless Attack','Primal Knowledge','Brutal Strike','Relentless Rage','Persistent Rage','Indomitable Might','Primal Champion']) if(!classFeatures.find(x=>x.name===name)) issues.push(`Missing ${name}`);
for(const name of ['Frenzy','Mindless Rage','Retaliation','Intimidating Presence']) if(!subclassFeatures.find(x=>x.name===name)) issues.push(`Missing Berserker ${name}`);
const structured=classFeatures.concat(subclassFeatures).filter(x=>Object.keys(x.data).some(k=>!['featureKind','category','text','properties'].includes(k))).length;
const audit={status:issues.length?'PARTIAL':'SUPPORTED',source:{classFeatureRecords:cf.length,subclassFeatureRecords:sf.length},oracle:{classes:1,subclasses:1,classFeatureDefinitions:classFeatures.length,subclassFeatureDefinitions:subclassFeatures.length,structuredDefinitions:structured},progression:{levels:adv.length,rows:progression},issues};
await fs.writeFile(path.join(ROOT,'barbarian-coverage-audit.json'),JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify(audit,null,2));
if(issues.length) process.exit(1);
