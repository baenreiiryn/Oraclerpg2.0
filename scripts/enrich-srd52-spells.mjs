import fs from "node:fs/promises";

const FOUNDRY="https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/spells/foundry.json";
const FILE="packages/content/data/srd-5.2/spells.json";
const REPORT="packages/content/data/srd-5.2/spells-enrichment-report.json";
const DAMAGE=new Set(["acid","bludgeoning","cold","fire","force","lightning","necrotic","piercing","poison","psychic","radiant","slashing","thunder"]);
const CONDITION=new Set(["blinded","charmed","deafened","frightened","grappled","incapacitated","invisible","paralyzed","petrified","poisoned","prone","restrained","stunned","unconscious"]);
const SKILL={acr:"acrobatics",ani:"animalHandling",arc:"arcana",ath:"athletics",dec:"deception",his:"history",ins:"insight",inv:"investigation",itm:"intimidation",med:"medicine",nat:"nature",prc:"perception",prf:"performance",rel:"religion",slt:"sleightOfHand",ste:"stealth",sur:"survival"};
const ABILITY={str:"str",dex:"dex",con:"con",int:"int",wis:"wis",cha:"cha"};
const slug=v=>String(v).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:undefined;};
const runtime=v=>{const n=num(v);return n!==undefined?{type:"constant",value:n}:{type:"formula",formula:String(v)};};
const entityFromUuid=uuid=>{const m=String(uuid??"").match(/@creature\[([^|\]]+)(?:\|[^\]]+)?\]/i);if(!m)return undefined;const name=m[1];return {canonicalId:`dnd2024:2024:monster:${slug(name)}:srd-5.2`,name,entityType:"monster"};};
const load=async url=>{const r=await fetch(url);if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json();};

