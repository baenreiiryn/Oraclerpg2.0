(()=>{
'use strict';
const pt=document.documentElement.lang!=='en';
const viewer=document.getElementById('viewer');
const visual=document.getElementById('viewerVisual');
const raw=document.getElementById('viewerJson');
if(!viewer||!visual||!raw)return;

function arr(value){return Array.isArray(value)?value:(value==null?[]:[value])}
function choiceLabel(choice){
  const types=arr(choice?.entityTypes).map(value=>String(value).toLowerCase());
  if(types.includes('subclass'))return pt?'Escolha de Subclasse':'Subclass Choice';
  return '';
}
function patchProgression(){
  if(!viewer.classList.contains('open'))return;
  let record;
  try{record=JSON.parse(raw.textContent||'{}')}catch{return}
  const entity=record?.entity||record;
  if(entity?.entityType!=='class')return;
  const advancement=arr(entity?.data?.advancement).filter(Boolean);
  const cards=[...visual.querySelectorAll('.level-card')];
  if(!advancement.length||!cards.length)return;
  cards.forEach((card,index)=>{
    const level=advancement[index];
    if(!level)return;
    const featureNode=card.querySelector('.level-features');
    if(!featureNode)return;
    const labels=[...new Set(arr(level.choices).map(choiceLabel).filter(Boolean))];
    if(!labels.length)return;
    const grants=arr(level.grants);
    const grantNames=grants.map(grant=>grant?.entity?.name||grant?.name||grant?.type).filter(Boolean);
    const expected=[...grantNames,...labels].join(' · ');
    if(featureNode.textContent!==expected)featureNode.textContent=expected;
    card.dataset.hasSubclassChoice='true';
  });
}

let scheduled=false;
function schedulePatch(){
  if(scheduled)return;
  scheduled=true;
  queueMicrotask(()=>{scheduled=false;patchProgression()});
}
new MutationObserver(schedulePatch).observe(viewer,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class']});
schedulePatch();
})();