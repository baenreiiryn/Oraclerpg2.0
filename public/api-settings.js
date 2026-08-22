(() => {
  const ACTIVE = 'oraclerpg.ai.activeProvider';
  const definitions = {
    oracle: { label:'Oracle AI', note:'Padrão do OracleRPG', baseUrl:'', model:'' },
    openai: { label:'OpenAI', note:'API personalizada', baseUrl:'https://api.openai.com/v1', model:'' },
    gemini: { label:'Gemini', note:'Google AI', baseUrl:'https://generativelanguage.googleapis.com/v1beta/openai', model:'' },
    nvidia: { label:'NVIDIA NIM', note:'Texto + visão separados', baseUrl:'https://integrate.api.nvidia.com/v1', model:'', visionModel:'' },
    openrouter: { label:'OpenRouter', note:'Múltiplos modelos', baseUrl:'https://openrouter.ai/api/v1', model:'' }
  };

  const $ = id => document.getElementById(id);
  const providers = $('providers');
  const form = $('form');
  const providerName = $('providerName');
  const baseUrl = $('baseUrl');
  const model = $('model');
  const visionModel = $('visionModel');
  const credential = $('credential');
  const status = $('status');
  const credentialState = $('credentialState');
  const keyField = $('keyField');
  const baseField = $('baseField');
  const modelField = $('modelField');
  const visionModelField = $('visionModelField');
  const saveButton = $('save');
  const clearButton = $('clear');

  let active = localStorage.getItem(ACTIVE) || 'oracle';
  let saved = {};

  async function authHeaders() {
    if (!window.OracleAuth?.getApiAuthHeaders) throw new Error('Faça login para alterar uma chave de API.');
    return window.OracleAuth.getApiAuthHeaders();
  }

  async function request(method, body) {
    const headers = { ...(await authHeaders()) };
    if (body) headers['Content-Type'] = 'application/json';
    const response = await fetch('/api/ai/credentials', {
      method,
      headers,
      cache: 'no-store',
      credentials: 'same-origin',
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Não foi possível salvar a configuração.');
    return data;
  }

  function renderButtons() {
    providers.innerHTML = '';
    Object.entries(definitions).forEach(([id, def]) => {
      const configured = Boolean(saved[id]?.hasCredential);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'provider' + (id === active ? ' active' : '') + (configured ? ' configured' : '');
      button.innerHTML = `<strong>${def.label}</strong><small>${configured ? 'Chave protegida salva' : def.note}</small>`;
      button.addEventListener('click', () => {
        active = id;
        localStorage.setItem(ACTIVE, id);
        renderButtons();
        loadForm();
      });
      providers.appendChild(button);
    });
  }

  function loadForm() {
    const def = definitions[active];
    const data = saved[active] || {};
    providerName.value = def.label;
    baseUrl.value = data.baseUrl ?? def.baseUrl;
    model.value = data.model ?? def.model;
    visionModel.value = data.visionModel ?? def.visionModel ?? '';
    credential.value = '';
    const oracle = active === 'oracle';
    baseField.classList.toggle('hidden', oracle);
    modelField.classList.toggle('hidden', oracle);
    keyField.classList.toggle('hidden', oracle);
    visionModelField.classList.toggle('hidden', active !== 'nvidia');
    clearButton.disabled = oracle || !data.hasCredential;
    saveButton.disabled = oracle;
    credentialState.textContent = data.hasCredential
      ? 'Uma chave protegida já está salva. Cole outra somente para substituí-la.'
      : 'A chave será criptografada no servidor e não será exibida novamente.';
    status.textContent = oracle ? 'Oracle AI está selecionado como provedor padrão.' : '';
    status.className = 'status';
  }

  async function loadSaved() {
    status.textContent = 'Carregando configurações protegidas…';
    try {
      const data = await request('GET');
      saved = Object.fromEntries((data.providers || []).map(item => [item.provider, item]));
      status.textContent = '';
    } catch (error) {
      saved = {};
      status.textContent = error.message;
      status.className = 'status error';
    }
    renderButtons();
    loadForm();
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (active === 'oracle') return;
    const secret = credential.value.trim();
    if (!secret) {
      status.textContent = 'Cole uma chave para salvar ou substituir a configuração.';
      status.className = 'status error';
      return;
    }
    saveButton.disabled = true;
    status.textContent = 'Protegendo e salvando a chave…';
    status.className = 'status';
    try {
      await request('PUT', {
        provider: active,
        baseUrl: baseUrl.value.trim(),
        model: model.value.trim(),
        visionModel: active === 'nvidia' ? visionModel.value.trim() : '',
        credential: secret,
      });
      credential.value = '';
      saved[active] = {
        provider: active,
        baseUrl: baseUrl.value.trim(),
        model: model.value.trim(),
        visionModel: visionModel.value.trim(),
        hasCredential: true,
      };
      localStorage.setItem(ACTIVE, active);
      renderButtons();
      loadForm();
      status.textContent = `${definitions[active].label} salvo com chave protegida.`;
      status.className = 'status ok';
      window.dispatchEvent(new CustomEvent('oraclerpg:ai-provider-change', { detail: { provider: active } }));
    } catch (error) {
      status.textContent = error.message;
      status.className = 'status error';
    } finally {
      saveButton.disabled = false;
    }
  });

  clearButton.addEventListener('click', async () => {
    if (active === 'oracle' || !saved[active]?.hasCredential) return;
    clearButton.disabled = true;
    status.textContent = 'Removendo chave protegida…';
    status.className = 'status';
    try {
      await request('DELETE', { provider: active });
      delete saved[active];
      renderButtons();
      loadForm();
      status.textContent = 'Configuração personalizada removida.';
      status.className = 'status ok';
    } catch (error) {
      status.textContent = error.message;
      status.className = 'status error';
    } finally {
      clearButton.disabled = false;
    }
  });

  $('toggleKey').addEventListener('click', event => {
    credential.type = credential.type === 'password' ? 'text' : 'password';
    event.currentTarget.textContent = credential.type === 'password' ? 'Mostrar' : 'Ocultar';
  });

  renderButtons();
  loadForm();
  loadSaved();
})();
