import fs from 'node:fs/promises';

const RACES_URL = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/races.json';
const FEATS_URL = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/feats.json';
const OUT = 'packages/content/data/srd-5.2';
const ABILITIES = ['str','dex','con','int','wis','cha'];
const DAMAGE_TYPES = ['acid','bludgeoning','cold','fire','force','lightning','necrotic','piercing','poison','psychic','radiant','slashing','thunder'];
const CATEGORY = { O:'origin', G:'general', FS:'fightingStyle', EB:'epicBoon' };

const fetchJson = async url => { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };
const slug = s => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const featureId = name => `dnd2024:2024:feature:species-${slug(name)}:srd-5.2`;
const featId = name => `dnd2024:2024:feature:feat-${slug(name)}:srd-5.2`;
const speciesId = name => `dnd2024:2024:species:${slug(name)}:srd-5.2`;
const spellRef = name => ({ canonicalId:`dnd2024:2024:spell:${slug(String(name).split('|')[0])}:srd-5.2`, name:String(name).split('|')[0], entityType:'spell' });
const featureRef = name => ({ canonicalId:featureId(name), name, entityType:'feature' });

function rich(entry) {
  if (typeof entry === 'string') return entry;
  if (!entry || typeof entry !== 'object') return JSON.stringify(entry);
  if (entry.type === 'entries') return { type:'entries', ...(entry.name?{name:entry.name}:{}), entries:(entry.entries??[]).map(rich) };
  if (entry.type === 'list') return { type:'list', items:(entry.items??[]).map(x => typeof x === 'object' && x?.entry ? rich(x.entry) : rich(x)) };
  if (entry.type === 'table') return { type:'table', ...(entry.caption?{caption:entry.caption}:{}), columns:entry.colLabels??[], rows:entry.rows??[] };
  return JSON.stringify(entry);
}

function envelope(entityType, name, id, data, sourceKey) {
  return { id, canonicalId:id, entityType, name, system:{gameSystem:'dnd2024',rulesVersion:'2024'}, source:{sourceId:'srd-5.2',book:'XPHB',license:'CC-BY-4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/'}, provenance:{origin:'import',provider:'5etools',sourceKey,adapterVersion:'0.3.0',mapperVersion:'0.3.0'}, schemaVersion:1, data };
}

function parseSpellGroups(groups=[]) {
  return groups.map(g => {
    const selections=[];
    const add = (mode, levelKey, value, freeUses, recovery) => {
      const level = levelKey === '_' ? undefined : Number(levelKey);
      for (const item of Array.isArray(value)?value:[value]) {
        if (typeof item === 'string') selections.push({mode,...(level?{characterLevel:level}:{}),spell:spellRef(item),...(freeUses?{freeUses,recovery}: {})});
        else if (item?.choose) selections.push({mode,...(level?{characterLevel:level}:{}),query:item.choose,...(item.count?{count:item.count}:{}),...(freeUses?{freeUses,recovery}: {})});
      }
    };
    for (const [level,v] of Object.entries(g.known??{})) {
      if (Array.isArray(v)) add('known',level,v);
      else if (v && typeof v==='object') for (const vv of Object.values(v)) add('known',level,vv);
    }
    for (const [level,v] of Object.entries(g.prepared??{})) {
      if (Array.isArray(v)) add('prepared',level,v);
      else if (v && typeof v==='object') for (const vv of Object.values(v)) add('prepared',level,vv);
    }
    for (const [level,v] of Object.entries(g.innate??{})) {
      if (Array.isArray(v)) add('innate',level,v);
      else if (v && typeof v==='object') {
        for (const [period,obj] of Object.entries(v)) {
          if (period === 'daily' || period === 'rest') for (const [uses,vals] of Object.entries(obj??{})) add('innate',level,vals,uses==='pb'?'proficiencyBonus':Number(uses),period==='rest'?'shortRest':'longRest');
        }
      }
    }
    const ability = typeof g.ability === 'string' ? g.ability : g.ability?.choose ? {choice:g.ability.choose} : undefined;
    return { ...(g.name?{name:g.name}:{}), ...(ability?{ability}:{}), selections };
  }).filter(x=>x.selections.length);
}

