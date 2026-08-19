import fs from 'node:fs/promises';
const ROOT='packages/content/data/srd-5.2';
const URL='https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/class/class-barbarian.json';
const src=await (await fetch(URL)).json();
const cls=src.class.find(x=>x.source==='XPHB'&&x.srd52);
const sub=src.subclass.find(x=>x.source==='XPHB'&&x.classSource==='XPHB'&&x.srd52&&x.shortName==='Berserker');
const sourceFeatures=src.classFeature.filter(x=>x.className==='Barbarian'&&x.classSource==='XPHB'&&x.srd52);
const sourceSubFeatures=src.subclassFeature.filter(x=>x.className==='Barbarian'&&x.classSource==='XPHB'&&x.subclassSource==='XPHB'&&x.subclassShortName==='Berserker'&&x.srd52);
const classes=JSON.parse(await fs.readFile(`${ROOT}/classes.json`,'utf8'));
const features=JSON.parse(await fs.readFile(`${ROOT}/class-features.json`,'utf8'));
const subclasses=JSON.parse(await fs.readFile(`${ROOT}/subclasses.json`,'utf8'));
const oracle=classes.items.find(x=>x.name==='Barbarian');
const berserker=subclasses.items.find(x=>x.name==='Path of the Berserker');
const issues=[];
const eq=(label,a,b)=>{if(JSON.stringify(a)!==JSON.stringify(b))issues.push(`${label}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`)};
if(!oracle) issues.push('Oracle Barbarian missing');
if(!berserker) issues.push('Oracle Berserker missing');
if(oracle){
  eq('hit die',oracle.data.hitDie,cls.hd.faces);
  eq('primary ability',oracle.data.primaryAbilities,['strength']);
  eq('saving throws',oracle.data.savingThrowProficiencies,['strength','constitution']);
  eq('armor training',oracle.data.armorTraining,['light','medium','shield']);
  eq('weapon proficiencies',oracle.data.weaponProficiencies,['simple','martial']);
  eq('skill choice count',oracle.data.skillChoices.count,2);
  eq('skill choices',oracle.data.skillChoices.options,['Animal Handling','Athletics','Intimidation','Nature','Perception','Survival']);
  eq('advancement levels',oracle.data.advancement.length,20);
  const rows=cls.classTableGroups[0].rows;
  for(let i=0;i<20;i++){
    const scale=oracle.data.advancement[i].scaleValues;
    eq(`L${i+1} rages`,scale.rages,Number(rows[i][0]));
    eq(`L${i+1} rage damage`,scale.rageDamage,Number(rows[i][1].value));
    eq(`L${i+1} weapon mastery`,scale.weaponMastery,Number(rows[i][2]));
  }
  eq('equipment bundles',oracle.data.equipmentBundles.length,2);
}
const oracleClass=features.items.filter(x=>x.data.featureKind==='classFeature');
const oracleSub=features.items.filter(x=>x.data.featureKind==='subclassFeature');
const ignore=new Set(['Barbarian Subclass','Subclass Feature']);
const expected=new Map();
for(const f of sourceFeatures){if(ignore.has(f.name))continue;const key=f.name==='Improved Brutal Strike'?`${f.name}@${f.level}`:f.name;if(!expected.has(key))expected.set(key,{name:f.name,level:f.level});}
for(const e of expected.values()){
  const match=oracleClass.find(x=>x.name===e.name&&(e.name!=='Improved Brutal Strike'||x.canonicalId.includes(`:${e.level}:`)));
  if(!match) issues.push(`Missing class feature ${e.name} L${e.level}`);
}
for(const f of sourceSubFeatures.filter(x=>x.name!=='Path of the Berserker')) if(!oracleSub.some(x=>x.name===f.name)) issues.push(`Missing subclass feature ${f.name}`);
for(const name of ['Rage','Unarmored Defense','Weapon Mastery','Danger Sense','Reckless Attack','Primal Knowledge','Extra Attack','Fast Movement','Feral Instinct','Instinctive Pounce','Brutal Strike','Relentless Rage','Persistent Rage','Indomitable Might','Primal Champion']){
  const f=oracleClass.find(x=>x.name===name); if(!f) continue;
  const structured=Object.keys(f.data).some(k=>!['featureKind','category','text','properties'].includes(k));
  if(!structured) issues.push(`${name} is text-only`);
}
for(const name of ['Frenzy','Mindless Rage','Retaliation','Intimidating Presence']){
  const f=oracleSub.find(x=>x.name===name); if(!f) continue;
  const structured=Object.keys(f.data).some(k=>!['featureKind','category','text','properties'].includes(k));
  if(!structured) issues.push(`${name} is text-only`);
}
const report={status:issues.length?'PARTIAL':'SUPPORTED',source:{class:cls.name,subclass:sub.name,classFeatureRecords:sourceFeatures.length,subclassFeatureRecords:sourceSubFeatures.length},oracle:{classCount:classes.count,subclassCount:subclasses.count,classFeatures:oracleClass.length,subclassFeatures:oracleSub.length},issues};
await fs.writeFile(`${ROOT}/barbarian-5etools-comparison.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(issues.length)process.exit(1);
