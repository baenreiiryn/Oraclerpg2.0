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
const fail=(m)=>issues.push(m);
if(classDoc.name!=='Barbarian'||classDoc.type!=='class') fail('Foundry Barbarian class document not found');
if(subclassDoc.name!=='Path of the Berserker'||subclassDoc.type!=='subclass') fail('Foundry Berserker subclass document not found');
if(!oracle) fail('Oracle Barbarian missing');
if(!oracleSub) fail('Oracle Berserker missing');
if(oracle){
  if(oracle.data.hitDie!==12) fail('Oracle Barbarian hit die is not d12');
  if(JSON.stringify(oracle.data.savingThrowProficiencies)!==JSON.stringify(['strength','constitution'])) fail('Saving throw proficiencies differ');
  if(oracle.data.advancement.length!==20) fail('Oracle advancement is not level-complete');
  const expectedScales={1:[2,2,2],4:[3,2,3],9:[4,3,3],10:[4,3,4],16:[5,4,4],20:[6,4,4]};
  for(const [lvl,vals] of Object.entries(expectedScales)){const s=oracle.data.advancement[Number(lvl)-1].scaleValues;const got=[s.rages,s.rageDamage,s.weaponMastery];if(JSON.stringify(got)!==JSON.stringify(vals))fail(`Scale values L${lvl}: ${got} != ${vals}`);}
}
const oracleClass=features.items.filter(x=>x.data.featureKind==='classFeature');
const oracleSubclass=features.items.filter(x=>x.data.featureKind==='subclassFeature');
for(const f of foundryClassFeatures){
  if(!f?.name) continue;
  if(f.name==='Ability Score Improvement') {classified.push({name:f.name,type:'representation',reason:'Foundry models ASI primarily as class advancement; Oracle exposes a reusable class feature linked to the feat choice.'});continue;}
  const matches=oracleClass.filter(x=>x.name===f.name);
  if(!matches.length) fail(`Foundry class feature missing in Oracle: ${f.name}`);
}
for(const f of foundrySubFeatures){if(f?.name&&!oracleSubclass.some(x=>x.name===f.name))fail(`Foundry subclass feature missing in Oracle: ${f.name}`);}
const required=['Rage','Unarmored Defense','Weapon Mastery','Danger Sense','Reckless Attack','Primal Knowledge','Extra Attack','Fast Movement','Feral Instinct','Instinctive Pounce','Brutal Strike','Relentless Rage','Persistent Rage','Indomitable Might','Primal Champion'];
for(const n of required) if(!oracleClass.some(x=>x.name===n)) fail(`Required Foundry/Oracle feature missing: ${n}`);
for(const n of ['Frenzy','Mindless Rage','Retaliation','Intimidating Presence']) if(!oracleSubclass.some(x=>x.name===n)) fail(`Required Berserker feature missing: ${n}`);
const foundryScaleTypes=(classDoc.system?.advancement??[]).filter(x=>x.type==='ScaleValue').map(x=>x.title).filter(Boolean);
for(const title of ['Rage Damage','Weapon Masteries Known','Brutal Strike']) if(!foundryScaleTypes.includes(title)) fail(`Foundry scale not observed: ${title}`);
classified.push({type:'representation',reason:'Foundry models ASI/Epic Boon and some class choices as Advancement documents; Oracle keeps reusable feature entities plus AdvancementStep references.'});
const report={status:issues.length?'PARTIAL':'SUPPORTED',foundry:{class:classDoc.name,subclass:subclassDoc.name,classFeatureDocuments:foundryClassFeatures.length,subclassFeatureDocuments:foundrySubFeatures.length,scaleValues:foundryScaleTypes},oracle:{classFeatureDefinitions:oracleClass.length,subclassFeatureDefinitions:oracleSubclass.length},classifiedDifferences:classified,issues};
await fs.writeFile(`${root}/barbarian-foundry-comparison.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(issues.length)process.exit(1);
