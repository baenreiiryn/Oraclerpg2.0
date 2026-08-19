import fs from 'node:fs/promises';
const ROOT='packages/content/data/srd-5.2';
const URL='https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/class/class-paladin.json';
const LIC='https://creativecommons.org/licenses/by/4.0/';
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const spellRef=name=>({entityType:'spell',name,canonicalId:`dnd2024:2024:spell:${slug(name)}:srd-5.2`});
const source=await (await fetch(URL)).json();
const oathSpells=(source.subclassFeature??[]).find(x=>x.name==='Oath of Devotion Spells'&&x.className==='Paladin'&&x.classSource==='XPHB'&&x.subclassShortName==='Devotion'&&x.subclassSource==='XPHB'&&x.srd52);
if(!oathSpells)throw new Error('Oath of Devotion Spells source feature missing');
const read=async f=>JSON.parse(await fs.readFile(`${ROOT}/${f}`,'utf8'));
const [classes,subs,features]=await Promise.all(['classes.json','subclasses.json','class-features.json'].map(read));
const id='dnd2024:2024:feature:paladin:devotion:oath-of-devotion-spells:srd-5.2';
if(!features.items.some(x=>x.canonicalId===id)){
  features.items.push({id,canonicalId:id,entityType:'feature',name:'Oath of Devotion Spells',system:{gameSystem:'dnd2024',rulesVersion:'2024'},source:{sourceId:'srd-5.2',book:'XPHB',license:'CC-BY-4.0',licenseUrl:LIC},provenance:{origin:'import',provider:'5etools',sourceKey:'XPHB:subclassFeature:Paladin:Devotion:Oath of Devotion Spells:3',adapterVersion:'0.9.1',mapperVersion:'0.9.1'},schemaVersion:1,data:{featureKind:'subclassFeature',category:'paladin-devotion',spellGrants:[{name:'Oath of Devotion Spells',ability:'charisma',selections:[{mode:'prepared',characterLevel:3,spell:spellRef('Protection from Evil and Good')},{mode:'prepared',characterLevel:3,spell:spellRef('Shield of Faith')},{mode:'prepared',characterLevel:5,spell:spellRef('Aid')},{mode:'prepared',characterLevel:5,spell:spellRef('Zone of Truth')},{mode:'prepared',characterLevel:9,spell:spellRef('Beacon of Hope')},{mode:'prepared',characterLevel:9,spell:spellRef('Dispel Magic')},{mode:'prepared',characterLevel:13,spell:spellRef('Freedom of Movement')},{mode:'prepared',characterLevel:13,spell:spellRef('Guardian of Faith')},{mode:'prepared',characterLevel:17,spell:spellRef('Commune')},{mode:'prepared',characterLevel:17,spell:spellRef('Flame Strike')}]}],text:{rules:oathSpells.entries??[]}}});
}
features.items.sort((a,b)=>a.name.localeCompare(b.name));features.count=features.items.length;
const devotion=subs.items.find(x=>x.name==='Oath of Devotion'&&x.data?.parentClass?.name==='Paladin');const l3=devotion?.data?.advancement?.find(x=>x.level===3);if(l3&&!l3.grants?.some(x=>x.entity?.canonicalId===id)){l3.grants=[...(l3.grants??[]),{type:'entity',entity:{entityType:'feature',name:'Oath of Devotion Spells',canonicalId:id}}];}
const paladin=classes.items.find(x=>x.name==='Paladin');const bundle=paladin?.data?.equipmentBundles?.find(x=>x.id==='A');if(bundle){bundle.grants=(bundle.grants??[]).map(g=>g.entity?.name==='Holy Symbol'?{equipmentCategory:'holySymbol'}:g);}
await fs.writeFile(`${ROOT}/classes.json`,JSON.stringify(classes,null,2)+'\n');await fs.writeFile(`${ROOT}/subclasses.json`,JSON.stringify(subs,null,2)+'\n');await fs.writeFile(`${ROOT}/class-features.json`,JSON.stringify(features,null,2)+'\n');
console.log(JSON.stringify({normalized:true,oathSpells:true,holySymbolCategory:true},null,2));
