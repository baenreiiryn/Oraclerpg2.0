import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
const foundryRoot=process.argv[2]??'../foundry-dnd5e/packs/_source/classes24/barbarian';
const root='packages/content/data/srd-5.2';
const classes=JSON.parse(await fs.readFile(`${root}/classes.json`,'utf8'));
const features=JSON.parse(await fs.readFile(`${root}/class-features.json`,'utf8'));
const subclasses=JSON.parse(await fs.readFile(`${root}/subclasses.json`,'utf8'));
const oracle=classes.items.find(x=>x.name==='Barbarian');
const oracleSub=subclasses.items.find(x=>x.name==='Path of the Berserker');
const classDoc=YAML.parse(await fs.readFile(path.join(foundryRoot,'barbarian.yml'),'utf8'));
const subclassDoc=YAML.parse(await fs.readFile(path.join(foundryRoot,'path-of-the-berserker.yml'),'utf8'));
async function yamlDocs(dir){const out=[];for(const ent of await fs.readdir(dir,{withFileTypes:true})){if(ent.name.startsWith('_'))continue;const p=path.join(dir,ent.name);if(ent.isDirectory())out.push(...await yamlDocs(p));else if(ent.name.endsWith('.yml'))out.push(YAML.parse(await fs.readFile(p,'utf8')));}return out;}
const foundryClassFeatures=await yamlDocs(path.join(foundryRoot,'class-features'));
const foundrySubFeatures=await yamlDocs(path.join(foundryRoot,'subclass-features'));
const issues=[];const classified=[];
const fail=m=>issues.push(m);
if(classDoc.name!=='Barbarian'||classDoc.type!=='class') fail('Foundry Barbarian class document not found');
if(subclassDoc.name!=='Path of the Berserker'||subclassDoc.type!=='subclass') fail('Foundry Berserker subclass document not found');
if(!oracle) fail('Oracle Barbarian missing');
if(!oracleSub) fail('Oracle Berserker missing');
const foundryScaleDocs=(classDoc.system?.advancement??[]).filter(x=>x.type==='ScaleValue');
const foundryScaleTypes=foundryScaleDocs.map(x=>x.title).filter(Boolean);
function scaleAt(title,level){
  const doc=foundryScaleDocs.find(x=>x.title===title); if(!doc) return undefined;
  const scale=doc.configuration?.scale??{};
  const key=Object.keys(scale).map(Number).filter(x=>x<=level).sort((a,b)=>b-a)[0];
  if(key==null) return undefined; const entry=scale[String(key)];
  if(entry?.value!=null) return Number(entry.value);
  if(entry?.number!=null&&entry?.faces!=null) return `${entry.number}d${entry.faces}`;
  return undefined;
}
if(oracle){
  if(oracle.data.hitDie!==12) fail('Oracle Barbarian hit die is not d12');
  if(JSON.stringify(oracle.data.savingThrowProficiencies)!==JSON.stringify(['strength','constitution'])) fail('Saving throw proficiencies differ');
  if(oracle.data.advancement.length!==20) fail('Oracle advancement is not level-complete');
  for(let level=1;level<=20;level++){
    const s=oracle.data.advancement[level-1]?.scaleValues??{};
    const expected={rages:scaleAt('Rages',level),rageDamage:scaleAt('Rage Damage',level),weaponMastery:scaleAt('Weapon Masteries Known',level)};
    for(const [key,value] of Object.entries(expected)) if(value!=null&&s[key]!==value) fail(`Foundry scale ${key} L${level}: Oracle ${s[key]} != Foundry ${value}`);
  }
}
const oracleClass=features.items.filter(x=>x.data.featureKind==='classFeature');
const oracleSubclass=features.items.filter(x=>x.data.featureKind==='subclassFeature');
for(const f of foundryClassFeatures){
  if(!f?.name) continue;
  if(f.name==='Unarmed Strike'){
    classified.push({name:f.name,type:'provider-embedding',reason:'Foundry embeds the shared Unarmed Strike item in the Barbarian class folder. Oracle already stores Unarmed Strike in the item/rules layer, so it is not duplicated as a class feature.'});
    continue;
  }
  if(f.name==='Improved Brutal Strike (2)'){
    if(!oracleClass.some(x=>x.name==='Improved Brutal Strike'&&x.canonicalId.includes(':17:'))) fail('Oracle level-17 Improved Brutal Strike missing');
    else classified.push({name:f.name,type:'naming',reason:'Foundry suffixes the level-17 improvement with “(2)”; Oracle preserves the SRD/5etools name and distinguishes it by canonical level ID.'});
    continue;
  }
  const matches=oracleClass.filter(x=>x.name===f.name);
  if(!matches.length) fail(`Foundry class feature missing in Oracle: ${f.name}`);
}
for(const f of foundrySubFeatures){if(f?.name&&!oracleSubclass.some(x=>x.name===f.name))fail(`Foundry subclass feature missing in Oracle: ${f.name}`);}
const required=['Rage','Unarmored Defense','Weapon Mastery','Danger Sense','Reckless Attack','Primal Knowledge','Extra Attack','Fast Movement','Feral Instinct','Instinctive Pounce','Brutal Strike','Relentless Rage','Persistent Rage','Indomitable Might','Primal Champion'];
for(const n of required) if(!oracleClass.some(x=>x.name===n)) fail(`Required Foundry/Oracle feature missing: ${n}`);
for(const n of ['Frenzy','Mindless Rage','Retaliation','Intimidating Presence']) if(!oracleSubclass.some(x=>x.name===n)) fail(`Required Berserker feature missing: ${n}`);
for(const title of ['Rage Damage','Weapon Masteries Known','Brutal Strike','Rages']) if(!foundryScaleTypes.includes(title)) fail(`Foundry scale not observed: ${title}`);
const brutal9=oracleClass.find(x=>x.name==='Brutal Strike')?.data.damageRules?.[0]?.formula;
const brutal17=oracleClass.find(x=>x.name==='Improved Brutal Strike'&&x.canonicalId.includes(':17:'))?.data.damageRules?.[0]?.formula;
if(brutal9!==scaleAt('Brutal Strike',9)) fail(`Brutal Strike L9 damage ${brutal9} != Foundry ${scaleAt('Brutal Strike',9)}`);
if(brutal17!==scaleAt('Brutal Strike',17)) fail(`Brutal Strike L17 damage ${brutal17} != Foundry ${scaleAt('Brutal Strike',17)}`);
classified.push({type:'representation',reason:'Foundry stores some choices and improvements as Advancement documents; Oracle keeps reusable feature entities plus explicit AdvancementStep/scaleValues.'});
const report={status:issues.length?'PARTIAL':'SUPPORTED',foundry:{class:classDoc.name,subclass:subclassDoc.name,classFeatureDocuments:foundryClassFeatures.length,subclassFeatureDocuments:foundrySubFeatures.length,scaleValues:foundryScaleTypes},oracle:{classFeatureDefinitions:oracleClass.length,subclassFeatureDefinitions:oracleSubclass.length},classifiedDifferences:classified,issues};
await fs.writeFile(`${root}/barbarian-foundry-comparison.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(issues.length)process.exit(1);
