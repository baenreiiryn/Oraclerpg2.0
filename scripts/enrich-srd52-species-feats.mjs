import fs from 'node:fs/promises';
const ROOT='packages/content/data/srd-5.2';
const load=async n=>JSON.parse(await fs.readFile(`${ROOT}/${n}`,'utf8'));
const save=async(n,v)=>fs.writeFile(`${ROOT}/${n}`,JSON.stringify(v,null,2));
const c=value=>({type:'constant',value});
const pb=()=>({type:'proficiencyBonus',subject:'self'});
const charLevel=()=>({type:'characterLevel',subject:'self'});
const runtime=path=>({type:'runtime',path,subject:'self'});
const usage=(max,recovery=[])=>({max,scope:'rest',recovery});
const lr=[{period:'longRest',amount:'all'}], sr=[{period:'shortRest',amount:'all'}];

const speciesDoc=await load('species.json');
const sfDoc=await load('species-features.json');
const featDoc=await load('feats.json');
const sf=new Map(sfDoc.items.map(x=>[x.name,x]));
const feats=new Map(featDoc.items.map(x=>[x.name,x]));
const species=new Map(speciesDoc.items.map(x=>[x.name,x]));
const get=(m,n)=>{const x=m.get(n);if(!x)throw new Error(`Missing ${n}`);return x.data;};
const sfd=n=>get(sf,n), fd=n=>get(feats,n);

