(()=>{
'use strict';

const candidateSelector=[
  '.entry-summary',
  '.hero-summary',
  '.rule-text',
  '.rule-list li',
  '.metric-value',
  '.chip',
  '.mini',
  '.section-card-body > p',
  '.section-card-scroll p',
  '.section-entry-copy small',
  '.item-card-summary',
  '.item-card-description p',
  '.item-card-detail-section p',
  '#viewerVisual p',
  '#viewerVisual li'
].join(',');
const roots=['#list','#viewerVisual','#compendiumSectionBrowser','#itemCardBrowser'];
let scheduled=false;

function plain(text=''){
  return String(text)
    .replace(/\{@(?:damage|dice|hit|dc|chance) ([^}|]+)(?:\|[^}]*)?\}/gi,'$1')
    .replace(/\{@[^ }]+ ([^|}]+)(?:\|[^}|]*)?(?:\|([^}]+))?\}/g,(match,key,display)=>display||key)
    .replace(/&Reference\[([^\] ]+)[^\]]*\]/g,'$1')
    .replace(/\[\[[^\]]+\]\]/g,'')
    .replace(/\s+/g,' ')
    .trim();
}
function looksStructured(value){
  if(Array.isArray(value))return value.some(entry=>entry&&typeof entry==='object');
  if(!value||typeof value!=='object')return false;
  return ['type','name','title','label','caption','description','summary','entries','items','rules','text','rows','columns']
    .some(key=>Object.prototype.hasOwnProperty.call(value,key));
}
function parseStructured(text){
  const source=String(text??'').trim();
  if(source.length<2)return null;
  const objectLike=source[0]==='{'&&source.at(-1)==='}';
  const arrayLike=source[0]==='['&&source.at(-1)===']';
  if(!objectLike&&!arrayLike)return null;
  try{
    const parsed=JSON.parse(source);
    return looksStructured(parsed)?parsed:null;
  }catch{return null}
}
function flatten(value,seen=new Set()){
  if(value==null)return '';
  if(typeof value==='string'){
    const parsed=parseStructured(value);
    return parsed?flatten(parsed,seen):plain(value);
  }
  if(typeof value==='number'||typeof value==='boolean')return String(value);
  if(Array.isArray(value)){
    const pieces=value.map(entry=>flatten(entry,seen)).filter(Boolean);
    return [...new Set(pieces)].join(' • ');
  }
  if(typeof value!=='object'||seen.has(value))return '';
  seen.add(value);
  const label=flatten(value.name??value.title??value.label??value.caption??'',seen);
  const body=[];
  for(const key of ['description','summary','entries','items','rules','text','rows']){
    if(value[key]!=null){
      const text=flatten(value[key],seen);
      if(text)body.push(text);
    }
  }
  if(!body.length){
    for(const [key,entry] of Object.entries(value)){
      if(['type','name','title','label','caption','columns'].includes(key))continue;
      const text=flatten(entry,seen);
      if(text)body.push(text);
    }
  }
  seen.delete(value);
  const content=[...new Set(body)].join(' • ');
  if(label&&content)return /[:：]\s*$/.test(label)?`${label} ${content}`:`${label}: ${content}`;
  return label||content;
}
function normalizeElement(element){
  if(!(element instanceof Element))return;
  if(element.closest('pre,code,script,style,textarea,.json-wrap'))return;
  const source=element.textContent?.trim();
  if(!source||element.dataset.structuredTextNormalized===source)return;
  const parsed=parseStructured(source);
  if(!parsed)return;
  const readable=flatten(parsed);
  if(!readable||readable===source)return;
  element.textContent=readable;
  element.dataset.structuredTextNormalized=readable;
}
function scanAll(){
  scheduled=false;
  for(const selector of roots){
    const root=document.querySelector(selector);
    if(!root)continue;
    if(root.matches?.(candidateSelector))normalizeElement(root);
    root.querySelectorAll(candidateSelector).forEach(normalizeElement);
  }
}
function schedule(){
  if(scheduled)return;
  scheduled=true;
  queueMicrotask(scanAll);
}
function start(){
  new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true,characterData:true});
  schedule();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();

window.OracleCompendiumPresentation=Object.freeze({parseStructured,flatten});
})();
