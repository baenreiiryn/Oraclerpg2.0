import fs from 'node:fs/promises';

const ROOT='packages/content/data/srd-5.2';
const read=async f=>JSON.parse(await fs.readFile(`${ROOT}/${f}`,'utf8'));
const exists=async f=>{try{await fs.access(`${ROOT}/${f}`);return true}catch{return false}};

const [classes,subclasses,features,items,spells]=await Promise.all([
  read('classes.json'),read('subclasses.json'),read('class-features.json'),read('items.json'),read('spells.json')
]);
const issues=[];
const req=(ok,msg)=>{if(!ok)issues.push(msg)};

const expected={
  Barbarian:'Path of the Berserker',
  Bard:'College of Lore',
  Cleric:'Life Domain',
  Druid:'Circle of the Land',
  Fighter:'Champion',
  Monk:'Warrior of the Open Hand',
  Paladin:'Oath of Devotion',
  Ranger:'Hunter',
  Rogue:'Thief',
  Sorcerer:'Draconic Sorcery',
  Warlock:'Fiend Patron',
  Wizard:'Evoker'
};

req(classes.count===classes.items.length,`classes.count mismatch ${classes.count}/${classes.items.length}`);
req(subclasses.count===subclasses.items.length,`subclasses.count mismatch ${subclasses.count}/${subclasses.items.length}`);
req(features.count===features.items.length,`class-features.count mismatch ${features.count}/${features.items.length}`);
req(classes.items.length===12,`Expected 12 SRD classes, got ${classes.items.length}`);
req(subclasses.items.length===12,`Expected 12 SRD subclasses, got ${subclasses.items.length}`);

const all=[...classes.items,...subclasses.items,...features.items];
const ids=new Map();
for(const e of all){
  const id=e.canonicalId??e.id;
  req(!!id,`${e.entityType??'entity'} ${e.name??'(unnamed)'} missing canonical ID`);
  if(id){if(ids.has(id))issues.push(`Duplicate canonical ID ${id}: ${ids.get(id)} / ${e.name}`);else ids.set(id,e.name)}
  req(e.system?.gameSystem==='dnd2024',`${e.name}: gameSystem must be dnd2024`);
  req(e.system?.rulesVersion==='2024',`${e.name}: rulesVersion must be 2024`);
  req(e.source?.sourceId==='srd-5.2',`${e.name}: sourceId must be srd-5.2`);
  req(e.source?.license==='CC-BY-4.0',`${e.name}: license must be CC-BY-4.0`);
}

const featureIds=new Set(features.items.map(x=>x.canonicalId??x.id));
const itemIds=new Set(items.items.map(x=>x.canonicalId??x.id));
const spellIds=new Set(spells.items.map(x=>x.canonicalId??x.id));

function walk(value,owner,path='data'){
  if(!value||typeof value!=='object')return;
  if(Array.isArray(value)){value.forEach((v,i)=>walk(v,owner,`${path}[${i}]`));return}
  if(value.entityType&&value.canonicalId){
    if(value.entityType==='feature')req(featureIds.has(value.canonicalId),`${owner}: missing referenced feature ${value.canonicalId} at ${path}`);
    if(value.entityType==='item'&&itemIds.size)req(itemIds.has(value.canonicalId),`${owner}: missing referenced item ${value.name??value.canonicalId} at ${path}`);
    if(value.entityType==='spell'&&spellIds.size)req(spellIds.has(value.canonicalId),`${owner}: missing referenced spell ${value.name??value.canonicalId} at ${path}`);
  }
  for(const [k,v] of Object.entries(value))walk(v,owner,`${path}.${k}`);
}

for(const [className,subName] of Object.entries(expected)){
  const c=classes.items.find(x=>x.name===className);
  req(!!c,`Missing class ${className}`);
  if(!c)continue;
  req(c.data?.advancement?.length===20,`${className}: advancement must contain 20 levels`);
  const levels=(c.data?.advancement??[]).map(x=>x.level);
  req(JSON.stringify(levels)===JSON.stringify(Array.from({length:20},(_,i)=>i+1)),`${className}: advancement levels must be exactly 1..20`);
  req(!!c.data?.hitDie,`${className}: hitDie missing`);
  req((c.data?.primaryAbilities??[]).length>0,`${className}: primaryAbilities missing`);
  req((c.data?.savingThrowProficiencies??[]).length===2,`${className}: expected 2 saving throw proficiencies`);
  req((c.data?.equipmentBundles??[]).length>0,`${className}: starting equipment bundles missing`);
  walk(c.data,className);

  const s=subclasses.items.find(x=>x.name===subName&&x.data?.parentClass?.name===className);
  req(!!s,`Missing subclass ${subName} for ${className}`);
  if(s){
    req(s.data?.parentClass?.canonicalId===(c.canonicalId??c.id),`${subName}: parentClass canonicalId mismatch`);
    req((s.data?.advancement??[]).length>0,`${subName}: advancement missing`);
    walk(s.data,subName);
  }
}

for(const f of features.items){
  req(!!f.data?.featureKind,`${f.name}: featureKind missing`);
  req(!!f.data?.category,`${f.name}: category missing`);
  const hasRules=Array.isArray(f.data?.text?.rules)&&f.data.text.rules.length>0;
  const hasMechanics=Object.keys(f.data??{}).some(k=>!['featureKind','category','text','sourcePayload','properties'].includes(k));
  req(hasRules||hasMechanics,`${f.name}: feature has neither source rules nor structured mechanics`);
  walk(f.data,f.name);
}

const slugs={Barbarian:'barbarian',Bard:'bard',Cleric:'cleric',Druid:'druid',Fighter:'fighter',Monk:'monk',Paladin:'paladin',Ranger:'ranger',Rogue:'rogue',Sorcerer:'sorcerer',Warlock:'warlock',Wizard:'wizard'};
const reports=[];
for(const [name,slug] of Object.entries(slugs)){
  for(const suffix of ['coverage-audit','5etools-comparison']){
    const file=`${slug}-${suffix}.json`;
    if(await exists(file)){
      const r=await read(file);reports.push(file);
      req(r.status==='SUPPORTED',`${file}: status ${r.status}`);
      req(!(r.issues?.length),`${file}: ${JSON.stringify(r.issues)}`);
    } else issues.push(`Missing final validation report ${file}`);
  }
}

const report={
  status:issues.length?'UNSUPPORTED':'SUPPORTED',issues,
  totals:{classes:classes.items.length,subclasses:subclasses.items.length,classFeatures:features.items.length,items:items.items.length,spells:spells.items.length},
  validatedClasses:Object.keys(expected),validatedSubclasses:Object.values(expected),validationReports:reports.length
};
await fs.writeFile(`${ROOT}/compendium-final-audit.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(issues.length)process.exit(1);
