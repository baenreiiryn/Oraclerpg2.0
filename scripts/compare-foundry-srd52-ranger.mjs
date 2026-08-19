import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';

const ROOT='packages/content/data/srd-5.2';
const foundry=process.argv[2];
if(!foundry) throw new Error('Usage: node compare-foundry-srd52-ranger.mjs <foundry ranger dir>');
const read=async f=>JSON.parse(await fs.readFile(`${ROOT}/${f}`,'utf8'));
const [classes,subs,features]=await Promise.all(['classes.json','subclasses.json','class-features.json'].map(read));
const issues=[];
const req=(ok,msg)=>{if(!ok) issues.push(msg)};
const advancements=v=>Array.isArray(v)?v:Object.values(v??{});

const ranger=classes.items.find(x=>x.name==='Ranger');
const hunter=subs.items.find(x=>x.name==='Hunter'&&x.data?.parentClass?.name==='Ranger');
req(!!ranger&&!!hunter,'Oracle Ranger/Hunter missing');

const classYaml=YAML.parse(await fs.readFile(path.join(foundry,'ranger.yml'),'utf8'));
const hunterYaml=YAML.parse(await fs.readFile(path.join(foundry,'hunter.yml'),'utf8'));
req(classYaml?.name==='Ranger','Foundry Ranger class missing');
req(hunterYaml?.name==='Hunter'&&hunterYaml?.system?.classIdentifier==='ranger','Foundry Hunter subclass missing');
req(classYaml?.system?.hd?.denomination==='d10','Ranger Hit Die mismatch');
req(JSON.stringify(classYaml?.system?.primaryAbility?.value)==='["dex","wis"]','Ranger primary abilities mismatch');

const loadDocs=async dir=>{
 const out=[];
 for(const file of (await fs.readdir(dir)).filter(x=>x.endsWith('.yml')&&x!=='_folder.yml')) out.push(YAML.parse(await fs.readFile(path.join(dir,file),'utf8')));
 return out;
};
const docs=await loadDocs(path.join(foundry,'class-features'));
const sdocs=await loadDocs(path.join(foundry,'subclass-features','hunter'));
const rangerNames=new Set(features.items.filter(x=>x.data?.category==='ranger').map(x=>x.name));
const hunterNames=new Set(features.items.filter(x=>x.data?.category==='ranger-hunter').map(x=>x.name));
const aliases=new Map([['Druidic Warrior','Fighting Style']]);
for(const d of docs){
 const n=aliases.get(d.name)??d.name;
 if(n==='Ability Score Improvement') continue;
 req(rangerNames.has(n),`Foundry Ranger feature not represented: ${d.name}`);
}
for(const d of sdocs) req(hunterNames.has(d.name),`Foundry Hunter feature not represented: ${d.name}`);

const os=l=>ranger?.data?.advancement?.find(x=>x.level===l)?.scaleValues??{};
const scales=advancements(classYaml?.system?.advancement).filter(x=>x.type==='ScaleValue');
const byTitle=new Map(scales.map(x=>[x.title,x.configuration?.scale??{}]));
const favored=byTitle.get('Favored Enemy')??{};
for(const [l,v] of [[1,2],[5,3],[9,4],[13,5],[17,6]]) req(favored[String(l)]?.value===v&&os(l).favoredEnemyUses===v,`Favored Enemy mismatch at level ${l}`);
const prep=byTitle.get('Max Prepared Spells')??{};
for(const [level,row] of Object.entries(prep)) if(row?.value!==undefined) req(os(Number(level)).preparedSpells===row.value,`Prepared Spells mismatch at level ${level}`);
const mastery=byTitle.get('Weapon Masteries Known')??{};
for(const [level,row] of Object.entries(mastery)) if(row?.value!==undefined) req(os(Number(level)).weaponMasteries===row.value||os(Number(level)).weaponMasteriesKnown===row.value,`Weapon Masteries mismatch at level ${level}`);

