import fs from 'node:fs/promises';
const ROOT='packages/content/data/srd-5.2';
const load=async n=>JSON.parse(await fs.readFile(`${ROOT}/${n}`,'utf8'));
const save=async(n,v)=>fs.writeFile(`${ROOT}/${n}`,JSON.stringify(v,null,2));
const c=value=>({type:'constant',value});
const pb=()=>({type:'proficiencyBonus',subject:'self'});
const con=()=>({type:'abilityModifier',ability:'con',subject:'self'});
const ref=name=>({canonicalId:`dnd2024:2024:feature:species-${name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}:srd-5.2`,name,entityType:'feature'});

const species=await load('species.json');
const features=await load('species-features.json');
const feats=await load('feats.json');
const fMap=new Map(features.items.map(x=>[x.name,x]));
const featMap=new Map(feats.items.map(x=>[x.name,x]));

// Choice semantics which cannot be represented as simultaneous grants.
const asi=featMap.get('Ability Score Improvement')?.data;
if(asi){asi.abilityScoreOptionMode='chooseOne'; for(const o of asi.abilityScoreOptions??[]) o.maximum??=20;}
for(const x of feats.items) if(x.data.featCategory==='epicBoon' && x.data.abilityScoreOptions?.length){x.data.abilityScoreOptionMode='chooseOne';for(const o of x.data.abilityScoreOptions)o.maximum??=30;}
const mi=featMap.get('Magic Initiate')?.data;
if(mi?.spellGrants?.length){mi.spellGrantChoices=[{id:'magic-initiate-spell-list',count:1,options:mi.spellGrants,distinctAcrossRepeats:true,sharedSelectionKey:'magic-initiate-list'}];delete mi.spellGrants;}
const fate=featMap.get('Boon of Fate')?.data;
if(fate?.actionRules?.[0]) fate.actionRules[0].recoveryTriggers=[{event:'onInitiative',actor:'self'}];
const travel=featMap.get('Boon of Dimensional Travel')?.data;
if(travel?.movementInteractionRules?.[0]){delete travel.movementInteractionRules[0].trigger;travel.movementInteractionRules[0].afterActions=['attack','magic'];}

