(()=>{
'use strict';
const ACTIVE='oraclerpg.ai.activeProvider';
async function authHeaders(){if(!window.OracleAuth?.getApiAuthHeaders)throw new Error('AI_AUTH_UNAVAILABLE');return window.OracleAuth.getApiAuthHeaders()}
async function runOperation(request={}){const provider=String(request.provider||localStorage.getItem(ACTIVE)||'oracle');if(provider==='oracle')throw new Error('AI_PROVIDER_UNCONFIGURED');const headers={...(await authHeaders()),'Content-Type':'application/json'};const response=await fetch('/api/oracle-ai/run',{method:'POST',headers,credentials:'same-origin',cache:'no-store',body:JSON.stringify({...request,provider})});const data=await response.json().catch(()=>({}));if(!response.ok){const error=new Error(data.error||`AI_HTTP_${response.status}`);error.status=response.status;throw error}return data}
window.OracleAI=Object.freeze({runOperation,run:runOperation});window.OracleAi=window.OracleAI;
})();
