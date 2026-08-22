(()=>{
'use strict';
const KEY='oraclerpg.campaignDraft.v1';
function clearFree(){try{const d=JSON.parse(localStorage.getItem(KEY)||'{}');if(Array.isArray(d.freeLanguages)&&d.freeLanguages.length){d.freeLanguages=[];d.updatedAt=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(d))}}catch{}}
function clean(){document.querySelectorAll('.language-source-tag').forEach(el=>{const t=el.textContent.trim().toLowerCase();if(t==='sistema'||t==='system')el.remove()});document.querySelectorAll('.language-subhead,.language-group,.language-choice').forEach(el=>{const text=el.textContent.toLowerCase();if(/idiomas adicionais|additional languages|escolhas livres|free languages/.test(text)){const section=el.closest('.language-choice,.language-group,section,div');if(section)section.hidden=true}})}
const obs=new MutationObserver(clean);obs.observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('oraclerpg:campaigndraft',()=>{clearFree();setTimeout(clean,0)});clearFree();clean();
})();