// Goliath's Giant Ancestry is a choice among six reusable feature definitions.
const giantOptions=[
  ['Cloud\'s Jaunt',{actionRules:[{id:'clouds-jaunt',activity:{id:'clouds-jaunt',name:"Cloud's Jaunt",kind:'utility',activation:{type:'bonusAction',cost:1},target:{type:'space'},range:{normal:{value:30,unit:'ft'}},uses:{max:pb(),recovery:[{period:'longRest',amount:'all'}]},description:'Teleport up to 30 feet to an unoccupied space you can see.'}}]}],
  ['Fire\'s Burn',{damageRules:[{id:'fires-burn',action:'extraDamage',formula:'1d10',damageTypes:['fire'],trigger:{event:'onHit',actor:'self'},usage:{max:pb(),scope:'rest',recovery:[{period:'longRest',amount:'all'}]}}]}],
  ['Frost\'s Chill',{damageRules:[{id:'frosts-chill',action:'extraDamage',formula:'1d6',damageTypes:['cold'],trigger:{event:'onHit',actor:'self'},usage:{max:pb(),scope:'rest',recovery:[{period:'longRest',amount:'all'}]}}],effects:[{id:'frosts-chill-slow',trigger:{event:'onHit',actor:'target'},modifiers:[{target:{domain:'movement'},mode:'penalty',value:c(10),duration:{type:'untilTrigger',endTrigger:{event:'onTurnStart',actor:'self'}}}]}]}],
  ['Hill\'s Tumble',{effects:[{id:'hills-tumble',trigger:{event:'onHit',actor:'target'},predicate:{type:'size',sizes:['tiny','small','medium','large']},conditions:[{action:'apply',conditions:['prone']}]}],properties:['uses:proficiencyBonus/longRest']}],
  ['Stone\'s Endurance',{damageRules:[{id:'stones-endurance',action:'reduceIncoming',formula:'1d12 + @ability.con.mod',value:con(),trigger:{event:'onDamageTaken',actor:'self'},usage:{max:pb(),scope:'rest',recovery:[{period:'longRest',amount:'all'}]}}]}],
  ['Storm\'s Thunder',{actionRules:[{id:'storms-thunder',activity:{id:'storms-thunder',name:"Storm's Thunder",kind:'damage',activation:{type:'reaction',cost:1,trigger:{event:'onDamageTaken',actor:'self'}},range:{normal:{value:60,unit:'ft'}},target:{type:'creature',count:1,disposition:'enemy'},damage:[{formula:'1d8',damageType:'thunder'}],uses:{max:pb(),recovery:[{period:'longRest',amount:'all'}]}}}]}]
];
const template=fMap.get('Giant Ancestry');
for(const [name,data] of giantOptions){
  if(!fMap.has(name)){
    const base=JSON.parse(JSON.stringify(template));
    base.id=base.canonicalId=ref(name).canonicalId;base.name=name;base.provenance.sourceKey=`XPHB:speciesFeature:${name}`;base.data={featureKind:'speciesFeature',category:'species',...data,text:{rules:[`Goliath Giant Ancestry option: ${name}.`]}};
    features.items.push(base);fMap.set(name,base);
  }
}
features.items.sort((a,b)=>a.name.localeCompare(b.name));features.count=features.items.length;
const goliath=species.items.find(x=>x.name==='Goliath');
if(goliath){
  const optionNames=giantOptions.map(x=>x[0]);
  for(const v of goliath.data.variants??[]){
    const match=optionNames.find(n=>v.name.toLowerCase().includes(n.split("'")[0].toLowerCase()) || v.name.toLowerCase().includes(n.split(' ')[0].toLowerCase()));
    if(match) v.grants=[{type:'entity',entity:ref(match)}];
  }
}

// Magic Initiate must keep its level-1 spell prepared in addition to its free cast.
for(const choice of mi?.spellGrantChoices??[]) for(const option of choice.options) for(const sel of option.selections){
  if(sel.mode==='innate' && /level=1/.test(sel.query??'')) sel.alsoPrepared=true;
}

const structuredKeys=['activities','grants','modifiers','rollRules','resourcePreservationRules','triggeredGrants','restRules','capacityRules','movementInteractionRules','damageRules','saveRules','actionRules','spellGrants','spellGrantChoices','abilityScoreOptions','proficiencyChoices','speciesTemplate','properties'];
const speciesCoverage=features.items.map(x=>({name:x.name,structured:structuredKeys.some(k=>Array.isArray(x.data[k])?x.data[k].length>0:Boolean(x.data[k]))}));
const featCoverage=feats.items.map(x=>({name:x.name,structured:structuredKeys.some(k=>Array.isArray(x.data[k])?x.data[k].length>0:Boolean(x.data[k]))}));
const goliathVariants=goliath?.data.variants??[];
const audit={
  generatedAt:new Date().toISOString(),
  speciesFeatureCount:features.items.length,
  structuredSpeciesFeatures:speciesCoverage.filter(x=>x.structured).length,
  unstructuredSpeciesFeatures:speciesCoverage.filter(x=>!x.structured).map(x=>x.name),
  featCount:feats.items.length,
  structuredFeats:featCoverage.filter(x=>x.structured).length,
  unstructuredFeats:featCoverage.filter(x=>!x.structured).map(x=>x.name),
  magicInitiateChoiceCorrect:Boolean(mi?.spellGrantChoices?.length===1 && !mi.spellGrants),
  abilityScoreImprovementChoiceCorrect:asi?.abilityScoreOptionMode==='chooseOne',
  goliathVariantGrants:goliathVariants.filter(x=>x.grants?.length).length,
};
await save('species.json',species);await save('species-features.json',features);await save('feats.json',feats);await save('species-feats-semantic-audit.json',audit);console.log(JSON.stringify(audit,null,2));