const get=n=>features.items.find(x=>x.data?.category==='ranger'&&x.name===n);
const hget=n=>features.items.find(x=>x.data?.category==='ranger-hunter'&&x.name===n);
const deft=get('Deft Explorer');
req(get('Favored Enemy')?.data?.spellGrants?.some(g=>g.selections?.some(s=>s.spell?.name==="Hunter's Mark")),'Oracle Favored Enemy does not grant Hunter’s Mark');
req(get('Spellcasting')?.data?.classMechanics?.spellCollections?.length,'Oracle Ranger Spellcasting is not structurally represented');
req(get('Weapon Mastery')?.data?.classRules?.entityCollections?.length,'Oracle Ranger Weapon Mastery is not structurally represented');
req(deft?.data?.grants?.some(g=>g.type==='proficiency'&&g.value?.kind==='expertise'&&g.value?.choice?.count===1),'Oracle Deft Explorer expertise missing');
req(deft?.data?.grants?.some(g=>g.type==='language'&&g.value?.choice?.count===2),'Oracle Deft Explorer language choice missing');
req(get('Roving')?.data?.properties?.includes('swim-speed-equals-speed')&&get('Roving')?.data?.properties?.includes('climb-speed-equals-speed'),'Oracle Roving movement modes missing');
req(get('Tireless')?.data?.activities?.length,'Oracle Tireless activity missing');
req(get('Relentless Hunter')?.data?.modifiers?.some(x=>x.target?.domain==='concentration'),'Oracle Relentless Hunter concentration support missing');
req(get("Nature's Veil")?.data?.activities?.length,'Oracle Nature’s Veil activity missing');
req(get('Precise Hunter')?.data?.modifiers?.some(x=>x.mode==='advantage'),'Oracle Precise Hunter advantage missing');
req(get('Feral Senses')?.data?.properties?.includes('blindsight:30-ft'),'Oracle Feral Senses missing 30-ft Blindsight');
req(get('Foe Slayer')?.data?.properties?.includes('hunters-mark-damage-die:d10'),'Oracle Foe Slayer Hunter’s Mark die upgrade missing');
req(hget("Hunter's Prey")?.data?.classRules?.entityCollections?.length,'Oracle Hunter’s Prey choice/replace structure missing');
req(hget('Defensive Tactics')?.data?.classRules?.entityCollections?.length,'Oracle Defensive Tactics choice/replace structure missing');
req(!!hget("Hunter's Lore")&&!!hget("Superior Hunter's Prey")&&!!hget("Superior Hunter's Defense"),'Oracle Hunter progression features missing');

const markDamage=byTitle.get("Hunter's Mark Damage")??{};
if(Object.keys(markDamage).length){
 req(get('Favored Enemy')?.data?.spellGrants?.some(g=>g.selections?.some(s=>s.spell?.name==="Hunter's Mark")),'Foundry Hunter’s Mark Damage scale has no Oracle Hunter’s Mark source');
 req(get('Foe Slayer')?.data?.properties?.includes('hunters-mark-damage-die:d10'),'Foundry Hunter’s Mark Damage capstone is not represented by Oracle Foe Slayer');
}

const foundrySubclassLevels=advancements(hunterYaml?.system?.advancement).filter(x=>x.type==='ItemGrant').map(x=>x.level).sort((a,b)=>a-b);
req(JSON.stringify(foundrySubclassLevels)==='[3,7,11,15]','Foundry Hunter advancement levels differ');
const oracleSubclassLevels=(hunter?.data?.advancement??[]).filter(x=>x.grants?.length).map(x=>x.level).sort((a,b)=>a-b);
req(JSON.stringify(oracleSubclassLevels)==='[3,7,11,15]','Oracle Hunter advancement levels differ');

const report={
 status:issues.length?'UNSUPPORTED':'SUPPORTED',
 issues,
 foundry:{classFeatureDocs:docs.length,subclassFeatureDocs:sdocs.length,scaleValues:[...byTitle.keys()],hunterLevels:foundrySubclassLevels},
 oracle:{classFeatures:rangerNames.size,subclassFeatures:hunterNames.size,hunterLevels:oracleSubclassLevels},
 classifiedDifferences:[
  {type:'provider-implementation',detail:'Foundry stores Druidic Warrior as a separate auxiliary feature; Oracle models it as the alternative option inside Fighting Style.'},
  {type:'provider-implementation',detail:'Foundry represents Deft Explorer and Expertise choices additionally through Trait advancements; Oracle stores the same choices inside structured proficiency grants.'},
  {type:'provider-implementation',detail:"Foundry exposes Hunter's Mark Damage as a ScaleValue; Oracle keeps the baseline on Hunter's Mark/Favored Enemy and applies the d10 capstone through Foe Slayer."}
 ]
};
await fs.writeFile(`${ROOT}/ranger-foundry-comparison.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(issues.length) process.exit(1);
