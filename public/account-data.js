(()=>{
'use strict';
const HOME_KEY='oraclerpg.homebrew.v1',INDEX_KEY='oraclerpg.campaigns.v1';
let bootPromise=null,homebrewCache=[],campaignCache=new Map();
const clone=v=>{try{return typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v))}catch{return v}};
const parse=(v,fallback)=>{try{const x=JSON.parse(v);return x??fallback}catch{return fallback}};
const whenAuth=async()=>{if(window.OracleAuth)return window.OracleAuth;await new Promise(resolve=>{let n=0;const t=setInterval(()=>{if(window.OracleAuth||n++>100){clearInterval(t);resolve()}},20)});if(!window.OracleAuth)throw new Error('Authentication client unavailable.');return window.OracleAuth};
async function request(type,id='',options={}){const auth=await whenAuth(),headers={...(await auth.getApiAuthHeaders()),...(options.headers||{})};if(options.body)headers['Content-Type']='application/json';const query=new URLSearchParams({type});if(id)query.set('id',id);const r=await fetch(`/api/account-data?${query}`,{cache:'no-store',credentials:'same-origin',...options,headers});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||`Account sync failed (${r.status})`);return data}
const stamp=v=>Date.parse(v?.updatedAt||v?.updated_at||v?.draft?.updatedAt||v?.finalizedAt||v?.createdAt||0)||0;
const idOf=v=>String(v?.id||v?.canonicalId||v?.entity?.canonicalId||'');
function localHomebrew(){const v=parse(localStorage.getItem(HOME_KEY)||'[]',[]);return Array.isArray(v)?v:[]}
function mergeHomebrew(remote,local){const m=new Map();for(const x of [...remote,...local]){const id=idOf(x);if(!id)continue;const old=m.get(id);if(!old||stamp(x)>=stamp(old))m.set(id,x)}return [...m.values()]}
function localCampaigns(){const out=new Map();for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i)||'',m=key.match(/^oraclerpg\.campaign\.(campaign-[^.]+|[^.]+)\.v1$/);if(!m)continue;const s=parse(localStorage.getItem(key)||'null',null);if(s?.id&&s?.draft)out.set(String(s.id),s)}return out}
function campaignMeta(snapshot){const d=snapshot?.draft||{},portrait=d.characterIdentity?.portrait?.dataUrl||'';return{id:String(snapshot.id),name:d.name||snapshot.name||'',characterName:d.characterIdentity?.name||d.characterName||snapshot.characterName||'',level:d.startingLevel||snapshot.startingLevel||1,systemId:d.systemId||snapshot.systemId||'',portrait,updatedAt:snapshot.updatedAt||d.updatedAt||new Date().toISOString()}}
function rebuildIndex(){const metas=[...campaignCache.values()].sort((a,b)=>stamp(b)-stamp(a)).map(campaignMeta).slice(0,50);localStorage.setItem(INDEX_KEY,JSON.stringify(metas));return metas}
async function put(type,id,payload){return request(type,id,{method:'PUT',body:JSON.stringify({type,id,payload})})}
async function bootstrap(){if(bootPromise)return bootPromise;bootPromise=(async()=>{try{
  const [homeRemote,campaignRemote]=await Promise.all([request('homebrew'),request('campaign')]);
  const remoteHome=Array.isArray(homeRemote.items?.[0]?.payload)?homeRemote.items[0].payload:[];
  const localHome=localHomebrew(),mergedHome=mergeHomebrew(remoteHome,localHome);homebrewCache=mergedHome;localStorage.setItem(HOME_KEY,JSON.stringify(mergedHome));
  if(JSON.stringify(mergedHome)!==JSON.stringify(remoteHome))await put('homebrew','library',mergedHome);
  const local=localCampaigns();for(const row of campaignRemote.items||[]){const s=row?.payload;if(!s?.id||!s?.draft)continue;const prior=local.get(String(s.id));campaignCache.set(String(s.id),prior&&stamp(prior)>stamp(s)?prior:s)}for(const [id,s] of local){const prior=campaignCache.get(id);if(!prior||stamp(s)>=stamp(prior))campaignCache.set(id,s)}
  for(const [id,s] of campaignCache){localStorage.setItem(`oraclerpg.campaign.${id}.v1`,JSON.stringify(s));const remote=(campaignRemote.items||[]).find(x=>String(x.id)===id)?.payload;if(!remote||stamp(s)>stamp(remote))await put('campaign',id,s)}
  rebuildIndex();
  window.dispatchEvent(new CustomEvent('oraclerpg:homebrew-changed',{detail:{source:'account-sync'}}));
  window.dispatchEvent(new CustomEvent('oraclerpg:campaigns-changed',{detail:{source:'account-sync'}}));
  return{homebrew:homebrewCache,campaigns:campaignCache};
}catch(error){console.error('OracleRPG account sync:',error);homebrewCache=localHomebrew();campaignCache=localCampaigns();rebuildIndex();return{homebrew:homebrewCache,campaigns:campaignCache,error}}finally{window.dispatchEvent(new CustomEvent('oracle:account-data-ready'))}})();return bootPromise}
async function saveHomebrew(list){homebrewCache=Array.isArray(list)?clone(list):[];localStorage.setItem(HOME_KEY,JSON.stringify(homebrewCache));await put('homebrew','library',homebrewCache);return homebrewCache}
async function saveCampaignSnapshot(snapshot){if(!snapshot?.id||!snapshot?.draft)throw new Error('Invalid campaign snapshot.');const id=String(snapshot.id),copy=clone(snapshot);copy.updatedAt=copy.updatedAt||new Date().toISOString();campaignCache.set(id,copy);localStorage.setItem(`oraclerpg.campaign.${id}.v1`,JSON.stringify(copy));rebuildIndex();await put('campaign',id,copy);window.dispatchEvent(new CustomEvent('oraclerpg:campaigns-changed',{detail:{id}}));return copy}
function getCampaign(id){return campaignCache.get(String(id))||parse(localStorage.getItem(`oraclerpg.campaign.${id}.v1`)||'null',null)}
async function removeCampaign(id){id=String(id||'');if(!id)return;campaignCache.delete(id);localStorage.removeItem(`oraclerpg.campaign.${id}.v1`);rebuildIndex();await request('campaign',id,{method:'DELETE',body:JSON.stringify({type:'campaign',id}),headers:{'Content-Type':'application/json'}});window.dispatchEvent(new CustomEvent('oraclerpg:campaigns-changed',{detail:{id,removed:true}}))}
window.OracleAccountData=Object.freeze({bootstrap,saveHomebrew,saveCampaignSnapshot,getCampaign,removeCampaign,ready:()=>bootPromise});
})();
