(()=>{
'use strict';
const key='oraclerpg.campaignDraft.v1';
const read=()=>{try{const d=JSON.parse(localStorage.getItem(key)||'{}');return d&&typeof d==='object'?d:{}}catch{return{}}};
const stable=v=>{try{return JSON.stringify(v??null)}catch{return String(v)}};
const fingerprint=d=>({
 system:d.systemId||'',tone:stable([d.toneId||'',d.customTone||'']),classId:d.classId||'',
 species:stable([d.speciesId||'',d.speciesVariantId||'',d.speciesSize||'',d.speciesResistance||'',d.speciesChoices||{}]),
 background:stable([d.backgroundId||'',d.backgroundChoices||{}]),abilities:stable(d.abilityScores||{}),
 proficiencies:stable([d.skillProficiencyAllocations||[],d.skillProficiencyLevels||{}]),
 spells:stable([d.spellSelections||{},d.spellcastingAbilities||{}]),equipment:stable(d.equipment||{}),
 history:stable(d.characterHistory?.text||''),identity:stable(d.characterIdentity||{}),level:stable(d.startingLevelProgression||{})
});
let last=fingerprint(read()),guard=false;
const invalidate=(patch,names)=>{for(const name of names)patch[name]=false;patch.creationReviewComplete=false;patch.creationComplete=false};
function apply(next){if(guard)return;const now=fingerprint(next),patch={};
 if(now.system!==last.system){invalidate(patch,['speciesComplete','backgroundComplete','abilityComplete','proficienciesComplete','spellsComplete','equipmentComplete','historyComplete','startingLevelComplete'])}
 if(now.tone!==last.tone)invalidate(patch,['historyComplete']);
 if(now.classId!==last.classId)invalidate(patch,['proficienciesComplete','spellsComplete','equipmentComplete','historyComplete','startingLevelComplete']);
 if(now.species!==last.species)invalidate(patch,['proficienciesComplete','spellsComplete','historyComplete','startingLevelComplete']);
 if(now.background!==last.background)invalidate(patch,['abilityComplete','proficienciesComplete','spellsComplete','equipmentComplete','historyComplete','startingLevelComplete']);
 if(now.abilities!==last.abilities)invalidate(patch,['startingLevelComplete']);
 if(now.proficiencies!==last.proficiencies)patch.creationReviewComplete=false;
 if(now.spells!==last.spells)invalidate(patch,['startingLevelComplete']);
 if(now.equipment!==last.equipment)invalidate(patch,['startingLevelComplete']);
 if(now.history!==last.history)patch.creationReviewComplete=false;
 if(now.identity!==last.identity)patch.creationReviewComplete=false;
 if(now.level!==last.level)patch.creationReviewComplete=false;
 last=now;
 if(!Object.keys(patch).length)return;
 const merged={...next,...patch,version:1,updatedAt:new Date().toISOString()};guard=true;try{localStorage.setItem(key,JSON.stringify(merged))}catch{}window.dispatchEvent(new CustomEvent('oraclerpg:campaigndraft',{detail:merged}));last=fingerprint(merged);guard=false;
}
window.addEventListener('oraclerpg:campaigndraft',e=>apply(e.detail&&typeof e.detail==='object'?e.detail:read()));
})();
