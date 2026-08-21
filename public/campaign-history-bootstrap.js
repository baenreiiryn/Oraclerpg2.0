(()=>{
'use strict';
const root=document.querySelector('[data-oracle-flow="campaign"]');if(!root)return;
const en=document.documentElement.lang==='en';
const stepper=root.querySelector('[data-stepper]');
if(!stepper)return;
if(!document.querySelector('link[data-oracle-campaign-history]')){
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href='/campaign-history.css';
  link.dataset.oracleCampaignHistory='true';
  document.head.appendChild(link);
}
if(!root.querySelector('[data-step-target="history"]')){
  stepper.insertAdjacentHTML('beforeend',en?`<button type="button" class="wizard-step" data-step-target="history" disabled><span class="wizard-step-number">9</span><span class="wizard-step-copy"><strong>History</strong><small data-step-summary="history">Write character history</small></span></button>`:`<button type="button" class="wizard-step" data-step-target="history" disabled><span class="wizard-step-number">9</span><span class="wizard-step-copy"><strong>História</strong><small data-step-summary="history">Escrever história</small></span></button>`);
}
const equipmentContinue=root.querySelector('[data-equipment-continue]');
if(equipmentContinue)equipmentContinue.textContent=en?'Continue to history':'Continuar para história';
if(!root.querySelector('[data-step-panel="history"]')){
  root.insertAdjacentHTML('beforeend',en?`<section class="wizard-panel" data-step-panel="history" hidden>
    <section class="flow-intro"><p class="flow-eyebrow">Step 9</p><h1>Tell your character's story</h1><p>Write the character's origin, add a portrait, or ask Oracle to create a backstory that fits the choices made so far.</p></section>
    <section class="flow-section"><div class="flow-section-head"><h2>Character history</h2><span class="flow-step">Species · Class · Background · Tone</span></div>
      <div data-history-context></div>
      <div class="history-workspace">
        <section class="history-portrait-panel"><header class="history-panel-head"><h3>Portrait</h3><small>Optional</small></header><div class="history-portrait-body"><div class="history-portrait-frame" data-history-portrait></div><div class="history-portrait-copy"><p>Choose an image for the character. It will be resized before being stored in the campaign draft.</p><div class="history-portrait-actions"><button type="button" class="history-secondary" data-history-portrait-pick>Choose image</button><button type="button" class="history-danger" data-history-portrait-remove hidden>Remove</button></div><input type="file" accept="image/jpeg,image/png,image/webp,image/*" data-history-portrait-input hidden /></div></div></section>
        <section class="history-story-panel"><div class="history-story-toolbar"><div class="history-story-toolbar-copy"><strong>Your story</strong><small>Write freely or use AI as a starting point.</small></div><button type="button" class="history-ai-button" data-history-ai>✦ Create with AI</button></div><div class="history-text-wrap"><textarea class="history-textarea" data-history-text maxlength="12000" placeholder="Who was this character before the adventure? What did they lose, desire, fear, or seek?"></textarea></div><div class="history-ai-suggestion" data-history-ai-suggestion hidden><div class="history-ai-suggestion-head"><strong>AI suggestion</strong><span>✦</span></div><p class="history-ai-suggestion-text" data-history-ai-suggestion-text></p><div class="history-suggestion-actions"><button type="button" data-history-ai-apply>Use this story</button><button type="button" data-history-ai-dismiss>Dismiss suggestion</button></div></div></section>
      </div>
    </section>
    <footer class="flow-footer class-footer"><button class="flow-primary" type="button" data-history-continue disabled>Continue</button><p class="flow-status" data-history-status></p></footer>
  </section>`:`<section class="wizard-panel" data-step-panel="history" hidden>
    <section class="flow-intro"><p class="flow-eyebrow">Etapa 9</p><h1>Conte a história do personagem</h1><p>Escreva a origem do personagem, adicione um retrato ou peça ao Oracle para criar uma história coerente com as escolhas feitas até aqui.</p></section>
    <section class="flow-section"><div class="flow-section-head"><h2>História do personagem</h2><span class="flow-step">Espécie · Classe · Antecedente · Tom</span></div>
      <div data-history-context></div>
      <div class="history-workspace">
        <section class="history-portrait-panel"><header class="history-panel-head"><h3>Retrato</h3><small>Opcional</small></header><div class="history-portrait-body"><div class="history-portrait-frame" data-history-portrait></div><div class="history-portrait-copy"><p>Escolha uma imagem do personagem. Ela será reduzida antes de ser salva no rascunho da campanha.</p><div class="history-portrait-actions"><button type="button" class="history-secondary" data-history-portrait-pick>Escolher imagem</button><button type="button" class="history-danger" data-history-portrait-remove hidden>Remover</button></div><input type="file" accept="image/jpeg,image/png,image/webp,image/*" data-history-portrait-input hidden /></div></div></section>
        <section class="history-story-panel"><div class="history-story-toolbar"><div class="history-story-toolbar-copy"><strong>Sua história</strong><small>Escreva livremente ou use a IA como ponto de partida.</small></div><button type="button" class="history-ai-button" data-history-ai>✦ Criar com IA</button></div><div class="history-text-wrap"><textarea class="history-textarea" data-history-text maxlength="12000" placeholder="Quem era esse personagem antes da aventura? O que perdeu, deseja, teme ou procura?"></textarea></div><div class="history-ai-suggestion" data-history-ai-suggestion hidden><div class="history-ai-suggestion-head"><strong>Sugestão da IA</strong><span>✦</span></div><p class="history-ai-suggestion-text" data-history-ai-suggestion-text></p><div class="history-suggestion-actions"><button type="button" data-history-ai-apply>Usar esta história</button><button type="button" data-history-ai-dismiss>Descartar sugestão</button></div></div></section>
      </div>
    </section>
    <footer class="flow-footer class-footer"><button class="flow-primary" type="button" data-history-continue disabled>Continuar</button><p class="flow-status" data-history-status></p></footer>
  </section>`);
}
if(!document.querySelector('script[data-oracle-campaign-history-controller]')){
  const script=document.createElement('script');
  script.src='/campaign-history.js';
  script.async=false;
  script.dataset.oracleCampaignHistoryController='true';
  document.head.appendChild(script);
}
})();