function formulaPart(part={}) {
  const number=part.number??part.count; const denom=part.denomination;
  let base=number!=null&&denom!=null?`${number}d${denom}`:part.formula?String(part.formula):"";
  if(part.bonus!=null&&String(part.bonus)!=="0") base += `${String(part.bonus).startsWith("-")?"":" + "}${part.bonus}`;
  return base.trim();
}
function targetOf(t) {
  if(!t)return undefined;
  const affects=t.affects??{}; const template=t.template;
  const type=affects.type==="creature"?"creature":affects.type==="object"?"object":affects.type==="self"?"self":template?"point":"special";
  const out={type};
  if(affects.count!=null){const n=num(affects.count);out.count=n!==undefined?n:{formula:String(affects.count)};}
  if(template){const shape=template.type??"special";out.area={shape,...(template.size!=null?{size:{value:num(template.size),unit:template.units==="mi"?"mile":"ft"}}:{}),...(template.width!=null?{width:{value:num(template.width),unit:"ft"}}:{}),...(template.height!=null?{height:{value:num(template.height),unit:"ft"}}:{})};}
  return out;
}
function rangeOf(r){if(!r)return undefined;const units=r.units==="mi"?"mile":r.units==="ft"?"ft":r.units==="touch"?"touch":r.units==="self"?"self":r.units==="sight"?"sight":r.units==="any"?"unlimited":"special";return {normal:{...(num(r.value)!==undefined?{value:num(r.value)}:{}),unit:units}};}
function durationOf(d){if(!d)return undefined;const value=num(d.value);const unit=d.units==="round"?"round":d.units==="minute"?"minute":d.units==="hour"?"hour":d.units==="day"?"day":undefined;return unit?{type:"timed",...(value!==undefined?{value}:{}),unit}:{type:"special"};}
function damageOf(d){if(!d?.parts)return undefined;return d.parts.map(p=>{const types=(p.types??[]).filter(x=>DAMAGE.has(x));const formula=formulaPart(p);return {...(formula?{formula}:{}),...(types.length===1?{damageType:types[0]}:{}),...(types.length>1?{damageTypes:types,chooseDamageType:true}:{}),...(p.scaling?{scaling:{type:"spellSlotLevel",...(p.scaling.formula?{formula:String(p.scaling.formula)}:{}),...(p.scaling.number!=null?{formula:`+${p.scaling.number} dice/slot`}:{})}}:{})};});}
function healingOf(h){if(!h)return undefined;const formula=h.custom?.formula??(h.number&&h.denomination?`${h.number}d${h.denomination}${h.bonus?` + ${h.bonus}`:""}`:h.bonus??undefined);return formula?[{formula:String(formula),type:(h.types??[]).includes("temphp")?"temporaryHp":"healing",...(h.scaling?{scaling:{type:"spellSlotLevel",formula:String(h.scaling.formula??h.scaling.number??"")}}:{})}]:undefined;}
function transformData(activity,index){const profile=activity.profiles?.[0];const all=[];if(profile?.types?.length)all.push({type:"creatureType",creatureTypes:profile.types});if(profile?.cr!=null)all.push({type:"comparison",left:{type:"runtime",path:"candidate.challengeRating"},operator:"lte",right:{type:"constant",value:Number(profile.cr)}});if(profile?.sizes?.length)all.push({type:"size",sizes:profile.sizes.map(x=>x==="sm"?"small":x==="med"?"medium":x==="lg"?"large":x)});const keep=activity.settings?.keep??[];return {id:`transform-${index+1}`,source:{type:"entityChoice",entityType:"monster",...(all.length?{filter:all.length===1?all[0]:{type:"and",all}}:{})},statistics:{default:"replace",...(keep.length?{retain:keep}:{} )},creatureType:{mode:keep.includes("type")?"retain":"replace"},spellcasting:{allowed:keep.includes("spells")},...(activity.settings?.tempFormula?{tempHp:{type:"formula",formula:String(activity.settings.tempFormula)}}:{})};}
function summonProfiles(profiles=[]){return profiles.map((p,i)=>({id:`profile-${i+1}`,...(p.name?{name:p.name}:{}),...(entityFromUuid(p.uuid)?{entity:entityFromUuid(p.uuid)}:{}),...(p.count!=null?{count:runtime(p.count)}:{}),...(p.level?.min!=null?{predicate:{type:"comparison",left:{type:"runtime",path:"spell.slotLevel"},operator:"gte",right:{type:"constant",value:Number(p.level.min)}}}:{})}));}
function effectsFor(activity, foundrySpell, unhandled) {
  if(!activity.effects?.length)return undefined; const lookup=new Map((foundrySpell.effects??[]).map(e=>[e.foundryId,e])); const effects=[];
  for(const ref of activity.effects){const e=lookup.get(ref.foundryId);if(!e)continue;const modifiers=[];const conditions=[];const descriptions=[];
    for(const c of e.changes??[]){const key=c.key;const value=c.value;
      if(key==="system.traits.dr.value"&&DAMAGE.has(String(value))) modifiers.push({target:{domain:"damageResistance",damageType:String(value)},mode:"grantResistance"});
      else if(key==="system.traits.ci.value"&&CONDITION.has(String(value))) conditions.push({action:"immunity",conditions:[String(value)]});
      else if(/^system\.attributes\.movement\.(walk|fly|swim|burrow|climb)$/.test(key)){const mt=key.split(".").pop();modifiers.push({target:{domain:"movement",movementType:mt},mode:c.mode==="ADD"?"bonus":"set",value:runtime(value)});}
      else {unhandled.set(key,(unhandled.get(key)??0)+1);descriptions.push(`${key} ${c.mode} ${value}`);}
    }
    effects.push({id:e.foundryId??`effect-${effects.length+1}`,...(e.name?{name:e.name}:{}),...(modifiers.length?{modifiers}:{}),...(conditions.length?{conditions}:{}),...(e.description||descriptions.length?{description:[e.description,...descriptions].filter(Boolean).join(" | ")}:{})});
  }
  return effects.length?effects:undefined;
}
function mapActivity(a,i,foundrySpell,unhandled){const type=a.type==="heal"?"healing":a.type;const out={id:`foundry-${i+1}-${slug(a.name??type)}`,name:a.name??`${type[0].toUpperCase()+type.slice(1)}`,kind:type};
  if(a.activation?.type){const t=a.activation.type==="bonus"?"bonusAction":a.activation.type;out.activation={type:t,cost:1,...(a.activation.condition?{trigger:{event:"custom",description:String(a.activation.condition)}}:{})};}
  const target=targetOf(a.target);if(target)out.target=target;const range=rangeOf(a.range);if(range)out.range=range;const duration=durationOf(a.duration);if(duration)out.duration=duration;
  if(a.attack){out.attack={classification:a.attack.type?.classification==="unarmed"?"unarmed":"spell",mode:a.attack.type?.value==="melee"?"melee":a.attack.type?.value==="ranged"?"ranged":"meleeOrRanged",...(a.attack.bonus?{bonus:{formula:String(a.attack.bonus)}}:{})};}
  if(a.save?.ability?.length)out.save={ability:a.save.ability[0],dc:{type:"spellcasting"},onSuccess:a.damage?.onSave==="half"?"half":"special"};
  if(a.check){const assoc=a.check.associated?.[0];out.check={...(assoc?{skill:SKILL[assoc]??assoc}:{}),...(a.check.dc?.formula?{dc:{formula:String(a.check.dc.formula)}}:{})};}
  const damage=damageOf(a.damage);if(damage?.length)out.damage=damage;const healing=healingOf(a.healing);if(healing?.length)out.healing=healing;
  if(a.roll?.formula)out.rolls=[{id:"roll",...(a.roll.name?{name:a.roll.name}:{}),formula:String(a.roll.formula),purpose:"utility"}];
  const effects=effectsFor(a,foundrySpell,unhandled);if(effects)out.effects=effects;
  if(type==="summon"){const profiles=summonProfiles(a.profiles);if(profiles.length)out.summonProfiles=profiles;if(a.bonuses)out.summonScaling=Object.entries(a.bonuses).map(([k,v])=>({target:k==="ac"?"armorClass":k==="hd"?"hitDice":k==="hp"?"hitPoints":k,formula:String(v)}));if(a.match)out.summonMatch=Object.entries(a.match).filter(([,v])=>v).map(([k])=>k);}
  if(type==="transform")out.transformation=transformData(a,i);
  if(a.restrictions)out.predicates=[{type:"hasTag",tags:[a.restrictions.type,...(a.restrictions.categories??[]),...(a.restrictions.allowMagical?["allowMagical"]:[])].filter(Boolean)}];
  const handled=new Set(["type","activation","healing","effects","name","target","img","range","attack","damage","save","profiles","transform","settings","match","duration","roll","bonuses","restrictions","check","description"]);
  for(const key of Object.keys(a))if(!handled.has(key))unhandled.set(`activity.${key}`,(unhandled.get(`activity.${key}`)??0)+1);
  if(a.description)out.description=String(a.description);
  return out;}

const [compendium,foundry]=await Promise.all([JSON.parse(await fs.readFile(FILE,"utf8")),load(FOUNDRY)]);
const enrich=new Map((foundry.spell??[]).filter(s=>s.source==="XPHB").map(s=>[s.name,s]));const unhandled=new Map();let enrichedSpells=0,addedActivities=0;
for(const record of compendium.items){const f=enrich.get(record.name);if(!f?.activities?.length)continue;const mapped=f.activities.map((a,i)=>mapActivity(a,i,f,unhandled));record.data.activities=mapped;record.metadata.tags=[...new Set([...(record.metadata.tags??[]),"foundry-enriched"])];enrichedSpells++;addedActivities+=mapped.length;}
await fs.writeFile(FILE,JSON.stringify(compendium,null,2)+"\n");
const report={generatedAt:new Date().toISOString(),enrichedSpells,addedActivities,unhandledEffectOrActivityFields:Object.fromEntries([...unhandled.entries()].sort((a,b)=>b[1]-a[1]))};
await fs.writeFile(REPORT,JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report,null,2));