// Reusable species feature templates and structured mechanics.
Object.assign(sfd('Darkvision'),{
  speciesTemplate:{family:'sense',parameters:[{id:'range',kind:'number',required:true}],bindings:[{parameterId:'range',path:'grants.0.value.range.value'}]},
  grants:[{type:'sense',value:{type:'darkvision',range:{value:60,unit:'ft'}}}]
});
Object.assign(sfd('Damage Resistance'),{
  speciesTemplate:{family:'resistance',parameters:[{id:'damageType',kind:'damageType',required:true}],bindings:[{parameterId:'damageType',path:'modifiers.0.target.damageType'}]},
  modifiers:[{target:{domain:'damageResistance',damageType:'fire'},mode:'grantResistance'}]
});
Object.assign(sfd('Breath Weapon'),{
  speciesTemplate:{family:'attack',parameters:[{id:'damageType',kind:'damageType',required:true}],bindings:[{parameterId:'damageType',path:'activities.0.damage.0.damageType'}]},
  activities:[{id:'breath-weapon',name:'Breath Weapon',kind:'save',activation:{type:'action',cost:1},target:{type:'special',area:{shape:'special'}},save:{ability:'dex',dc:{type:'ability',ability:'con',base:8,proficiency:true},onSuccess:'half'},damage:[{formula:'1d10',damageType:'fire',scaling:{type:'characterLevel',progression:{5:'2d10',11:'3d10',17:'4d10'}}}],uses:{max:pb(),recovery:lr},description:'Replaces one attack; choose a 15-foot cone or a 30-by-5-foot line each use.'}],
  actionRules:[{id:'breath-replaces-attack',replacesAttack:true,activity:{id:'breath-weapon',name:'Breath Weapon',kind:'save'}}]
});
Object.assign(sfd('Draconic Ancestry'),{properties:['resolved-by-species-variants']});
Object.assign(sfd('Draconic Flight'),{
  advancement:[{level:5}],
  actionRules:[{id:'draconic-flight',activity:{id:'draconic-flight',name:'Draconic Flight',kind:'utility',activation:{type:'bonusAction',cost:1},target:{type:'self'},uses:{max:1,recovery:lr},duration:{type:'timed',value:10,unit:'minute'}}}],
  triggeredGrants:[{id:'draconic-flight-speed',trigger:{event:'onActivate',actor:'self'},grant:'movement',movement:{type:'fly',equalsSpeed:true},duration:{value:10,unit:'minute'},usage:usage(c(1),lr)}]
});
Object.assign(sfd('Dwarven Resilience'),{modifiers:[{target:{domain:'damageResistance',damageType:'poison'},mode:'grantResistance'}],saveRules:[{id:'dwarf-poison-save',conditions:['poisoned'],mode:'advantage'}]});
Object.assign(sfd('Dwarven Toughness'),{modifiers:[{target:{domain:'hitPointMaximum'},mode:'bonus',value:charLevel()}]});
Object.assign(sfd('Stonecunning'),{
  actionRules:[{id:'stonecunning',activity:{id:'stonecunning',name:'Stonecunning',kind:'utility',activation:{type:'bonusAction',cost:1},target:{type:'self'},uses:{max:pb(),recovery:lr},duration:{type:'timed',value:10,unit:'minute'},predicates:[{type:'hasTag',tags:['touchingStoneSurface']}]}}],
  triggeredGrants:[{id:'stonecunning-tremorsense',trigger:{event:'onActivate',actor:'self'},grant:'sense',sense:{type:'tremorsense',range:{value:60,unit:'ft'}},duration:{value:10,unit:'minute'},predicate:{type:'hasTag',tags:['touchingStoneSurface']}}]
});
Object.assign(sfd('Elven Lineage'),{properties:['resolved-by-species-variants']});
Object.assign(sfd('Fey Ancestry'),{saveRules:[{id:'fey-ancestry',conditions:['charmed'],mode:'advantage'}]});
Object.assign(sfd('Keen Senses'),{proficiencyChoices:[{kind:'enum',count:1,options:['insight','perception','survival']}]});
Object.assign(sfd('Trance'),{restRules:[{id:'trance-long-rest',rest:'longRest',duration:{value:4,unit:'hour'},sleepRequired:false,conscious:true}]});
Object.assign(sfd('Gnomish Cunning'),{saveRules:[{id:'gnomish-cunning',abilities:['int','wis','cha'],mode:'advantage'}]});
Object.assign(sfd('Gnomish Lineage'),{properties:['resolved-by-species-variants']});
Object.assign(sfd('Giant Ancestry'),{properties:['resolved-by-species-variants']});
Object.assign(sfd('Large Form'),{
  advancement:[{level:5}],
  actionRules:[{id:'large-form',activity:{id:'large-form',name:'Large Form',kind:'transform',activation:{type:'bonusAction',cost:1},target:{type:'self'},uses:{max:1,recovery:lr},duration:{type:'timed',value:10,unit:'minute'},description:'Become Large, gain Advantage on Strength checks, and Speed increases by 10 feet.'}}],
  modifiers:[{target:{domain:'abilityCheck',ability:'str'},mode:'advantage',duration:{type:'timed',value:c(10),unit:'minute'}},{target:{domain:'movement',movementType:'walk'},mode:'bonus',value:c(10),duration:{type:'timed',value:c(10),unit:'minute'}}]
});
Object.assign(sfd('Powerful Build'),{rollRules:[{id:'powerful-build-grapple',target:'abilityCheck',operation:'advantage',predicate:{type:'hasCondition',condition:'grappled'}}],capacityRules:[{id:'powerful-build-capacity',countAsSizeLarger:1}]});
Object.assign(sfd('Brave'),{saveRules:[{id:'brave',conditions:['frightened'],mode:'advantage'}]});
Object.assign(sfd('Halfling Nimbleness'),{movementInteractionRules:[{id:'halfling-nimbleness',action:'moveThroughSpace',predicate:{type:'size',description:'Creature is at least one size larger than self.'}}]});
Object.assign(sfd('Luck'),{rollRules:[{id:'halfling-luck',target:'d20Test',operation:'reroll',dieFaces:[1],choose:'either'}]});
Object.assign(sfd('Naturally Stealthy'),{movementInteractionRules:[{id:'naturally-stealthy',action:'hideBehindCreature',predicate:{type:'size',description:'Obscuring creature is at least one size larger than self.'}}]});
Object.assign(sfd('Resourceful'),{triggeredGrants:[{id:'resourceful',trigger:{event:'onRest',actor:'self',description:'After finishing a Long Rest.'},grant:'heroicInspiration',value:c(1)}]});
Object.assign(sfd('Skillful'),{proficiencyChoices:[{kind:'tagQuery',count:1,query:{all:[{field:'category',operator:'eq',value:'skill'}]}}]});
Object.assign(sfd('Versatile'),{grants:[{type:'entity',choice:{kind:'entity',count:1,entityTypes:['feature'],query:{all:[{field:'featCategory',operator:'eq',value:'origin'}]}}}]});
Object.assign(sfd('Adrenaline Rush'),{
  actionRules:[{id:'adrenaline-rush',activity:{id:'adrenaline-rush',name:'Adrenaline Rush',kind:'utility',activation:{type:'bonusAction',cost:1},target:{type:'self'},uses:{max:pb(),recovery:[...sr,...lr]},description:'Take the Dash action and gain Temporary Hit Points equal to Proficiency Bonus.'}}],
  triggeredGrants:[{id:'adrenaline-rush-thp',trigger:{event:'onActivate',actor:'self'},grant:'temporaryHitPoints',value:pb()}]
});
Object.assign(sfd('Relentless Endurance'),{triggeredGrants:[{id:'relentless-endurance',trigger:{event:'onDropToZero',actor:'self'},grant:'hitPoints',value:c(1),usage:usage(c(1),lr)}]});
Object.assign(sfd('Fiendish Legacy'),{properties:['resolved-by-species-variants']});
Object.assign(sfd('Otherworldly Presence'),{spellGrants:[{name:'Otherworldly Presence',ability:{choice:['int','wis','cha']},selections:[{mode:'known',spell:{canonicalId:'dnd2024:2024:spell:thaumaturgy:srd-5.2',name:'Thaumaturgy',entityType:'spell'}}]}]});