function parseAbilityOptions(list=[]) {
  return list.map(x => {
    const c=x.choose; if(!c) return null;
    return { abilities:(c.from??[]).filter(a=>ABILITIES.includes(a)), ...(c.amount?{amount:c.amount}:{}), ...(c.count?{count:c.count}:{}), ...(x.max?{maximum:x.max}: {}) };
  }).filter(Boolean);
}

function parsePrereqs(list=[]) {
  return list.map(p => {
    const out={};
    if (p.level) out.minimumLevel=p.level;
    if (p.ability) out.abilities=Object.assign({},...p.ability);
    if (p.feature) out.requiredFeatures=p.feature;
    if (p.spellcasting2020) out.spellcasting=true;
    if (p.campaign) out.campaign=p.campaign;
    return out;
  });
}

function resistanceData(resist) {
  if (!Array.isArray(resist) || !resist.length) return {};
  if (resist.every(x=>typeof x==='string')) return {resistances:resist.filter(x=>DAMAGE_TYPES.includes(x))};
  const choose=resist.find(x=>x?.choose)?.choose;
  if (choose) return {resistanceChoice:{damageTypes:(choose.from??[]).filter(x=>DAMAGE_TYPES.includes(x)),count:choose.count??1}};
  return {};
}

function variantText(v) {
  const mods=v?._mod?.entries; if (!mods) return undefined;
  const arr=Array.isArray(mods)?mods:[mods]; const rules=[];
  for (const m of arr) if (m?.items) rules.push(rich(m.items));
  return rules.length?{rules}:undefined;
}

function parseVariants(sp) {
  const out=[];
  for (const v of sp._versions??[]) {
    if (v._abstract && Array.isArray(v._implementations)) {
      for (const impl of v._implementations) {
        const vars=impl._variables??{}; const name=(v._abstract.name??sp.name).replace('{{color}}',vars.color??'Variant');
        out.push({ id:slug(name), name, ...resistanceData(impl.resist), parameters:vars, featureParameters:[{feature:featureRef('Breath Weapon'),values:{damageType:String(vars.damageType??'')}}], ...(variantText(v._abstract)?{text:variantText(v._abstract)}:{}) });
      }
    } else {
      out.push({ id:slug(v.name??'variant'), name:v.name??'Variant', ...(typeof v.speed==='number'?{speed:v.speed}:{}), ...(typeof v.darkvision==='number'?{darkvision:v.darkvision}:{}), ...resistanceData(v.resist), ...(v.additionalSpells?{spellGrants:parseSpellGroups(v.additionalSpells)}:{}), ...(variantText(v)?{text:variantText(v)}:{}) });
    }
  }
  return out;
}

const [racesData,featsData]=await Promise.all([fetchJson(RACES_URL),fetchJson(FEATS_URL)]);
const speciesSrc=(racesData.race??[]).filter(x=>x.srd52===true);
const featsSrc=(featsData.feat??[]).filter(x=>x.srd52===true);
const speciesFeatureMap=new Map();
for (const sp of speciesSrc) for (const e of sp.entries??[]) if (e && typeof e==='object' && e.name) {
  const key=e.name;
  if (!speciesFeatureMap.has(key)) speciesFeatureMap.set(key,envelope('feature',key,featureId(key),{featureKind:'speciesFeature',category:'species',text:{rules:[rich(e)]}},`XPHB:speciesFeature:${key}`));
}
const speciesFeatures=[...speciesFeatureMap.values()].sort((a,b)=>a.name.localeCompare(b.name));

