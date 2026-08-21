(()=>{
'use strict';
const root=document.querySelector('[data-oracle-flow]');if(!root||!window.OracleSystems)return;
const isEn=document.documentElement.lang==='en',locale=isEn?'en':'pt',systems=window.OracleSystems.all;
const copy=isEn?{
  open:'Open',select:'Select',coming:'More systems can be added here later.',saved:'Initial campaign setup saved. The next creation step can use this draft.',nameMissing:'Enter a campaign name to continue.'
}:{
  open:'Abrir',select:'Selecionar',coming:'Novos sistemas poderão ser adicionados aqui depois.',saved:'Configuração inicial da campanha salva. A próxima etapa de criação poderá usar este rascunho.',nameMissing:'Digite o nome da campanha para continuar.'
};
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function systemCard(system,selectable=false){
  const edition=system.edition?.[locale]||'',description=system.description?.[locale]||'';
  return `<button type="button" class="system-card" data-system-id="${esc(system.id)}" ${system.available?'':'disabled'}><span class="system-glyph" aria-hidden="true">${esc(system.glyph||'RPG')}</span><span class="system-copy"><strong>${esc(system.name)}</strong><span>${esc(edition)}</span><small>${esc(description)}</small></span><span class="system-arrow" aria-hidden="true">${selectable?'○':'›'}</span></button>`;
}
function renderSystems(container,selectable=false){container.innerHTML=systems.map(system=>systemCard(system,selectable)).join('');}
function initCompendium(){
  const list=root.querySelector('[data-system-list]');if(!list)return;renderSystems(list,false);
  list.addEventListener('click',event=>{const button=event.target.closest('[data-system-id]');if(!button)return;const url=window.OracleSystems.compendiumUrl(button.dataset.systemId,locale);if(url)location.href=url;});
}
const toneCatalog=isEn?[
  ['heroic','Heroic adventure','Hopeful, epic, and larger than life'],['dark','Dark fantasy','Dangerous, harsh, and morally gray'],['horror','Horror','Tension, dread, and vulnerability'],['intrigue','Intrigue & mystery','Secrets, politics, and investigation'],['exploration','Exploration','Discovery, travel, and the unknown'],['light','Lighthearted adventure','Energetic, charming, and playful'],['custom','Custom','Define the tone in your own words']
]:[
  ['heroic','Aventura heroica','Esperançosa, épica e grandiosa'],['dark','Fantasia sombria','Perigosa, dura e moralmente cinzenta'],['horror','Horror','Tensão, medo e vulnerabilidade'],['intrigue','Intriga e mistério','Segredos, política e investigação'],['exploration','Exploração','Descoberta, viagem e desconhecido'],['light','Aventura leve','Energética, charmosa e descontraída'],['custom','Personalizado','Defina o tom com suas próprias palavras']
];
function initCampaign(){
  const systemList=root.querySelector('[data-system-list]'),toneGrid=root.querySelector('[data-tone-grid]'),nameInput=root.querySelector('[data-campaign-name]'),customWrap=root.querySelector('[data-custom-tone-wrap]'),customInput=root.querySelector('[data-custom-tone]'),continueButton=root.querySelector('[data-continue]'),status=root.querySelector('[data-flow-status]');
  if(!systemList||!toneGrid||!nameInput||!continueButton)return;
  let selectedSystem='',selectedTone='';
  renderSystems(systemList,true);
  toneGrid.innerHTML=toneCatalog.map(([id,name,description])=>`<button type="button" class="tone-option" data-tone="${id}"><strong>${esc(name)}</strong><small>${esc(description)}</small></button>`).join('');
  try{const draft=JSON.parse(localStorage.getItem('oraclerpg.campaignDraft.v1')||'null');if(draft){selectedSystem=window.OracleSystems.get(draft.systemId)?.id||'';selectedTone=toneCatalog.some(([id])=>id===draft.toneId)?draft.toneId:'';nameInput.value=typeof draft.name==='string'?draft.name:'';if(customInput&&typeof draft.customTone==='string')customInput.value=draft.customTone;}}
  catch{}
  const sync=()=>{
    systemList.querySelectorAll('[data-system-id]').forEach(button=>{const active=button.dataset.systemId===selectedSystem;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',active?'true':'false');const arrow=button.querySelector('.system-arrow');if(arrow)arrow.textContent=active?'✓':'○';});
    toneGrid.querySelectorAll('[data-tone]').forEach(button=>{const active=button.dataset.tone===selectedTone;button.classList.toggle('selected',active);button.setAttribute('aria-pressed',active?'true':'false');});
    if(customWrap)customWrap.hidden=selectedTone!=='custom';
    const customOk=selectedTone!=='custom'||Boolean(customInput?.value.trim());
    continueButton.disabled=!(selectedSystem&&nameInput.value.trim()&&selectedTone&&customOk);
  };
  systemList.addEventListener('click',event=>{const button=event.target.closest('[data-system-id]');if(!button||button.disabled)return;selectedSystem=button.dataset.systemId;status.textContent='';sync();});
  toneGrid.addEventListener('click',event=>{const button=event.target.closest('[data-tone]');if(!button)return;selectedTone=button.dataset.tone;status.textContent='';sync();});
  nameInput.addEventListener('input',()=>{status.textContent='';sync();});customInput?.addEventListener('input',sync);
  continueButton.addEventListener('click',()=>{
    const name=nameInput.value.trim();if(!name){status.textContent=copy.nameMissing;return;}
    const previous=(()=>{try{const value=JSON.parse(localStorage.getItem('oraclerpg.campaignDraft.v1')||'null');return value&&typeof value==='object'?value:{}}catch{return{}}})();
    const draft={...previous,version:1,systemId:selectedSystem,name,toneId:selectedTone,customTone:selectedTone==='custom'?(customInput?.value.trim()||''):'',updatedAt:new Date().toISOString()};
    try{localStorage.setItem('oraclerpg.campaignDraft.v1',JSON.stringify(draft));}catch{}
    status.textContent=copy.saved;status.classList.add('ok');window.dispatchEvent(new CustomEvent('oraclerpg:campaigndraft',{detail:draft}));
  });
  sync();
}
function loadCampaignHistoryStep(){
  if(document.querySelector('script[data-oracle-campaign-history-bootstrap]'))return;
  const script=document.createElement('script');
  script.src='/campaign-history-bootstrap.js';
  script.async=false;
  script.dataset.oracleCampaignHistoryBootstrap='true';
  document.head.appendChild(script);
}
if(root.dataset.oracleFlow==='compendium')initCompendium();
if(root.dataset.oracleFlow==='campaign'){initCampaign();loadCampaignHistoryStep();}
})();