(()=>{
'use strict';

const list=document.getElementById('list');
const categories=document.getElementById('categories');
const search=document.getElementById('search');
const count=document.getElementById('count');
if(!list||!categories||!search)return;

const locale=document.documentElement.lang==='en'?'en':'pt-BR';
const pt=locale==='pt-BR';
const homebrewKey='oraclerpg.homebrew.v1';
const base=`/compendium/srd/${locale}`;

const groupedCategories=new Set(['class-features','items','feats','monsters','species-features','spells']);
const directCardCategories=new Set(['species','monster-features']);
const cardCategories=new Set([...groupedCategories,...directCardCategories]);

const copy=pt?{
  sections:'Seções',chooseSection:'Escolha uma seção para organizar o conteúdo.',
  back:'Voltar para seções',featured:'Carta em destaque',of:'de',flip:'Toque na carta para virar',
  previous:'Carta anterior',next:'Próxima carta',expand:'Abrir detalhes',noImage:'Sem imagem',
  description:'Descrição',details:'Detalhes',level:'Nível',uses:'Usos',recovery:'Recuperação',
  rarity:'Raridade',type:'Tipo',attunement:'Sintonia',damage:'Dano',armor:'Armadura',weight:'Peso',cost:'Custo',
  school:'Escola',casting:'Conjuração',range:'Alcance',duration:'Duração',circle:'Círculo',
  size:'Tamanho',speed:'Deslocamento',cr:'ND',ac:'CA',hp:'PV',repeatable:'Repetível',prerequisite:'Pré-requisito',
  empty:'Nenhum conteúdo encontrado nesta seção.',entries:'entradas',entry:'entrada',source:'Fonte',yes:'Sim',no:'Não',
  cards:'Cartas',list:'Lista',
  titles:{
    'class-features':'Características por classe',items:'Itens por categoria',feats:'Talentos por categoria',
    monsters:'Criaturas por tipo','species-features':'Características por espécie',spells:'Magias por círculo',
    subclasses:'Subclasses por classe',species:'Espécies','monster-features':'Características de criatura'
  },
  groups:{
    barbarian:'Características de Bárbaro',bard:'Características de Bardo',cleric:'Características de Clérigo',
    druid:'Características de Druida',fighter:'Características de Guerreiro',monk:'Características de Monge',
    paladin:'Características de Paladino',ranger:'Características de Patrulheiro',rogue:'Características de Ladino',
    sorcerer:'Características de Feiticeiro',warlock:'Características de Bruxo',wizard:'Características de Mago',
    weapons:'Armas',armor:'Armaduras e Escudos',magic:'Itens Mágicos',gear:'Equipamento de Aventureiro',
    tools:'Ferramentas',ammo:'Munição',packs:'Recipientes e Pacotes',vehicles:'Montarias e Veículos',poisons:'Venenos',
    origin:'Talentos de Origem',general:'Talentos Gerais','fighting-style':'Talentos de Estilo de Luta','epic-boon':'Dádivas Épicas',
    aberration:'Aberrações',beast:'Bestas',celestial:'Celestiais',construct:'Constructos',dragon:'Dragões',elemental:'Elementais',
    fey:'Fadas',fiend:'Ínferos',giant:'Gigantes',humanoid:'Humanoides',monstrosity:'Monstruosidades',ooze:'Gosmas',plant:'Plantas',undead:'Mortos-vivos',
    other:'Outros'
  },
  classes:{barbarian:'Bárbaro',bard:'Bardo',cleric:'Clérigo',druid:'Druida',fighter:'Guerreiro',monk:'Monge',paladin:'Paladino',ranger:'Patrulheiro',rogue:'Ladino',sorcerer:'Feiticeiro',warlock:'Bruxo',wizard:'Mago'}
}:{
  sections:'Sections',chooseSection:'Choose a section to organize the content.',
  back:'Back to sections',featured:'Featured card',of:'of',flip:'Tap the card to flip',
  previous:'Previous card',next:'Next card',expand:'Open details',noImage:'No image',
  description:'Description',details:'Details',level:'Level',uses:'Uses',recovery:'Recovery',
  rarity:'Rarity',type:'Type',attunement:'Attunement',damage:'Damage',armor:'Armor',weight:'Weight',cost:'Cost',
  school:'School',casting:'Casting',range:'Range',duration:'Duration',circle:'Circle',
  size:'Size',speed:'Speed',cr:'CR',ac:'AC',hp:'HP',repeatable:'Repeatable',prerequisite:'Prerequisite',
  empty:'No content found in this section.',entries:'entries',entry:'entry',source:'Source',yes:'Yes',no:'No',
  cards:'Cards',list:'List',
  titles:{
    'class-features':'Features by class',items:'Items by category',feats:'Feats by category',monsters:'Creatures by type',
    'species-features':'Features by species',spells:'Spells by circle',subclasses:'Subclasses by class',species:'Species','monster-features':'Creature Features'
  },
  groups:{
    barbarian:'Barbarian Features',bard:'Bard Features',cleric:'Cleric Features',druid:'Druid Features',fighter:'Fighter Features',
    monk:'Monk Features',paladin:'Paladin Features',ranger:'Ranger Features',rogue:'Rogue Features',sorcerer:'Sorcerer Features',
    warlock:'Warlock Features',wizard:'Wizard Features',weapons:'Weapons',armor:'Armor & Shields',magic:'Magic Items',
    gear:'Adventuring Gear',tools:'Tools',ammo:'Ammunition',packs:'Containers & Packs',vehicles:'Mounts & Vehicles',poisons:'Poisons',
    origin:'Origin Feats',general:'General Feats','fighting-style':'Fighting Style Feats','epic-boon':'Epic Boons',
    aberration:'Aberrations',beast:'Beasts',celestial:'Celestials',construct:'Constructs',dragon:'Dragons',elemental:'Elementals',
    fey:'Fey',fiend:'Fiends',giant:'Giants',humanoid:'Humanoids',monstrosity:'Monstrosities',ooze:'Oozes',plant:'Plants',undead:'Undead',other:'Other'
  },
  classes:{barbarian:'Barbarian',bard:'Bard',cleric:'Cleric',druid:'Druid',fighter:'Fighter',monk:'Monk',paladin:'Paladin',ranger:'Ranger',rogue:'Rogue',sorcerer:'Sorcerer',warlock:'Warlock',wizard:'Wizard'}
};

const orders={
  'class-features':['barbarian','bard','cleric','druid','fighter','monk','paladin','ranger','rogue','sorcerer','warlock','wizard','other'],
  items:['weapons','armor','magic','gear','tools','ammo','packs','vehicles','poisons','other'],
  feats:['origin','general','fighting-style','epic-boon','other'],
  monsters:['aberration','beast','celestial','construct','dragon','elemental','fey','fiend','giant','humanoid','monstrosity','ooze','plant','undead','other'],
  spells:['circle:0','circle:1','circle:2','circle:3','circle:4','circle:5','circle:6','circle:7','circle:8','circle:9','other']
};
const categoryGlyphs={'class-features':'CF',items:'IT',feats:'FT',monsters:'CR','species-features':'SF',spells:'MG',species:'SP','monster-features':'MF'};
const itemGlyphs={weapons:'⚔',armor:'◈',magic:'✦',gear:'◇',tools:'⌁',ammo:'➶',packs:'▣',vehicles:'♞',poisons:'☠',other:'•'};
const creatureGlyphs={aberration:'AB',beast:'BS',celestial:'CE',construct:'CO',dragon:'DR',elemental:'EL',fey:'FE',fiend:'FI',giant:'GI',humanoid:'HU',monstrosity:'MO',ooze:'OO',plant:'PL',undead:'UN',other:'CR'};
const classGlyphs={barbarian:'BR',bard:'BD',cleric:'CL',druid:'DR',fighter:'GR',monk:'MN',paladin:'PL',ranger:'PT',rogue:'LD',sorcerer:'FT',warlock:'BX',wizard:'MG',other:'CF'};
const featGlyphs={origin:'OR',general:'GE','fighting-style':'EL','epic-boon':'EP',other:'FT'};

const browser=document.createElement('section');
browser.id='compendiumSectionBrowser';
browser.className='compendium-section-browser';
browser.hidden=true;
browser.innerHTML=`
  <div id="sectionLanding" class="section-landing"></div>
  <div id="sectionDetail" class="section-detail" hidden>
    <button type="button" id="sectionBack" class="section-back">‹ <span>${copy.back}</span></button>
    <header class="section-detail-head">
      <p class="section-eyebrow">${copy.featured}</p>
      <h2 id="sectionTitle"></h2>
      <p id="sectionSub"></p>
    </header>
    <div id="sectionCardStage" class="section-card-stage"></div>
    <div id="sectionCardControls" class="section-card-controls">
      <button type="button" id="sectionPrev" class="section-card-nav" aria-label="${copy.previous}">‹</button>
      <div id="sectionDots" class="section-card-dots" aria-hidden="true"></div>
      <button type="button" id="sectionNext" class="section-card-nav" aria-label="${copy.next}">›</button>
    </div>
    <div class="section-list-head"><span id="sectionListCount"></span></div>
    <div id="sectionList" class="section-entry-list"></div>
  </div>`;
list.before(browser);

const landing=browser.querySelector('#sectionLanding');
const detail=browser.querySelector('#sectionDetail');
const back=browser.querySelector('#sectionBack');
const detailEyebrow=browser.querySelector('.section-detail-head .section-eyebrow');
const sectionTitle=browser.querySelector('#sectionTitle');
const sectionSub=browser.querySelector('#sectionSub');
const stage=browser.querySelector('#sectionCardStage');
const controls=browser.querySelector('#sectionCardControls');
const dots=browser.querySelector('#sectionDots');
const prev=browser.querySelector('#sectionPrev');
const next=browser.querySelector('#sectionNext');
const sectionList=browser.querySelector('#sectionList');
const sectionListCount=browser.querySelector('#sectionListCount');

const state={category:'',mode:'',group:'',records:[],available:[],index:0,flipped:false,version:0,cache:new Map(),pointerStart:null,dynamicLabels:new Map(),dynamicGlyphs:new Map(),dynamicOrder:[],speciesFeatureGroups:new Map(),srdSpeciesFeatureGroups:new Map()};

function esc(text=''){return String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function arr(value){return Array.isArray(value)?value:(value==null?[]:[value])}
function path(obj,...paths){for(const p of paths){let value=obj;for(const key of p.split('.')){if(value==null)break;value=value[key]}if(value!==undefined&&value!==null&&value!=='')return value}return undefined}
function recordId(record){return String(record?.canonicalId||record?.id||record?.entity?.canonicalId||record?.entity?.id||'')}
function recordName(record){return record?.name||record?.entity?.name||recordId(record)||copy.groups.other}
function dataOf(record){return record?.entity?.data||record?.data||{}}
function entityOf(record){return record?.entity||record||{}}
function activeCategory(){return categories.querySelector('.category.active[data-category]')?.dataset.category||''}
function activeMode(){return document.querySelector('.tab.active[data-mode]')?.dataset.mode||'srd'}
function titleCase(value=''){return String(value).replace(/[-_]/g,' ').replace(/\b\w/g,m=>m.toUpperCase())}
function slug(value=''){return normalized(value).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'other'}
function normalized(value){return String(value??'').trim().toLowerCase()}
function hasAny(data,keys){return keys.some(key=>path(data,key)!==undefined)}
function boolText(value){return value?copy.yes:copy.no}
function plain(text=''){
  return String(text)
    .replace(/\{@(?:damage|dice|hit|dc|chance) ([^}|]+)(?:\|[^}]*)?\}/gi,'$1')
    .replace(/\{@[^ }]+ ([^|}]+)(?:\|[^}]*)?\}/g,'$1')
    .replace(/&Reference\[([^\] ]+)[^\]]*\]/g,'$1')
    .replace(/\[\[[^\]]+\]\]/g,'')
    .replace(/<[^>]+>/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}
