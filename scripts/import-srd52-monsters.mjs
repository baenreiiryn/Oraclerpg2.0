import fs from "node:fs/promises";
import path from "node:path";

const SOURCE_URL = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/bestiary/bestiary-xmm.json";
const OUT_DIR = "packages/content/data/srd-5.2";
const OUT_PATH = path.join(OUT_DIR, "monsters.json");
const REPORT_PATH = path.join(OUT_DIR, "monsters-import-report.json");
const ALIASES_PATH = path.join(OUT_DIR, "monster-feature-aliases.json");
const FEATURES_PATH = path.join(OUT_DIR, "monster-features.json");

const slug = v => String(v).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const textOf = v => v == null ? "" : typeof v === "string" ? v : Array.isArray(v) ? v.map(textOf).filter(Boolean).join(" ") : typeof v === "object" ? (Array.isArray(v.entries) ? [v.name,...v.entries.map(textOf)].filter(Boolean).join(" ") : Object.values(v).map(textOf).filter(Boolean).join(" ")) : String(v);
const canonicalId = name => `dnd2024:2024:monster:${slug(name)}:srd-5.2`;
const abilityIds = ["str","dex","con","int","wis","cha"];
const sections = [["trait","trait"],["action","action"],["bonus","bonusAction"],["reaction","reaction"],["legendary","legendaryAction"]];

function cleanName(name="") { return String(name).replace(/\s*\{@recharge(?:\s+\d+)?\}\s*/gi," ").replace(/\s*\(Costs?\s+\d+\s+Actions?\)\s*/gi," ").replace(/\s*\(\d+\/Day(?:[^)]*)\)\s*/gi," ").replace(/\s+/g," ").trim(); }
function aliasFor(resolver, rawName, section) { return resolver.aliases?.[`${rawName}|${section}`] ?? resolver.aliases?.[`${cleanName(rawName)}|${section}`]; }
function parseSize(size) { const x=Array.isArray(size)?size[0]:size; return ({T:"tiny",S:"small",M:"medium",L:"large",H:"huge",G:"gargantuan"})[x] ?? "medium"; }
function parseType(type) { const x=typeof type === "string"?type:type?.type; return ({aberration:"aberration",beast:"beast",celestial:"celestial",construct:"construct",dragon:"dragon",elemental:"elemental",fey:"fey",fiend:"fiend",giant:"giant",humanoid:"humanoid",monstrosity:"monstrosity",ooze:"ooze",plant:"plant",undead:"undead"})[x] ?? "monstrosity"; }
function parseAlignment(a) { if (!a) return undefined; const map={L:"Lawful",N:"Neutral",C:"Chaotic",G:"Good",E:"Evil",U:"Unaligned",A:"Any Alignment"}; return (Array.isArray(a)?a:[a]).map(x=>typeof x==="string"?(map[x]??x):textOf(x)).join(" "); }
function parseAc(ac) { return (Array.isArray(ac)?ac:[ac]).filter(x=>x!=null).map(x=> typeof x === "number" ? {value:x} : {value:Number(x.ac??10), type:/natural/i.test(textOf(x.from))?"natural":undefined, condition:x.condition}); }
function parseSpeed(speed) { const out=[]; for (const [type,v] of Object.entries(speed??{})) { if (type==="canHover" || type==="alternate") continue; const raw=typeof v==="number"?v:v?.number; if (typeof raw!=="number") continue; out.push({type:type==="walk"?"walk":type,speed:raw,unit:"ft",...(type==="fly" && (speed.canHover||v?.condition?.includes("hover"))?{hover:true}:{}),...(typeof v==="object"&&v.condition?{condition:v.condition}:{})}); } return out; }
function parseHp(hp) { return {average:Number(hp?.average??1),formula:String(hp?.formula??String(hp?.average??1))}; }
function parseSenses(senses=[]) { return senses.map(s=>{ const m=String(s).match(/^(blindsight|darkvision|tremorsense|truesight)\s+(\d+)\s*ft\.?/i); return m?{type:m[1].toLowerCase(),range:Number(m[2]),unit:"ft"}:{type:"special",condition:String(s)}; }); }
function parseProfs(obj={}) { return Object.entries(obj).map(([key,val])=>({...(abilityIds.includes(key)?{ability:key}:{skill:key}),bonus:typeof val==="number"?val:String(val)})); }
function parseDamageList(list=[]) { const allowed=new Set(["acid","bludgeoning","cold","fire","force","lightning","necrotic","piercing","poison","psychic","radiant","slashing","thunder"]); const out=[]; for(const x of list){const s=typeof x==="string"?x:textOf(x); for(const d of allowed) if(new RegExp(`\\b${d}\\b`,`i`).test(s)) out.push(d);} return [...new Set(out)]; }
function parseConditions(list=[]) { return [...new Set(list.flatMap(x=>typeof x==="string"?[x.toLowerCase()]:Array.isArray(x?.conditionImmune)?x.conditionImmune.map(String):[]))]; }
function crNumber(cr) { const raw=typeof cr==="object"?cr.cr:cr; if(raw==null)return 0; if(String(raw).includes("/")){const [a,b]=String(raw).split("/").map(Number);return a/b;} return Number(raw); }
function featureInstances(monster,resolver,definitions){ const out=[]; for(const [src,section] of sections){ for(const f of monster[src]??[]){ const alias=aliasFor(resolver,f.name??"",section); if(!alias) throw new Error(`Unresolved feature: ${monster.name} :: ${f.name} [${section}]`); const def=definitions.get(alias.definitionCanonicalId); if(!def) throw new Error(`Missing feature definition ${alias.definitionCanonicalId}`); out.push({definition:{id:def.canonicalId,canonicalId:def.canonicalId,name:def.name},name:cleanName(f.name)||def.name,category:section,parameters:alias.parameterHints??{},activities:def.data?.activities??[],text:{description:textOf(f.entries??f)}}); } } return out; }

