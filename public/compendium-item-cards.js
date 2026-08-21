(()=>{
'use strict';

const list=document.getElementById('list');
const categories=document.getElementById('categories');
const search=document.getElementById('search');
if(!list||!categories||!search)return;

const locale=document.documentElement.lang==='en'?'en':'pt-BR';
const pt=locale==='pt-BR';
const homebrewKey='oraclerpg.homebrew.v1';
const copy=pt?{
  focus:'Item em destaque',of:'de',flip:'Toque na carta para virar',front:'Frente',back:'Verso',expand:'Expandir item',previous:'Item anterior',next:'Próximo item',noImage:'Sem imagem',item:'Item',rarity:'Raridade',type:'Tipo',attunement:'Sintonia',damage:'Dano',armor:'Armadura',weight:'Peso',cost:'Custo',properties:'Propriedades',description:'Descrição',details:'Detalhes',yes:'Sim',no:'Não'
}:{
  focus:'Featured item',of:'of',flip:'Tap the card to flip',front:'Front',back:'Back',expand:'Expand item',previous:'Previous item',next:'Next item',noImage:'No image',item:'Item',rarity:'Rarity',type:'Type',attunement:'Attunement',damage:'Damage',armor:'Armor',weight:'Weight',cost:'Cost',properties:'Properties',description:'Description',details:'Details',yes:'Yes',no:'No'
};

const browser=document.createElement('section');
browser.id='itemCardBrowser';
browser.className='item-card-browser';
browser.hidden=true;
browser.innerHTML=`
  <header class="item-card-browser__header">
    <p class="item-card-browser__eyebrow">${copy.focus}</p>
    <h2 id="itemCardTitle" class="item-card-browser__title" aria-live="polite"></h2>
    <div class="item-card-browser__meta"><span id="itemCardPosition"></span><span aria-hidden="true">•</span><span>${copy.flip}</span></div>
  </header>
  <div class="item-card-fan" id="itemCardFan" aria-label="${pt?'Carrossel de itens':'Item carousel'}"></div>
  <div class="item-card-controls">
    <button type="button" class="item-card-nav" id="itemCardPrev" aria-label="${copy.previous}">‹</button>
    <div class="item-card-dots" id="itemCardDots" aria-hidden="true"></div>
    <button type="button" class="item-card-nav" id="itemCardNext" aria-label="${copy.next}">›</button>
  </div>`;
list.before(browser);

const title=browser.querySelector('#itemCardTitle');
const position=browser.querySelector('#itemCardPosition');
const fan=browser.querySelector('#itemCardFan');
const dots=browser.querySelector('#itemCardDots');
const prev=browser.querySelector('#itemCardPrev');
const next=browser.querySelector('#itemCardNext');

let srdItems=null;
let visibleRecords=[];
let selectedIndex=0;
let selectedId='';
let flipped=false;
let syncVersion=0;
let pointerStart=null;

function esc(text=''){return String(text??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function path(obj,...paths){for(const p of paths){let value=obj;for(const key of p.split('.')){if(value==null)break;value=value[key]}if(value!==undefined&&value!==null&&value!=='')return value}return undefined}
function arr(value){return Array.isArray(value)?value:(value==null?[]:[value])}
function recordId(record){return String(record?.canonicalId||record?.id||record?.entity?.canonicalId||record?.entity?.id||'')}
function recordName(record){return record?.name||record?.entity?.name||recordId(record)||copy.item}
function dataOf(record){return record?.entity?.data||record?.data||{}}
function titleCase(value=''){return String(value).replace(/[-_]/g,' ').replace(/\b\w/g,m=>m.toUpperCase())}
function formatValue(value){
  if(value===undefined||value===null||value==='')return '';
  if(typeof value==='boolean')return value?copy.yes:copy.no;
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
function collectText(value,out=[],seen=new Set()){
  if(value==null)return out;
  if(typeof value==='string'){
    const clean=plain(value);
    if(clean&&!seen.has(clean)){seen.add(clean);out.push(clean)}
    return out;
  }
  if(Array.isArray(value)){value.forEach(entry=>collectText(entry,out,seen));return out}
  if(typeof value!=='object')return out;
  for(const key of ['description','summary','rules','entries','text']){
    if(Object.prototype.hasOwnProperty.call(value,key))collectText(value[key],out,seen);
  }
  return out;
}
function descriptionOf(record){
  const d=dataOf(record);
  const parts=collectText(path(d,'text','description','entries','rules')??record?.summary??'');
  if(!parts.length&&record?.summary)parts.push(plain(record.summary));
  return parts.join('\n\n');
}
function firstSummary(record){
  const explicit=plain(record?.summary||'');
  if(explicit)return explicit;
  const full=descriptionOf(record);
  return full.split(/\n\n+/)[0]||'';
}
function loadHomebrew(){try{const value=JSON.parse(localStorage.getItem(homebrewKey)||'[]');return Array.isArray(value)?value:[]}catch{return[]}}
async function loadSrdItems(){
  if(srdItems)return srdItems;
  const response=await fetch(`/compendium/srd/${locale}/items.json`);
  if(!response.ok)throw new Error('items');
  const data=await response.json();
  srdItems=Array.isArray(data.items)?data.items:[];
  return srdItems;
}
function activeCategory(){return categories.querySelector('.category.active[data-category]')?.dataset.category||''}
function activeMode(){return document.querySelector('.tab.active[data-mode]')?.dataset.mode||'srd'}

function mediaCandidates(record){
  const d=dataOf(record);
  const media=record?.entity?.media||d.media||record?.media||{};
  const assets=arr(media.assets);
  const primary=media.primaryRole?assets.find(asset=>asset?.role===media.primaryRole):null;
  const ordered=primary?[primary,...assets.filter(asset=>asset!==primary)]:assets;
  const raw=[];
  for(const asset of ordered){for(const key of ['sourceUrl','url','src','path'])if(asset?.[key])raw.push(asset[key])}
  for(const value of [media.sourceUrl,media.url,media.src,media.path,d.image,d.img,record?.entity?.img])if(value)raw.push(value);
  const normalized=[];
  for(const value of raw){
    const candidate=String(value).trim();
    if(!candidate)continue;
    if(/^data:|^blob:|^https?:\/\//i.test(candidate))normalized.push(candidate);
    else normalized.push(candidate.startsWith('/')?candidate:`/${candidate.replace(/^\.\//,'')}`);
  }
  return [...new Set(normalized)];
}
function stat(record,label,...paths){
  const d=dataOf(record);
  const value=path(d,...paths);
  if(value===undefined||value===null||value==='')return null;
  return [label,formatValue(value)];
}
function itemStats(record){
  return [
    stat(record,copy.rarity,'rarity'),
    stat(record,copy.type,'itemKind','type','category','equipmentCategory'),
    stat(record,copy.attunement,'attunement','requiresAttunement'),
    stat(record,copy.damage,'damage.formula','damage','weapon.damage'),
    stat(record,copy.armor,'armorClass','armor.ac','ac'),
    stat(record,copy.weight,'weight'),
    stat(record,copy.cost,'cost','price','value')
  ].filter(Boolean);
}
function propertiesOf(record){
  const d=dataOf(record);
  return formatValue(path(d,'properties','weaponProperties','traits','mastery'));
}
function cardImage(record){
  const candidates=mediaCandidates(record);
  if(!candidates.length)return `<div class="item-card-image item-card-image--fallback"><span>IT</span><small>${copy.noImage}</small></div>`;
  return `<div class="item-card-image"><img alt="" data-item-image data-candidates="${esc(JSON.stringify(candidates))}"/><div class="item-card-image__fallback" aria-hidden="true"><span>IT</span></div></div>`;
}
function expandButton(id){return `<button type="button" class="item-card-expand" data-expand-id="${esc(id)}" aria-label="${copy.expand}" title="${copy.expand}"><span aria-hidden="true">↗</span></button>`}
function frontHtml(record,homebrew){
  const id=recordId(record),d=dataOf(record),name=recordName(record),summary=firstSummary(record);
  const rarity=formatValue(path(d,'rarity'));
  const type=formatValue(path(d,'itemKind','type','category','equipmentCategory'));
  const stats=itemStats(record).filter(([label])=>[copy.damage,copy.armor,copy.weight,copy.cost].includes(label)).slice(0,3);
  return `<div class="item-card-face item-card-front">
    ${expandButton(id)}
    ${cardImage(record)}
    <div class="item-card-front__body">
      <div class="item-card-badges"><span class="item-card-source ${homebrew?'is-homebrew':''}">${homebrew?'HOMEBREW':'SRD'}</span>${rarity?`<span>${esc(titleCase(rarity))}</span>`:''}${type?`<span>${esc(titleCase(type))}</span>`:''}</div>
      <h3>${esc(name)}</h3>
      ${stats.length?`<div class="item-card-mini-stats">${stats.map(([label,value])=>`<span><small>${esc(label)}</small><strong>${esc(value)}</strong></span>`).join('')}</div>`:''}
      ${summary?`<p class="item-card-summary">${esc(summary)}</p>`:''}
      <div class="item-card-flip-hint"><span aria-hidden="true">↻</span>${copy.back}</div>
    </div>
  </div>`;
}
function backHtml(record,homebrew){
  const id=recordId(record),name=recordName(record),description=descriptionOf(record);
  const stats=itemStats(record);
  const properties=propertiesOf(record);
  return `<div class="item-card-face item-card-back">
    ${expandButton(id)}
    <div class="item-card-back__ornament" aria-hidden="true">✦</div>
    <div class="item-card-back__head"><span class="item-card-source ${homebrew?'is-homebrew':''}">${homebrew?'HOMEBREW':'SRD'}</span><h3>${esc(name)}</h3></div>
    <div class="item-card-back__scroll">
      ${stats.length?`<section class="item-card-detail-section"><h4>${copy.details}</h4><dl>${stats.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></section>`:''}
      ${properties?`<section class="item-card-detail-section"><h4>${copy.properties}</h4><p>${esc(properties)}</p></section>`:''}
      <section class="item-card-detail-section item-card-description"><h4>${copy.description}</h4><p>${esc(description||'—').replace(/\n\n/g,'</p><p>')}</p></section>
    </div>
    <div class="item-card-flip-hint"><span aria-hidden="true">↻</span>${copy.front}</div>
  </div>`;
}
function circularIndex(index,length){return ((index%length)+length)%length}
function visibleOffsets(length){if(length<=1)return[0];if(length===2)return[-1,0];if(length<=5){const half=Math.floor(length/2);return Array.from({length},(_,i)=>i-half)}return[-3,-2,-1,0,1,2,3]}
function cardStyle(offset){
  const distance=Math.abs(offset);
  return `--card-x:${offset*72}px;--card-y:${distance*13}px;--card-rotate:${offset*5.6}deg;--card-scale:${1-distance*.065};--card-z:${30-distance};--card-opacity:${Math.max(.42,1-distance*.17)}`;
}
function renderDots(){
  const length=visibleRecords.length;
  if(length<=1){dots.innerHTML='<span class="item-card-dot is-active"></span>';return}
  const windowSize=Math.min(7,length);
  let start=Math.max(0,selectedIndex-Math.floor(windowSize/2));
  start=Math.min(start,length-windowSize);
  dots.innerHTML=Array.from({length:windowSize},(_,i)=>`<span class="item-card-dot ${(start+i)===selectedIndex?'is-active':''}"></span>`).join('');
}
function wireImages(){
  fan.querySelectorAll('[data-item-image]').forEach(img=>{
    let candidates=[];
    try{candidates=JSON.parse(img.dataset.candidates||'[]')}catch{}
    let index=0;
    const attempt=()=>{
      if(index>=candidates.length){img.hidden=true;img.closest('.item-card-image')?.classList.add('item-card-image--fallback');return}
      img.src=candidates[index++];
    };
    img.addEventListener('error',attempt);
    attempt();
  });
}
function renderFan(){
  if(!visibleRecords.length)return;
  selectedIndex=circularIndex(selectedIndex,visibleRecords.length);
  const selected=visibleRecords[selectedIndex];
  selectedId=recordId(selected);
  const homebrew=activeMode()==='homebrew';
  title.textContent=recordName(selected);
  position.textContent=`${selectedIndex+1} ${copy.of} ${visibleRecords.length}`;
  prev.disabled=visibleRecords.length<2;
  next.disabled=visibleRecords.length<2;
  const offsets=visibleOffsets(visibleRecords.length);
  const used=new Set();
  fan.innerHTML=offsets.map(offset=>{
    const index=circularIndex(selectedIndex+offset,visibleRecords.length);
    if(used.has(index))return'';
    used.add(index);
    const record=visibleRecords[index];
    const id=recordId(record);
    const active=offset===0;
    return `<article class="item-card-slot ${active?'is-active':''}" data-card-index="${index}" data-card-id="${esc(id)}" style="${cardStyle(offset)}" aria-label="${esc(recordName(record))}" ${active?'tabindex="0"':'tabindex="-1"'}>
      <div class="item-card ${active&&flipped?'is-flipped':''}">
        <div class="item-card-inner">${frontHtml(record,homebrew)}${backHtml(record,homebrew)}</div>
      </div>
    </article>`;
  }).join('');
  renderDots();
  wireImages();
}
function select(index){selectedIndex=circularIndex(index,visibleRecords.length);flipped=false;renderFan()}
function move(delta){if(visibleRecords.length<2)return;select(selectedIndex+delta)}
function openViewer(id){
  const entry=[...list.querySelectorAll('.entry[data-id]')].find(node=>node.dataset.id===id);
  if(entry)entry.click();
}
function handleCardActivation(slot){
  const index=Number(slot.dataset.cardIndex);
  if(!Number.isFinite(index))return;
  if(index!==selectedIndex){select(index);return}
  flipped=!flipped;
  slot.querySelector('.item-card')?.classList.toggle('is-flipped',flipped);
}

fan.addEventListener('click',event=>{
  const expand=event.target.closest('[data-expand-id]');
  if(expand){event.stopPropagation();openViewer(expand.dataset.expandId);return}
  const slot=event.target.closest('.item-card-slot');
  if(slot)handleCardActivation(slot);
});
fan.addEventListener('keydown',event=>{
  if(event.key==='Enter'||event.key===' '){event.preventDefault();const slot=event.target.closest('.item-card-slot');if(slot)handleCardActivation(slot)}
  if(event.key==='ArrowLeft'){event.preventDefault();move(-1)}
  if(event.key==='ArrowRight'){event.preventDefault();move(1)}
});
prev.addEventListener('click',()=>move(-1));
next.addEventListener('click',()=>move(1));
fan.addEventListener('pointerdown',event=>{if(event.target.closest('button'))return;pointerStart={x:event.clientX,y:event.clientY,id:event.pointerId}});
fan.addEventListener('pointerup',event=>{
  if(!pointerStart||pointerStart.id!==event.pointerId)return;
  const dx=event.clientX-pointerStart.x,dy=event.clientY-pointerStart.y;
  pointerStart=null;
  if(Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.2){event.preventDefault();move(dx<0?1:-1)}
});
fan.addEventListener('pointercancel',()=>{pointerStart=null});

async function syncFromList(){
  const version=++syncVersion;
  if(activeCategory()!=='items'){
    browser.hidden=true;
    list.hidden=false;
    return;
  }
  const entries=[...list.querySelectorAll('.entry[data-category="items"][data-id]')];
  if(!entries.length){browser.hidden=true;list.hidden=false;return}
  const mode=activeMode();
  try{
    const records=mode==='homebrew'?loadHomebrew().filter(record=>record.category==='items'):await loadSrdItems();
    if(version!==syncVersion||activeCategory()!=='items'||activeMode()!==mode)return;
    const byId=new Map(records.map(record=>[recordId(record),record]));
    const nextRecords=entries.map(entry=>byId.get(entry.dataset.id)).filter(Boolean);
    if(!nextRecords.length){browser.hidden=true;list.hidden=false;return}
    const oldId=selectedId;
    visibleRecords=nextRecords;
    const preserved=oldId?visibleRecords.findIndex(record=>recordId(record)===oldId):-1;
    selectedIndex=preserved>=0?preserved:0;
    flipped=false;
    list.hidden=true;
    browser.hidden=false;
    renderFan();
  }catch{
    browser.hidden=true;
    list.hidden=false;
  }
}

let syncTimer=0;
function scheduleSync(){clearTimeout(syncTimer);syncTimer=setTimeout(syncFromList,0)}
const observer=new MutationObserver(scheduleSync);
observer.observe(list,{childList:true,subtree:true});
observer.observe(categories,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
document.querySelectorAll('.tab[data-mode]').forEach(tab=>new MutationObserver(scheduleSync).observe(tab,{attributes:true,attributeFilter:['class']}));
search.addEventListener('input',scheduleSync);
document.addEventListener('click',event=>{if(event.target.closest('.category,.tab'))setTimeout(scheduleSync,0)},true);
window.addEventListener('storage',event=>{if(event.key===homebrewKey)scheduleSync()});
scheduleSync();
})();
