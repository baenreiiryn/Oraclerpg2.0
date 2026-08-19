import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
const foundryRoot=process.argv[2]??'../foundry-dnd5e/packs/_source/classes24/bard';
const ROOT='packages/content/data/srd-5.2';
const classes=JSON.parse(await fs.readFile(`${ROOT}/classes.json`,'utf8'));const subclasses=JSON.parse(await fs.readFile(`${ROOT}/subclasses.json`,'utf8'));const features=JSON.parse(await fs.readFile(`${ROOT}/class-features.json`,'utf8'));
const bard=classes.items.find(x=>x.name==='Bard');const lore=subclasses.items.find(x=>x.name==='College of Lore');
const classDoc=YAML.parse(await fs.readFile(path.join(foundryRoot,'bard.yml'),'utf8'));const subclassDoc=YAML.parse(await fs.readFile(path.join(foundryRoot,'college-of-lore.yml'),'utf8'));
async function docs(dir){const out=[];for(const ent of await fs.readdir(dir,{withFileTypes:true})){if(ent.name.startsWith('_'))continue;const p=path.join(dir,ent.name);if(ent.isDirectory())out.push(...await docs(p));else if(ent.name.endsWith('.yml'))out.push(YAML.parse(await fs.readFile(p,'utf8')));}return out;}
const fClass=await docs(path.join(foundryRoot,'class-features'));const fSub=await docs(path.join(foundryRoot,'subclass-features'));
const oClass=features.items.filter(x=>x.data?.category==='bard'&&x.data?.featureKind==='classFeature');const oSub=features.items.filter(x=>x.data?.category==='bard-lore'&&x.data?.featureKind==='subclassFeature');
const issues=[];const classified=[];const fail=m=>issues.push(m);
if(classDoc.name!=='Bard'||!bard)fail('Bard class mismatch');if(subclassDoc.name!=='College of Lore'||!lore)fail('Lore subclass mismatch');
if(bard?.data.hitDie!==8)fail('Bard hit die mismatch');if(JSON.stringify(bard?.data.savingThrowProficiencies)!==JSON.stringify(['dexterity','charisma']))fail('Bard saves mismatch');
for(const f of fClass){if(!f?.name)continue;if(f.name==='Ability Score Improvement'){classified.push({name:f.name,type:'representation',reason:'Foundry models ASI as Advancement; Oracle may expose a reusable feature grant.'});continue;}if(!oClass.some(x=>x.name===f.name))fail(`Foundry class feature missing in Oracle: ${f.name}`);}
for(const f of fSub){if(f?.name&&!oSub.some(x=>x.name===f.name))fail(`Foundry Lore feature missing in Oracle: ${f.name}`);}
const scales=(classDoc.system?.advancement??[]).filter(x=>x.type==='ScaleValue');
function findScale(title){return scales.find(x=>x.title===title)?.configuration?.scale??{};}
function valueAt(scale,level,kind='value'){let current;for(let l=1;l<=level;l++){const row=scale[String(l)];if(row){if(kind==='die')current=`d${row.faces}`;else current=row.value;}}return current;}
const insp=findScale('Inspiration Die'),can=findScale('Cantrips Known'),prep=findScale('Max Prepared Spells');
for(let level=1;level<=20;level++){const got=bard?.data.advancement?.[level-1]?.scaleValues??{};const exp=[valueAt(insp,level,'die'),valueAt(can,level),valueAt(prep,level)];const actual=[got.bardicInspirationDie,got.cantrips,got.preparedSpells];if(JSON.stringify(actual)!==JSON.stringify(exp))fail(`Foundry scale mismatch L${level}: ${JSON.stringify(actual)} != ${JSON.stringify(exp)}`);}
const words=(classDoc.system?.advancement??[]).find(x=>x.title==='Words of Creation'&&x.type==='ItemGrant');if(!words)fail('Foundry Words of Creation spell grant not observed');
classified.push({type:'representation',reason:'Foundry stores class progression as ItemGrant/Trait/ScaleValue advancements; Oracle uses canonical feature entities plus AdvancementStep and classMechanics.'});
const report={status:issues.length?'PARTIAL':'SUPPORTED',foundry:{classFeatureDocuments:fClass.length,subclassFeatureDocuments:fSub.length,scaleValues:scales.map(x=>x.title).filter(Boolean)},oracle:{classFeatureDefinitions:oClass.length,subclassFeatureDefinitions:oSub.length},classifiedDifferences:classified,issues};
await fs.writeFile(`${ROOT}/bard-foundry-comparison.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(issues.length)process.exit(1);