await fs.mkdir(OUT_DIR,{recursive:true});
const [source,resolver,compendium]=await Promise.all([fetch(SOURCE_URL).then(r=>{if(!r.ok)throw new Error(`Source fetch failed ${r.status}`);return r.json();}),fs.readFile(ALIASES_PATH,"utf8").then(JSON.parse),fs.readFile(FEATURES_PATH,"utf8").then(JSON.parse)]);
const definitions=new Map((compendium.items??[]).map(x=>[x.canonicalId,x]));
const monsters=(source.monster??[]).filter(m=>m.srd52===true || typeof m.srd52==="string");
const items=monsters.map(m=>({id:canonicalId(m.name),canonicalId:canonicalId(m.name),entityType:"monster",name:m.name,system:{gameSystem:"dnd2024",rulesVersion:"2024"},source:{sourceId:"srd-5.2",book:"XMM",license:"CC-BY-4.0",licenseUrl:"https://creativecommons.org/licenses/by/4.0/"},provenance:{origin:"imported",provider:"5etools",sourceKey:`XMM:${m.name}`,adapterVersion:"0.1.0",mapperVersion:"0.1.0"},schemaVersion:1,data:{creatureType:parseType(m.type),creatureSubtype:typeof m.type==="object"?textOf(m.type.tags):undefined,size:parseSize(m.size),alignment:parseAlignment(m.alignment),challengeRating:crNumber(m.cr),proficiencyBonus:m.pbNote?undefined:(typeof m.pb==="number"?m.pb:undefined),abilities:Object.fromEntries(abilityIds.map(a=>[a,Number(m[a]??10)])),armorClass:parseAc(m.ac),hitPoints:parseHp(m.hp),movement:parseSpeed(m.speed),savingThrows:parseProfs(m.save),skills:parseProfs(m.skill),passivePerception:m.passive,senses:parseSenses(m.senses),languages:(m.languages??[]).map(String),vulnerabilities:parseDamageList(m.vulnerable),resistances:parseDamageList(m.resist),damageImmunities:parseDamageList(m.immune),conditionImmunities:parseConditions(m.conditionImmune),features:featureInstances(m,resolver,definitions),legendaryActionUses:m.legendaryActions,legendaryResistanceUses:undefined,text:{description:textOf(m.entries??[]) }},relations:[],metadata:{tags:["srd-5.2","monster",parseType(m.type)]}}));
const out={format:"oraclerpg-compendium",version:1,contentSource:"srd-5.2",entityType:"monster",count:items.length,items};
await fs.writeFile(OUT_PATH,JSON.stringify(out,null,2)+"\n");
const featureCount=items.reduce((n,x)=>n+(x.data.features?.length??0),0);
await fs.writeFile(REPORT_PATH,JSON.stringify({generatedAt:new Date().toISOString(),source:SOURCE_URL,srd52Monsters:monsters.length,importedMonsters:items.length,materializedFeatureInstances:featureCount,featureDefinitionCount:definitions.size},null,2)+"\n");
console.log(JSON.stringify({monsters:items.length,features:featureCount,definitions:definitions.size},null,2));