const species=speciesSrc.map(sp => {
  const choices=[];
  if ((sp.size??[]).length>1) choices.push({id:'size',choice:{kind:'enum',count:1,options:sp.size}});
  const skills=sp.skillProficiencies?.[0];
  if (skills?.choose?.from) choices.push({id:'skill-proficiency',choice:{kind:'enum',count:skills.choose.count??1,options:skills.choose.from}});
  else if (skills?.any) choices.push({id:'skill-proficiency',choice:{kind:'tagQuery',count:skills.any,query:{all:[{field:'category',operator:'eq',value:'skill'}]}}});
  if (sp.feats?.[0]?.anyFromCategory) choices.push({id:'origin-feat',choice:{kind:'entity',count:sp.feats[0].anyFromCategory.count??1,entityTypes:['feature'],query:{all:[{field:'featCategory',operator:'eq',value:'origin'}]}}});
  const data={ size:sp.size??['M'], speed:typeof sp.speed==='number'?sp.speed:30, creatureType:(sp.creatureTypes??['humanoid'])[0], ...(typeof sp.darkvision==='number'?{darkvision:sp.darkvision}:{}), ...resistanceData(sp.resist), features:(sp.entries??[]).filter(e=>e&&typeof e==='object'&&e.name).map(e=>featureRef(e.name)), ...(sp.additionalSpells?{spellGrants:parseSpellGroups(sp.additionalSpells)}:{}), ...(choices.length?{choices}:{}), ...((sp._versions??[]).length?{variants:parseVariants(sp)}:{}), text:{rules:[rich(sp.sizeEntry),...(sp.entries??[]).map(rich)].filter(Boolean)} };
  return envelope('species',sp.name,speciesId(sp.name),data,`XPHB:species:${sp.name}`);
}).sort((a,b)=>a.name.localeCompare(b.name));

const feats=featsSrc.map(f => {
  const prereqs=parsePrereqs(f.prerequisite);
  const prof=[];
  for (const block of f.skillToolLanguageProficiencies??[]) for (const c of block.choose??[]) prof.push({kind:'enum',count:c.count??1,options:c.from??[]});
  const grants=[];
  for (const s of f.senses??[]) for (const [type,range] of Object.entries(s)) grants.push({type:'sense',value:{type,range}});
  const data={ featureKind:'feat', category:CATEGORY[f.category]??'other', featCategory:CATEGORY[f.category]??'other', ...(f.repeatable?{repeatable:true}:{}), ...(prereqs.length?{prerequisiteMode:prereqs.length>1?'any':'all',prerequisites:prereqs}:{}), ...(f.ability?{abilityScoreOptions:parseAbilityOptions(f.ability)}:{}), ...(f.additionalSpells?{spellGrants:parseSpellGroups(f.additionalSpells)}:{}), ...(prof.length?{proficiencyChoices:prof}:{}), ...(grants.length?{grants}:{}), text:{rules:(f.entries??[]).map(rich)} };
  return envelope('feature',f.name,featId(f.name),data,`XPHB:feat:${f.name}`);
}).sort((a,b)=>a.name.localeCompare(b.name));

const comp=(entityType,items)=>({format:'oraclerpg-compendium',version:1,contentSource:'srd-5.2',entityType,count:items.length,items});
await fs.mkdir(OUT,{recursive:true});
await fs.writeFile(`${OUT}/species.json`,JSON.stringify(comp('species',species),null,2));
await fs.writeFile(`${OUT}/species-features.json`,JSON.stringify(comp('feature',speciesFeatures),null,2));
await fs.writeFile(`${OUT}/feats.json`,JSON.stringify(comp('feature',feats),null,2));
const audit={generatedAt:new Date().toISOString(),speciesCount:species.length,speciesFeatureCount:speciesFeatures.length,featCount:feats.length,featCategories:Object.fromEntries(Object.entries(CATEGORY).map(([k,v])=>[v,feats.filter(x=>x.data.featCategory===v).length])),speciesWithVariants:species.filter(x=>x.data.variants?.length).map(x=>({name:x.name,count:x.data.variants.length})),allSpeciesHaveFeatures:species.every(x=>x.data.features?.length),allFeatsCategorized:feats.every(x=>x.data.featCategory&&x.data.featCategory!=='other'),sourceFieldsCovered:{species:['size','speed','creatureTypes','darkvision','resist','skillProficiencies','additionalSpells','feats','entries','_versions'],feats:['category','prerequisite','repeatable','ability','senses','additionalSpells','skillToolLanguageProficiencies','entries']}};
await fs.writeFile(`${OUT}/species-feats-coverage-audit.json`,JSON.stringify(audit,null,2));
console.log(JSON.stringify(audit,null,2));
