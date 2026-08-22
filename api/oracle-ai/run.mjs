import { requireSession } from '../_lib/auth-session.mjs';
import { resolveByokCredential } from '../_lib/byok-resolver.mjs';

const allowedProviders=new Set(['openai','gemini','nvidia','openrouter']);
function fail(statusCode,message){const e=new Error(message);e.statusCode=statusCode;throw e}
function cleanBase(v){return String(v||'').trim().replace(/\/+$/,'')}
function parseVisionInput(value){if(typeof value!=='string')return null;try{const v=JSON.parse(value);return v&&v.image?.dataUrl?v:null}catch{return null}}
function outputOf(data){return data?.choices?.[0]?.message?.content??data?.output_text??data?.output??''}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed.'});
 try{
  const session=await requireSession(req),body=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{}),provider=String(body.provider||'').trim();
  if(!allowedProviders.has(provider))fail(400,'Selecione um provedor de IA configurado nas Configurações da API.');
  const credential=await resolveByokCredential(session.user.id,provider);if(!credential?.secret)fail(400,'O provedor selecionado não possui uma chave protegida configurada.');
  const baseUrl=cleanBase(credential.baseUrl),vision=parseVisionInput(body.input),model=String((vision&&credential.visionModelId)||credential.modelId||'').trim();if(!baseUrl||!model)fail(400,vision?'Configure também o modelo de visão deste provedor.':'Configure a URL base e o modelo deste provedor.');
  const system=String(body.system||'Você é o OracleRPG. Responda de forma útil e preserve as regras fornecidas.'),input=String(body.input||''),messages=[{role:'system',content:system}];
  if(vision){const instruction=String(vision.instruction||'Descreva somente o que é visível na imagem.');messages.push({role:'user',content:[{type:'text',text:`${instruction}\nContexto: ${JSON.stringify(vision.context||{})}\nIdioma: ${vision.language||'pt-BR'}`},{type:'image_url',image_url:{url:vision.image.dataUrl}}]})}else messages.push({role:'user',content:input});
  const response=await fetch(`${baseUrl}/chat/completions`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${credential.secret}`},body:JSON.stringify({model,messages,temperature:Number.isFinite(Number(body.temperature))?Number(body.temperature):0.7,max_tokens:Math.min(4000,Math.max(64,Number(body.maxOutputTokens)||1200))})});
  const data=await response.json().catch(()=>({}));if(!response.ok)fail(502,data?.error?.message||data?.message||`O provedor de IA respondeu HTTP ${response.status}.`);const output=String(outputOf(data)||'').trim();if(!output)fail(502,'O provedor de IA não retornou conteúdo.');
  return res.status(200).json({ok:true,output,provider,model});
 }catch(error){console.error('Oracle AI runtime error:',error?.message||error);return res.status(error?.statusCode||500).json({ok:false,error:error?.message||'Falha ao processar a operação de IA.'})}
}