function formatValue(value){
  if(value==null||value==='')return '';
  if(typeof value==='boolean')return boolText(value);
  if(typeof value==='string'||typeof value==='number')return String(value);
  if(Array.isArray(value))return value.map(formatValue).filter(Boolean).join(', ');
  if(typeof value==='object'){
    if(value.name)return formatValue(value.name);
    if(value.formula)return formatValue(value.formula);
    if(value.value!==undefined)return formatValue(value.value);
    if(value.amount!==undefined)return formatValue(value.amount);
    return Object.entries(value).map(([key,val])=>`${titleCase(key)} ${formatValue(val)}`).filter(Boolean).join(', ');
  }
  return String(value);
}
function collectText(value,out=[],seen=new Set()){
  if(value==null)return out;
  if(typeof value==='string'){
    const text=plain(value);
    if(text&&!seen.has(text)){seen.add(text);out.push(text)}
    return out;
  }
  if(Array.isArray(value)){value.forEach(item=>collectText(item,out,seen));return out}
  if(typeof value!=='object')return out;
  for(const key of ['description','summary','rules','entries','text'])if(key in value)collectText(value[key],out,seen);
  return out;
}
function descriptionOf(record){
  const d=dataOf(record),parts=[],seen=new Set();
  for(const source of [d.text,d.description,d.entries,d.rules,record?.summary])collectText(source,parts,seen);
  return parts.join('\n\n');
}
function summaryOf(record){return plain(record?.summary||'')||descriptionOf(record).split(/\n\n+/)[0]||''}
function mediaCandidates(record){
  const d=dataOf(record),entity=entityOf(record),media=entity.media||d.media||record?.media||{},assets=arr(media.assets);
  const primary=media.primaryRole?assets.find(asset=>asset?.role===media.primaryRole):null;
  const ordered=primary?[primary,...assets.filter(asset=>asset!==primary)]:assets;
  const raw=[];
  for(const asset of ordered)for(const key of ['sourceUrl','url','src','path'])if(asset?.[key])raw.push(asset[key]);
  for(const value of [media.sourceUrl,media.url,media.src,media.path,d.image,d.img,entity.img])if(value)raw.push(value);
  return [...new Set(raw.map(value=>String(value).trim()).filter(Boolean).map(value=>/^data:|^blob:|^https?:\/\//i.test(value)?value:(value.startsWith('/')?value:`/${value.replace(/^\.\//,'')}`)))];
}

function classKeyFromId(id){const match=String(id||'').match(/:class:([^:]+):/i);return match?normalized(match[1]):''}
function classGroup(record){
  const d=dataOf(record);
  let group=normalized(path(d,'category','parentClass.slug','class.slug'));
  if(!group){const match=recordId(record).match(/:feature:([^:]+):/i);if(match)group=normalized(match[1])}
  return orders['class-features'].includes(group)?group:'other';
}
function isMagicItem(data){
  const rarity=normalized(path(data,'rarity'));
  const magicalRarity=rarity&&!['none','mundane','unknown',''].includes(rarity);
  return Boolean(path(data,'wondrous'))||magicalRarity||hasAny(data,['reqAttune','requiresAttunement','charges','attachedSpells','bonusAc','bonusWeapon','bonusSavingThrow','bonusSpellAttack','bonusSpellSaveDc','ability','resist','immune']);
}
function itemGroup(record){
  const d=dataOf(record);
  if(isMagicItem(d))return'magic';
  if(path(d,'poison')||path(d,'poisonTypes'))return'poisons';
  if(hasAny(d,['ammoType','arrow','bolt','bulletSling','needleBlowgun']))return'ammo';
  if(path(d,'weapon')||path(d,'weaponCategory')||hasAny(d,['dmg1','dmg2','dmgType','mastery']))return'weapons';
  if(path(d,'armor')||hasAny(d,['ac','stealth','strength']))return'armor';
  if(hasAny(d,['vehAc','vehHp','vehSpeed','crew','capCargo','capPassenger','carryingCapacity'])||/vehicle|mount/i.test(formatValue(path(d,'itemKind','equipmentCategory','type'))))return'vehicles';
  if(path(d,'packContents')||path(d,'containerCapacity'))return'packs';
  const type=String(path(d,'type','itemKind','equipmentCategory')||'').toUpperCase();
  if(['AT','T','INS','GS'].includes(type)||/tool|instrument|gaming|kit|artisan/i.test(type))return'tools';
  if(type||path(d,'value')!==undefined||path(d,'weight')!==undefined)return'gear';
  return'other';
}
function featGroup(record){
  let value=normalized(path(dataOf(record),'featCategory','category')).replace(/[ _]+/g,'-');
  if(value==='fightingstyle')value='fighting-style';
  if(value==='epicboon')value='epic-boon';
  return orders.feats.includes(value)?value:'other';
}
function creatureType(record){
  const raw=path(dataOf(record),'creatureType','type');
  if(typeof raw==='string')return normalized(raw);
  if(Array.isArray(raw))return normalized(raw[0]);
  if(raw&&typeof raw==='object')return normalized(raw.type||raw.value||raw.name);
  return'other';
}
function monsterGroup(record){const value=creatureType(record);return orders.monsters.includes(value)?value:'other'}
function spellLevel(record){const value=path(dataOf(record),'level','spellLevel');if(normalized(value)==='cantrip')return 0;const number=Number(value);return Number.isInteger(number)&&number>=0&&number<=9?number:null}
function spellGroup(record){const level=spellLevel(record);return level==null?'other':`circle:${level}`}
function subclassGroup(record){
  const d=dataOf(record),parent=path(d,'parentClass')||{};
  let key=classKeyFromId(parent.canonicalId||path(d,'parentClassId'))||slug(parent.name||path(d,'class.name')||path(d,'classId'));
  if(copy.classes[key]){state.dynamicLabels.set(`subclass:${key}`,copy.classes[key]);state.dynamicGlyphs.set(`subclass:${key}`,classGlyphs[key]||'SC');return`subclass:${key}`}
  const label=parent.name||titleCase(key)||copy.groups.other;
  const group=`subclass:${key||'other'}`;state.dynamicLabels.set(group,label);state.dynamicGlyphs.set(group,'SC');return group;
}
function speciesFeatureGroupKeys(record){
  const ids=[recordId(record),record?.sourceCanonicalId,entityOf(record)?.provenance?.derivedFrom].filter(Boolean);
  const groups=new Set();
  for(const id of ids){
    for(const group of state.speciesFeatureGroups.get(id)||[])groups.add(group);
    for(const group of state.srdSpeciesFeatureGroups.get(id)||[])groups.add(group);
  }
  const parent=path(dataOf(record),'parentSpecies');
  if(parent){
    const label=parent.name||titleCase(classKeyFromId(parent.canonicalId)||'');
    const group=`species:${slug(parent.canonicalId||label)}`;
    state.dynamicLabels.set(group,label||copy.groups.other);state.dynamicGlyphs.set(group,'SP');groups.add(group);
  }
  if(!groups.size)groups.add('other');
  return [...groups];
}
function groupsOf(record){
  switch(state.category){
    case'class-features':return[classGroup(record)];
    case'items':return[itemGroup(record)];
    case'feats':return[featGroup(record)];
    case'monsters':return[monsterGroup(record)];
    case'spells':return[spellGroup(record)];
    case'species-features':return speciesFeatureGroupKeys(record);
    case'subclasses':return[subclassGroup(record)];
    default:return['all'];
  }
}
function circleLabel(group){
  const level=Number(group.split(':')[1]);
  if(level===0)return pt?'Truques':'Cantrips';
  if(pt)return`${level}º Círculo`;
  const suffix=level===1?'st':level===2?'nd':level===3?'rd':'th';return`${level}${suffix} Circle`;
}
function groupLabel(group){
  if(group.startsWith('circle:'))return circleLabel(group);
  if(state.dynamicLabels.has(group))return state.dynamicLabels.get(group);
  return copy.groups[group]||titleCase(group);
}
function groupGlyph(group){
  if(state.dynamicGlyphs.has(group))return state.dynamicGlyphs.get(group);
  if(group.startsWith('circle:'))return group==='circle:0'?'0':group.split(':')[1];
  if(state.category==='class-features')return classGlyphs[group]||'CF';
  if(state.category==='items')return itemGlyphs[group]||'•';
  if(state.category==='feats')return featGlyphs[group]||'FT';
  if(state.category==='monsters')return creatureGlyphs[group]||'CR';
  return categoryGlyphs[state.category]||'OR';
}
function groupOrder(){
  if(orders[state.category])return orders[state.category];
  if(state.dynamicOrder.length)return [...state.dynamicOrder,'other'];
  return['other'];
}

function loadHomebrew(category){try{const all=JSON.parse(localStorage.getItem(homebrewKey)||'[]');return Array.isArray(all)?all.filter(record=>record?.category===category):[]}catch{return[]}}
async function loadSrd(category){
  const key=`${locale}:${category}`;
  if(state.cache.has(key))return state.cache.get(key);
  const response=await fetch(`${base}/${category}.json`);if(!response.ok)throw new Error(category);
  const data=await response.json(),records=Array.isArray(data.items)?data.items:[];state.cache.set(key,records);return records;
}
async function loadRecords(category,mode){return mode==='homebrew'?loadHomebrew(category):loadSrd(category)}
function sourceEntries(){return[...list.querySelectorAll('.entry[data-id]')]}
function availableFromSource(records){
  const ids=new Set(sourceEntries().map(entry=>entry.dataset.id));
  return records.filter(record=>ids.has(recordId(record)));
}
function sourceListEntry(id){return sourceEntries().find(entry=>entry.dataset.id===id)}
function openRecord(id){sourceListEntry(id)?.click()}

async function buildSpeciesFeatureRelations(mode){
  state.dynamicLabels.clear();state.dynamicGlyphs.clear();state.dynamicOrder=[];state.speciesFeatureGroups=new Map();state.srdSpeciesFeatureGroups=new Map();
  const build=(speciesRecords,target)=>{
    for(const species of speciesRecords){
      const label=recordName(species),group=`species:${slug(recordId(species)||label)}`;
      state.dynamicLabels.set(group,label);state.dynamicGlyphs.set(group,'SP');
      if(!state.dynamicOrder.includes(group))state.dynamicOrder.push(group);
      for(const ref of arr(path(dataOf(species),'features','featureRefs','traits'))){
        const id=typeof ref==='string'?ref:(ref?.canonicalId||ref?.id);
        if(!id)continue;if(!target.has(id))target.set(id,new Set());target.get(id).add(group);
      }
    }
  };
  const srdSpecies=await loadSrd('species');build(srdSpecies,state.srdSpeciesFeatureGroups);
  if(mode==='homebrew')build(loadHomebrew('species'),state.speciesFeatureGroups);
  else state.speciesFeatureGroups=state.srdSpeciesFeatureGroups;
}
function buildSubclassGroups(records){
  state.dynamicLabels.clear();state.dynamicGlyphs.clear();state.dynamicOrder=[];
  for(const record of records){const group=subclassGroup(record);if(!state.dynamicOrder.includes(group))state.dynamicOrder.push(group)}
  state.dynamicOrder.sort((a,b)=>groupLabel(a).localeCompare(groupLabel(b),locale));
}
async function prepareGrouping(category,mode,records){
  state.dynamicLabels.clear();state.dynamicGlyphs.clear();state.dynamicOrder=[];
  if(category==='species-features')await buildSpeciesFeatureRelations(mode);
  if(category==='subclasses')buildSubclassGroups(records);
}

function groupedRecords(records){
  const map=new Map();
  for(const record of records){for(const group of groupsOf(record)){if(!map.has(group))map.set(group,[]);map.get(group).push(record)}}
  return map;
}
function sectionRecords(){return state.available.filter(record=>groupsOf(record).includes(state.group))}
function groupTitle(){return copy.titles[state.category]||copy.sections}
function renderLanding(){
  const grouped=groupedRecords(state.available);
  const explicit=groupOrder().filter(group=>grouped.get(group)?.length),extras=[...grouped.keys()].filter(group=>!explicit.includes(group));
  const ordered=[...explicit,...extras.filter(group=>group!=='other').sort((a,b)=>groupLabel(a).localeCompare(groupLabel(b),locale)),...(grouped.get('other')?['other']:[])];
  const cards=ordered.map(group=>{const amount=grouped.get(group).length;return`<button type="button" class="section-group" data-section-group="${esc(group)}"><span class="section-group-icon" aria-hidden="true">${esc(groupGlyph(group))}</span><span class="section-group-copy"><strong>${esc(groupLabel(group))}</strong><small>${amount} ${amount===1?copy.entry:copy.entries}</small></span><span class="section-group-arrow" aria-hidden="true">›</span></button>`}).join('');
  landing.innerHTML=`<header class="section-landing-head"><p class="section-eyebrow">${copy.sections}</p><h2>${esc(groupTitle())}</h2><p>${copy.chooseSection}</p></header><div class="section-group-grid">${cards||`<p class="section-empty">${copy.empty}</p>`}</div>`;
  landing.querySelectorAll('[data-section-group]').forEach(button=>button.onclick=()=>selectGroup(button.dataset.sectionGroup));
  landing.hidden=false;detail.hidden=true;stage.innerHTML='';sectionList.innerHTML='';
  list.hidden=true;document.getElementById('itemCardBrowser')?.setAttribute('hidden','');
  if(count)count.textContent=`${state.available.length} ${state.available.length===1?copy.entry:copy.entries}`;
}
function selectGroup(group){state.group=group;state.index=0;state.flipped=false;renderDetail();window.scrollTo({top:browser.offsetTop-12,behavior:'smooth'})}
function closeGroup(){state.group='';state.index=0;state.flipped=false;renderLanding()}

function stat(label,value){if(value===undefined||value===null||value==='')return null;return[label,formatValue(value)]}
function itemStats(record){const d=dataOf(record);return[
  stat(copy.rarity,path(d,'rarity')),stat(copy.type,path(d,'itemKind','type','category','equipmentCategory')),
  stat(copy.attunement,path(d,'attunement','requiresAttunement','reqAttune')),stat(copy.damage,path(d,'damage.formula','damage','weapon.damage','dmg1')),
  stat(copy.armor,path(d,'armorClass','armor.ac','ac')),stat(copy.weight,path(d,'weight')),stat(copy.cost,path(d,'cost','price','value'))
].filter(Boolean)}
function featureStats(record){const d=dataOf(record);return[
  stat(copy.level,path(d,'level','requiredLevel')),stat(copy.uses,path(d,'uses.max','uses','usage.max')),stat(copy.recovery,path(d,'uses.recovery','recovery','usage.recovery'))
].filter(Boolean)}
function featStats(record){const d=dataOf(record),prereq=arr(path(d,'prerequisites'))[0];return[
  stat(copy.type,groupLabel(featGroup(record))),stat(copy.prerequisite,prereq?.minimumLevel?`${copy.level} ${prereq.minimumLevel}`:path(d,'requiredLevel')),
  stat(copy.repeatable,path(d,'repeatable'))
].filter(Boolean)}
function spellStats(record){const d=dataOf(record),level=spellLevel(record);return[
  stat(copy.circle,level==null?'—':circleLabel(`circle:${level}`)),stat(copy.school,path(d,'school.name','school')),
  stat(copy.casting,path(d,'castingTime','activation','time')),stat(copy.range,path(d,'range')),stat(copy.duration,path(d,'duration'))
].filter(Boolean)}
function monsterStats(record){const d=dataOf(record);return[
  stat(copy.type,groupLabel(monsterGroup(record))),stat(copy.cr,path(d,'challengeRating','cr','challenge.rating')),
  stat(copy.ac,path(d,'armorClass','ac','defenses.ac','attributes.ac.value')),stat(copy.hp,path(d,'hitPoints.value','hitPoints','hp.value','hp','attributes.hp.value'))
].filter(Boolean)}
function speciesStats(record){const d=dataOf(record);return[
  stat(copy.type,path(d,'creatureType','type')),stat(copy.size,path(d,'size','sizes','sizeOptions')),stat(copy.speed,path(d,'speed','movement.speed','movement.walk','speeds.walk'))
].filter(Boolean)}
function cardStats(record){switch(state.category){case'items':return itemStats(record);case'feats':return featStats(record);case'spells':return spellStats(record);case'monsters':return monsterStats(record);case'species':return speciesStats(record);default:return featureStats(record)}}
function mediaHtml(record){
  const candidates=mediaCandidates(record),glyph=categoryGlyphs[state.category]||'OR';
  if(!candidates.length)return`<div class="section-card-image is-fallback"><span>${esc(glyph)}</span><small>${copy.noImage}</small></div>`;
  return`<div class="section-card-image"><img alt="" data-section-image data-candidates="${esc(JSON.stringify(candidates))}"><div class="section-card-image-fallback">${esc(glyph)}</div></div>`;
}
function cardMetaLabel(record){
  if(state.group&&state.group!=='all')return groupLabel(state.group);
  if(state.category==='species-features'){const groups=speciesFeatureGroupKeys(record);return groups.map(groupLabel).join(', ')}
  return copy.titles[state.category]||titleCase(state.category);
}
function cardHtml(record,active,index){
  const id=recordId(record),name=recordName(record),summary=summaryOf(record),description=descriptionOf(record),stats=cardStats(record),frontStats=stats.slice(0,3),source=activeMode()==='homebrew'?'HOMEBREW':'SRD';
  return`<article class="section-card-slot ${active?'is-active':''}" data-card-index="${index}" style="${cardStyle(index-state.index)}" ${active?'tabindex="0"':'tabindex="-1"'} aria-label="${esc(name)}"><div class="section-card ${active&&state.flipped?'is-flipped':''}"><div class="section-card-inner">
    <div class="section-card-face section-card-front"><button type="button" class="section-card-expand" data-open-id="${esc(id)}" aria-label="${copy.expand}">↗</button>${mediaHtml(record)}<div class="section-card-body"><div class="section-card-kicker"><span>${source}</span><span>${esc(cardMetaLabel(record))}</span></div><h3>${esc(name)}</h3>${frontStats.length?`<div class="section-card-stats">${frontStats.map(([label,value])=>`<span><small>${esc(label)}</small><strong>${esc(value)}</strong></span>`).join('')}</div>`:''}${summary?`<p>${esc(summary)}</p>`:''}<div class="section-card-hint">↻ ${copy.flip}</div></div></div>
    <div class="section-card-face section-card-back"><button type="button" class="section-card-expand" data-open-id="${esc(id)}" aria-label="${copy.expand}">↗</button><div class="section-card-back-ornament">✦</div><h3>${esc(name)}</h3><div class="section-card-scroll">${stats.length?`<section><h4>${copy.details}</h4><dl>${stats.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></section>`:''}<section><h4>${copy.description}</h4>${(description||'—').split(/\n\n+/).map(text=>`<p>${esc(text)}</p>`).join('')}</section></div><div class="section-card-hint">↻ ${copy.flip}</div></div>
  </div></div></article>`;
}
function cardStyle(offset){const distance=Math.abs(offset);return`--section-x:${offset*72}px;--section-y:${distance*13}px;--section-r:${offset*5.6}deg;--section-s:${Math.max(.72,1-distance*.065)};--section-z:${30-distance};--section-o:${Math.max(.42,1-distance*.17)}`}
function visibleIndices(length){
  if(length<=7)return Array.from({length},(_,index)=>index);
  const out=[];for(let offset=-3;offset<=3;offset++){const index=Math.max(0,Math.min(length-1,state.index+offset));if(!out.includes(index))out.push(index)}
  while(out.length<7&&out[0]>0)out.unshift(out[0]-1);while(out.length<7&&out[out.length-1]<length-1)out.push(out[out.length-1]+1);return out;
}
function renderDots(records){const length=records.length;if(!length){dots.innerHTML='';return}const size=Math.min(7,length);let start=Math.max(0,state.index-Math.floor(size/2));start=Math.min(start,length-size);dots.innerHTML=Array.from({length:size},(_,i)=>`<span class="section-card-dot ${start+i===state.index?'is-active':''}"></span>`).join('')}
function wireImages(){stage.querySelectorAll('[data-section-image]').forEach(img=>{let candidates=[];try{candidates=JSON.parse(img.dataset.candidates||'[]')}catch{}let index=0;const attempt=()=>{if(index>=candidates.length){img.hidden=true;img.closest('.section-card-image')?.classList.add('is-fallback');return}img.src=candidates[index++]};img.onerror=attempt;attempt()})}
function renderCardStage(records){
  if(!records.length){stage.innerHTML=`<p class="section-empty">${copy.empty}</p>`;controls.hidden=true;return}
  state.index=Math.max(0,Math.min(records.length-1,state.index));controls.hidden=false;
  stage.innerHTML=visibleIndices(records.length).map(index=>cardHtml(records[index],index===state.index,index)).join('');renderDots(records);wireImages();prev.disabled=state.index<=0;next.disabled=state.index>=records.length-1;
}
function listMeta(record){return cardStats(record).slice(0,2).map(([,value])=>value).filter(Boolean).join(' · ')}
function renderCardList(records){
  sectionListCount.textContent=`${records.length} ${records.length===1?copy.entry:copy.entries}`;
  sectionList.innerHTML=records.length?records.map((record,index)=>`<button type="button" class="section-entry" data-list-index="${index}"><span class="section-entry-icon">${esc(categoryGlyphs[state.category]||'OR')}</span><span class="section-entry-copy"><strong>${esc(recordName(record))}</strong><small>${esc(summaryOf(record)||listMeta(record)||'')}</small></span><span class="section-entry-meta"><span>${esc(listMeta(record))}</span><b>›</b></span></button>`).join(''):`<p class="section-empty">${copy.empty}</p>`;
  sectionList.querySelectorAll('[data-list-index]').forEach(button=>button.onclick=()=>{state.index=Number(button.dataset.listIndex);state.flipped=false;renderCardStage(records);window.scrollTo({top:stage.offsetTop+browser.offsetTop-20,behavior:'smooth'})});
}
function renderSimpleList(records){
  stage.hidden=true;controls.hidden=true;sectionListCount.textContent=`${records.length} ${records.length===1?copy.entry:copy.entries}`;
  sectionList.innerHTML=records.length?records.map(record=>`<button type="button" class="section-entry" data-open-simple="${esc(recordId(record))}"><span class="section-entry-icon">SC</span><span class="section-entry-copy"><strong>${esc(recordName(record))}</strong><small>${esc(summaryOf(record))}</small></span><span class="section-entry-meta"><b>›</b></span></button>`).join(''):`<p class="section-empty">${copy.empty}</p>`;
  sectionList.querySelectorAll('[data-open-simple]').forEach(button=>button.onclick=()=>openRecord(button.dataset.openSimple));
}
function renderDetail(recordsOverride=null,direct=false){
  const records=recordsOverride||sectionRecords();landing.hidden=true;detail.hidden=false;stage.hidden=false;back.hidden=direct;
  detailEyebrow.textContent=state.category==='subclasses'?copy.list:copy.featured;
  sectionTitle.textContent=direct?(copy.titles[state.category]||titleCase(state.category)):groupLabel(state.group);
  sectionSub.textContent=`${records.length} ${records.length===1?copy.entry:copy.entries}`;
  if(state.category==='subclasses'){renderSimpleList(records);if(count)count.textContent=`${records.length} ${records.length===1?copy.entry:copy.entries}`;return}
  renderCardStage(records);renderCardList(records);if(count)count.textContent=`${records.length} ${records.length===1?copy.entry:copy.entries}`;
}
function renderDirect(){state.group='all';state.index=Math.min(state.index,Math.max(0,state.available.length-1));renderDetail(state.available,true)}

function currentCardRecords(){return state.category==='subclasses'?[]:(directCardCategories.has(state.category)?state.available:sectionRecords())}
function moveCard(delta){const records=currentCardRecords();if(!records.length)return;const nextIndex=Math.max(0,Math.min(records.length-1,state.index+delta));if(nextIndex===state.index)return;state.index=nextIndex;state.flipped=false;renderCardStage(records)}
prev.onclick=()=>moveCard(-1);next.onclick=()=>moveCard(1);back.onclick=closeGroup;
stage.addEventListener('click',event=>{
  const open=event.target.closest('[data-open-id]');if(open){event.stopPropagation();openRecord(open.dataset.openId);return}
  const slot=event.target.closest('.section-card-slot');if(!slot)return;const index=Number(slot.dataset.cardIndex),records=currentCardRecords();if(index!==state.index){state.index=index;state.flipped=false;renderCardStage(records);return}state.flipped=!state.flipped;renderCardStage(records);
});
stage.addEventListener('keydown',event=>{if(!event.target.closest('.section-card-slot.is-active'))return;if(event.key==='Enter'||event.key===' '){event.preventDefault();state.flipped=!state.flipped;renderCardStage(currentCardRecords())}if(event.key==='ArrowLeft'){event.preventDefault();moveCard(-1)}if(event.key==='ArrowRight'){event.preventDefault();moveCard(1)}});
stage.addEventListener('pointerdown',event=>{state.pointerStart={x:event.clientX,y:event.clientY,id:event.pointerId}});
stage.addEventListener('pointerup',event=>{if(!state.pointerStart||state.pointerStart.id!==event.pointerId)return;const dx=event.clientX-state.pointerStart.x,dy=event.clientY-state.pointerStart.y;state.pointerStart=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.25)moveCard(dx<0?1:-1)});
stage.addEventListener('pointercancel',()=>{state.pointerStart=null});

function shouldManage(category,mode){if(category==='classes')return false;if(category==='subclasses')return mode==='homebrew';return cardCategories.has(category)}
function deactivate(){browser.hidden=true;browser.classList.remove('is-simple');document.body.classList.remove('compendium-hierarchy-active');list.hidden=false;stage.hidden=false;controls.hidden=false}
async function sync(){
  const category=activeCategory(),mode=activeMode(),version=++state.version;
  if(!shouldManage(category,mode)){state.category=category;state.mode=mode;state.group='';deactivate();return}
  document.body.classList.add('compendium-hierarchy-active');browser.hidden=false;list.hidden=true;document.getElementById('itemCardBrowser')?.setAttribute('hidden','');
  const changed=state.category!==category||state.mode!==mode;if(changed){state.category=category;state.mode=mode;state.group='';state.index=0;state.flipped=false}
  let records;try{records=await loadRecords(category,mode);await prepareGrouping(category,mode,records)}catch{if(version!==state.version)return;landing.innerHTML=`<p class="section-empty">${copy.empty}</p>`;landing.hidden=false;detail.hidden=true;return}
  if(version!==state.version||activeCategory()!==category||activeMode()!==mode)return;
  state.records=records;state.available=availableFromSource(records);
  if(directCardCategories.has(category)){renderDirect();return}
  const grouped=groupedRecords(state.available);
  if(state.group&&grouped.get(state.group)?.length){renderDetail();return}
  state.group='';renderLanding();
}

let scheduled=false;function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;sync()},0)}
new MutationObserver(schedule).observe(list,{childList:true,subtree:true});
new MutationObserver(schedule).observe(categories,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
document.querySelectorAll('.tab[data-mode]').forEach(tab=>new MutationObserver(schedule).observe(tab,{attributes:true,attributeFilter:['class']}));
search.addEventListener('input',schedule);
schedule();
})();