// Parameterize base species copies of shared features.
for(const item of speciesDoc.items){
  const params=[];
  if(item.data.darkvision) params.push({feature:{canonicalId:'dnd2024:2024:feature:species-darkvision:srd-5.2',name:'Darkvision',entityType:'feature'},values:{range:item.data.darkvision}});
  item.data.featureParameters=params;
  for(const v of item.data.variants??[]){
    v.featureParameters??=[];
    if(v.darkvision) v.featureParameters.push({feature:{canonicalId:'dnd2024:2024:feature:species-darkvision:srd-5.2',name:'Darkvision',entityType:'feature'},values:{range:v.darkvision}});
    if(v.resistances?.length) v.featureParameters.push({feature:{canonicalId:'dnd2024:2024:feature:species-damage-resistance:srd-5.2',name:'Damage Resistance',entityType:'feature'},values:{damageType:v.resistances[0]}});
  }
}

// Feat mechanics.
Object.assign(fd('Alert'),{
  modifiers:[{target:{domain:'initiative'},mode:'bonus',value:pb()}],
  actionRules:[{id:'initiative-swap',activity:{id:'initiative-swap',name:'Initiative Swap',kind:'utility',target:{type:'creature',count:1,disposition:'ally'},triggers:[{event:'onInitiative',actor:'self'}],predicates:[{type:'lacksCondition',condition:'incapacitated'}],description:'Swap your Initiative with one willing ally in the same combat who is not Incapacitated.'}}]
});
Object.assign(fd('Archery'),{modifiers:[{target:{domain:'attackRoll'},mode:'bonus',value:c(2),predicate:{type:'hasTag',tags:['rangedWeapon']}}]});
Object.assign(fd('Defense'),{modifiers:[{target:{domain:'armorClass'},mode:'bonus',value:c(1),predicate:{type:'wearingArmor',armorCategories:['light','medium','heavy']}}]});
Object.assign(fd('Savage Attacker'),{rollRules:[{id:'savage-attacker',target:'damageRoll',operation:'rollTwiceChoose',choose:'either',trigger:{event:'onHit',actor:'self'},predicate:{type:'hasTag',tags:['weaponAttack']},usage:{max:c(1),scope:'turn'}}]});
Object.assign(fd('Great Weapon Fighting'),{rollRules:[{id:'great-weapon-fighting',target:'damageRoll',operation:'minimumDieResult',dieFaces:[1,2],minimumDieResult:3,predicate:{type:'hasTag',tags:['meleeWeapon','twoHandedOrVersatile']}}]});
Object.assign(fd('Two-Weapon Fighting'),{modifiers:[{target:{domain:'damageRoll'},mode:'bonus',value:runtime('attack.abilityModifier'),predicate:{type:'hasTag',tags:['lightWeaponExtraAttack']}}]});
Object.assign(fd('Grappler'),{
  rollRules:[{id:'grappler-advantage',target:'attackRoll',operation:'advantage',predicate:{type:'hasCondition',condition:'grappled',description:'Target is Grappled by self.'}}],
  actionRules:[{id:'punch-and-grab',replacesAttack:false,activity:{id:'punch-and-grab',name:'Punch and Grab',kind:'utility',triggers:[{event:'onHit',actor:'self'}],predicates:[{type:'hasTag',tags:['unarmedStrike','attackAction']}],description:'Once per turn, use both Damage and Grapple options of the Unarmed Strike.'}}],
  movementInteractionRules:[{id:'fast-wrestler',action:'ignoreExtraCost',predicate:{type:'hasCondition',condition:'grappled',description:'Moving a creature Grappled by you that is your size or smaller.'}}]
});
Object.assign(fd('Boon of Combat Prowess'),{rollRules:[{id:'peerless-aim',target:'attackRoll',operation:'automaticSuccess',trigger:{event:'onMiss',actor:'self'},usage:{max:c(1),scope:'turn',recovery:[{period:'turn',amount:'all'}]}}]});
Object.assign(fd('Boon of Dimensional Travel'),{movementInteractionRules:[{id:'blink-steps',action:'teleport',distance:{value:30,unit:'ft'},trigger:{event:'manual',actor:'self',description:'Immediately after taking the Attack action or Magic action.'}}]});
Object.assign(fd('Boon of Fate'),{actionRules:[{id:'improve-fate',activity:{id:'improve-fate',name:'Improve Fate',kind:'utility',range:{normal:{value:60,unit:'ft'}},target:{type:'creature',count:1},rolls:[{id:'fate-roll',name:'Bonus/Penalty',formula:'2d4',purpose:'utility'}],uses:{max:1,recovery:[...sr,...lr]},triggers:[{event:'onCheck',description:'After a D20 Test succeeds or fails.'}],description:'Apply the roll as a bonus or penalty. Also recovers when Initiative is rolled.'}}]});
Object.assign(fd('Boon of Irresistible Offense'),{damageRules:[{id:'overcome-defenses',action:'ignoreResistance',damageTypes:['bludgeoning','piercing','slashing']},{id:'overwhelming-strike',action:'extraDamage',value:runtime('feature.abilityScoreSelection.score'),inheritDamageType:true,trigger:{event:'onCritical',actor:'self'}}]});
Object.assign(fd('Boon of Spell Recall'),{resourcePreservationRules:[{id:'free-casting',resource:'spellSlot',trigger:{event:'manual',actor:'self',description:'When casting with a level 1–4 spell slot.'},predicate:{type:'comparison',description:'Spell slot level is between 1 and 4.'},check:{formula:'1d4',operator:'eq',compareTo:runtime('spell.slotLevel')},preserveOnSuccess:true}]});
Object.assign(fd('Boon of the Night Spirit'),{
  actionRules:[{id:'merge-with-shadows',activity:{id:'merge-with-shadows',name:'Merge with Shadows',kind:'utility',activation:{type:'bonusAction',cost:1},target:{type:'self'},predicates:[{type:'hasTag',tags:['dimLightOrDarkness']}],conditions:[{condition:'invisible',duration:{type:'special'},end:'Immediately after taking an action, Bonus Action, or Reaction.'}]}}],
  modifiers:['acid','bludgeoning','cold','fire','force','lightning','necrotic','piercing','poison','slashing','thunder'].map(d=>({target:{domain:'damageResistance',damageType:d},mode:'grantResistance',predicate:{type:'hasTag',tags:['dimLightOrDarkness']}}))
});
// Truesight is already structured by the source-level sense grant.

const structuredKeys=['activities','grants','modifiers','rollRules','resourcePreservationRules','triggeredGrants','restRules','capacityRules','movementInteractionRules','damageRules','saveRules','actionRules','spellGrants','abilityScoreOptions','proficiencyChoices','speciesTemplate','properties'];
const featureCoverage=sfDoc.items.map(x=>({name:x.name,structured:structuredKeys.some(k=>x.data[k]?.length || (x.data[k] && !Array.isArray(x.data[k])))}));
const featCoverage=featDoc.items.map(x=>({name:x.name,structured:structuredKeys.some(k=>x.data[k]?.length || (x.data[k] && !Array.isArray(x.data[k])))}));
const audit={generatedAt:new Date().toISOString(),speciesFeatureCount:sfDoc.items.length,structuredSpeciesFeatures:featureCoverage.filter(x=>x.structured).length,unstructuredSpeciesFeatures:featureCoverage.filter(x=>!x.structured).map(x=>x.name),featCount:featDoc.items.length,structuredFeats:featCoverage.filter(x=>x.structured).length,unstructuredFeats:featCoverage.filter(x=>!x.structured).map(x=>x.name)};
await save('species.json',speciesDoc);await save('species-features.json',sfDoc);await save('feats.json',featDoc);await save('species-feats-semantic-audit.json',audit);console.log(JSON.stringify(audit,null,2));
