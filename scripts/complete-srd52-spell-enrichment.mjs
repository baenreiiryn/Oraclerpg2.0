import fs from "node:fs/promises";

const FOUNDRY = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/spells/foundry.json";
const FILE = "packages/content/data/srd-5.2/spells.json";
const REPORT = "packages/content/data/srd-5.2/spells-semantic-audit.json";
const DAMAGE = new Set(["acid","bludgeoning","cold","fire","force","lightning","necrotic","piercing","poison","psychic","radiant","slashing","thunder"]);
const CONDITIONS = new Set(["blinded","charmed","deafened","frightened","grappled","incapacitated","invisible","paralyzed","petrified","poisoned","prone","restrained","stunned","unconscious"]);
const SKILLS = {acr:"acrobatics",ani:"animalHandling",arc:"arcana",ath:"athletics",dec:"deception",his:"history",ins:"insight",inv:"investigation",itm:"intimidation",med:"medicine",nat:"nature",prc:"perception",per:"persuasion",prf:"performance",rel:"religion",slt:"sleightOfHand",ste:"stealth",sur:"survival"};
const load = async url => { const r=await fetch(url); if(!r.ok) throw new Error(`${url}: ${r.status}`); return r.json(); };
const canonicalFormula = raw => String(raw ?? "")
  .replaceAll("@item.level","spell.slotLevel")
  .replaceAll("@mod","spellcasting.mod")
  .replaceAll("@prof","proficiencyBonus")
  .replace(/@abilities\.([a-z]{3})\.mod/g,"$1.mod")
  .replaceAll("@attributes.spell.mod","spellcasting.mod")
  .replaceAll("@flags.dnd-players-handbook.mirrorImages","state.mirrorImages");
const rv = value => typeof value === "number" || /^[-+]?\d+(?:\.\d+)?$/.test(String(value))
  ? {type:"constant",value:Number(value)} : {type:"formula",formula:canonicalFormula(value)};
const modeOf = mode => mode === "ADD" ? "bonus" : mode === "MULTIPLY" ? "multiply" : mode === "UPGRADE" ? "minimum" : "set";
const rollMode = value => Number(value) < 0 ? "disadvantage" : "advantage";
const duration = d => {
  if(!d) return undefined;
  if(d.rounds) return {type:"timed",value:{type:"constant",value:Number(d.rounds)},unit:"round"};
  const seconds=Number(d.seconds??0); if(!seconds) return undefined;
  if(seconds%86400===0) return {type:"timed",value:{type:"constant",value:seconds/86400},unit:"day"};
  if(seconds%3600===0) return {type:"timed",value:{type:"constant",value:seconds/3600},unit:"hour"};
  if(seconds%60===0) return {type:"timed",value:{type:"constant",value:seconds/60},unit:"minute"};
  return {type:"special"};
};
function modifier(target, mode, value, description) { return {target,mode,...(value!==undefined?{value:rv(value)}:{}),...(description?{description}:{})}; }
function parseEffect(effect, stats) {
  const modifiers=[]; const conditions=[]; const afflictions=[]; const stateVariables=[]; const attackOverrides=[]; const provider=[]; const manual=[]; const unsupported=[];
  const pushRollMode = (domain, ability, value, skill) => modifiers.push(modifier({domain,...(ability?{ability}:{}),...(skill?{skill}:{})},rollMode(value)));
  for(const change of effect.changes??[]) {
    const key=change.key, value=change.value, mode=change.mode;
    let m;
    if(key==="system.attributes.hp.tempmax") m=modifier({domain:"hitPointMaximum"},modeOf(mode),value);
    else if(key==="system.bonuses.abilities.save") m=modifier({domain:"savingThrow"},modeOf(mode),value);
    else if(key==="system.bonuses.abilities.check") m=modifier({domain:"abilityCheck"},modeOf(mode),value);
    else if(key==="system.attributes.init.bonus") m=modifier({domain:"initiative"},modeOf(mode),value);
    else if(/^system\.bonuses\.(mwak|rwak|msak|rsak)\.(attack|damage)$/.test(key)) {
      const [,kind,part]=key.match(/^system\.bonuses\.(mwak|rwak|msak|rsak)\.(attack|damage)$/);
      m=modifier({domain:part==="attack"?"attackRoll":"damageRoll"},modeOf(mode),value,`Applies to ${kind} rolls.`);
    }
    else if(/^system\.abilities\.([a-z]{3})\.(check|save)\.roll\.mode$/.test(key)) {
      const [,ability,domain]=key.match(/^system\.abilities\.([a-z]{3})\.(check|save)\.roll\.mode$/);
      pushRollMode(domain==="check"?"abilityCheck":"savingThrow",ability,value); continue;
    }
    else if(/^system\.abilities\.([a-z]{3})\.bonuses\.save$/.test(key)) {
      const ability=key.match(/^system\.abilities\.([a-z]{3})\.bonuses\.save$/)[1]; m=modifier({domain:"savingThrow",ability},modeOf(mode),value);
    }
    else if(/^system\.skills\.([a-z]{3})\.bonuses\.check$/.test(key)) {
      const code=key.match(/^system\.skills\.([a-z]{3})\.bonuses\.check$/)[1]; m=modifier({domain:"skillCheck",skill:SKILLS[code]??code},modeOf(mode),value);
    }
    else if(/^system\.skills\.([a-z]{3})\.roll\.mode$/.test(key)) {
      const code=key.match(/^system\.skills\.([a-z]{3})\.roll\.mode$/)[1]; pushRollMode("skillCheck",undefined,value,SKILLS[code]??code); continue;
    }
    else if(key==="system.attributes.death.roll.mode") { pushRollMode("deathSave",undefined,value); continue; }
    else if(key==="system.attributes.ac.bonus") m=modifier({domain:"armorClass"},modeOf(mode),value);
    else if(key==="system.attributes.ac.min") m=modifier({domain:"armorClass"},"minimum",value);
    else if(key==="system.attributes.ac.calc") {
      const formulas={mage:"13 + dex.mod"}; m=modifier({domain:"armorClass"},"set",formulas[value]??String(value),`Armor Class calculation mode: ${value}`);
    }
    else if(/^system\.attributes\.movement\.(walk|fly|swim|burrow|climb)$/.test(key)) {
      const mt=key.split(".").pop(); m=modifier({domain:"movement",movementType:mt},modeOf(mode),value);
    }
    else if(key==="system.attributes.movement.hover") m=modifier({domain:"movementCapability",movementCapability:"hover"},"set",Boolean(value));
    else if(key==="system.attributes.movement.ignoredDifficultTerrain") m=modifier({domain:"difficultTerrain"},"prevent",Boolean(value));
    else if(key==="system.traits.dr.value" && DAMAGE.has(String(value))) m=modifier({domain:"damageResistance",damageType:String(value)},"grantResistance");
    else if(key==="system.traits.di.value" && DAMAGE.has(String(value))) m=modifier({domain:"damageImmunity",damageType:String(value)},"grantImmunity");
    else if(key==="system.traits.ci.value" && CONDITIONS.has(String(value))) { conditions.push({action:"immunity",conditions:[String(value)]}); continue; }
    else if(key==="system.traits.languages.value") { for(const language of Array.isArray(value)?value:[value]) modifiers.push(modifier({domain:"language",language:String(language)},"set",true)); continue; }
    else if(key==="system.traits.languages.custom") m=modifier({domain:"language",language:String(value)},"set",true);
    else if(/^system\.attributes\.senses\.(darkvision|truesight|special)$/.test(key)) {
      const sense=key.split(".").pop(); m=modifier({domain:"sense",sense},modeOf(mode),value);
    }
    else if(key==="system.abilities.str.value") m=modifier({domain:"abilityScore",ability:"str"},modeOf(mode),value);
    else if(key==="system.properties") m=modifier({domain:"itemProperty",itemProperty:String(value)},modeOf(mode),true);
    else if(key==="system.magicalBonus") m=modifier({domain:"itemMagicalBonus"},modeOf(mode),value);
    else if(/^system\.damage\.(base|versatile)\.(number|denomination|bonus|types)$/.test(key)) {
      const [,damageMode,field]=key.match(/^system\.damage\.(base|versatile)\.(number|denomination|bonus|types)$/);
      m=modifier({domain:"itemDamage",itemDamageMode:damageMode,itemDamageField:field==="types"?"type":field},modeOf(mode),Array.isArray(value)?value.join("|"):value);
    }
    else if(key==="system.damage.base.custom.enabled") { provider.push({key,value,reason:"Foundry internal custom-damage toggle; canonical itemDamage modifiers carry the rule."}); continue; }
    else if(key==="system.damage.parts" && Array.isArray(value)) {
      for(const part of value) modifiers.push(modifier({domain:"itemDamage",itemDamageMode:"additional",itemDamageField:"formula"},modeOf(mode),Array.isArray(part)?`${part[0]} ${part[1]??""}`.trim():JSON.stringify(part)));
      continue;
    }
    else if(/^activities\[attack\]\.attack\.(ability|bonus)$/.test(key)) {
      const field=key.endsWith("ability")?"ability":"bonus";
      const existing=attackOverrides[0]??{target:"weaponAttack",mode:"modify"};
      if(field==="ability") existing.ability=value==="none"?"spellcasting":value;
      else existing.attackBonus=rv(value);
      attackOverrides[0]=existing; continue;
    }
    else if(key==="system.attack.bonus") m=modifier({domain:"attackRoll"},modeOf(mode),value,"Applies to the enchanted weapon attack.");
    else if(key==="flags.dnd-players-handbook.mirrorImages") {
      stateVariables.push({id:"mirrorImages",valueType:"number",initial:{type:"constant",value:0},min:0,transitions:[{trigger:{event:"onApply"},operation:"add",value:rv(value)},{trigger:{event:"onRemove"},operation:"subtract",value:rv(value)}]}); continue;
    }
    else if(key==="name") { provider.push({key,value,reason:"Display-name mutation only."}); continue; }
    else { unsupported.push({key,mode,value}); continue; }
    if(m) modifiers.push(m);
  }
  for(const status of effect.statuses??[]) {
    if(CONDITIONS.has(status)) conditions.push({action:"apply",conditions:[status]});
    else if(status==="cursed") afflictions.push({action:"apply",afflictionType:"curse"});
    else manual.push({field:"status",value:status,reason:"Status is meaningful but not one of the canonical D&D conditions/curse markers."});
  }
  stats.provider.push(...provider); stats.manual.push(...manual); stats.unsupported.push(...unsupported);
  return {id:effect.foundryId??`effect-${stats.effectCounter++}`,...(effect.name?{name:effect.name}:{}),...(duration(effect.duration)?{duration:duration(effect.duration)}:{}),...(modifiers.length?{modifiers}:{}),...(attackOverrides.length?{attackOverrides}:{}),...(conditions.length?{conditions}:{}),...(afflictions.length?{afflictions}:{}),...(stateVariables.length?{stateVariables}:{}),...(effect.description?{description:String(effect.description)}:{})};
}

const [compendium, foundry] = await Promise.all([JSON.parse(await fs.readFile(FILE,"utf8")), load(FOUNDRY)]);
const enrich = new Map((foundry.spell??[]).filter(s=>s.source==="XPHB").map(s=>[s.name,s]));
const stats={provider:[],manual:[],unsupported:[],effectCounter:1}; let effectsMapped=0, activitiesCompleted=0;
for(const record of compendium.items) {
  const f=enrich.get(record.name); if(!f) continue;
  const effectLookup=new Map((f.effects??[]).map(e=>[e.foundryId,e]));
  for(let i=0;i<(f.activities??[]).length;i++) {
    const fa=f.activities[i]; const oa=record.data.activities?.[i]; if(!oa) continue; activitiesCompleted++;
    if(Array.isArray(fa.effects)) {
      const mapped=fa.effects.map(ref=>effectLookup.get(ref.foundryId)).filter(Boolean).map(e=>parseEffect(e,stats));
      if(mapped.length){oa.effects=mapped;effectsMapped+=mapped.length;}
    }
    if(fa.consumption?.targets?.length) {
      const transitions=[];
      for(const target of fa.consumption.targets) {
        if(target.type!=="itemUses") { stats.unsupported.push({spell:record.name,field:"activity.consumption",value:target}); continue; }
        const raw=String(target.value); const operation=raw.startsWith("-")?"subtract":"add";
        transitions.push({trigger:{event:"onActivate"},operation,value:rv(raw.replace(/^[-+]/,""))});
      }
      if(transitions.length) oa.effects=[...(oa.effects??[]),{id:`${oa.id}-state`,stateVariables:[{id:"spellActivityUses",valueType:"number",initial:{type:"constant",value:0},transitions}]}];
    }
    if(fa.summon==="cr" || fa.creatureTypes?.length) {
      const profile=oa.summonProfiles?.[0]??{id:"profile-1",name:"Eligible creature"};
      const all=[]; if(fa.creatureTypes?.length) all.push({type:"creatureType",creatureTypes:fa.creatureTypes});
      if(all.length) profile.predicate=all.length===1?all[0]:{type:"and",all};
      oa.summonProfiles=[profile];
    }
    for(const ignored of ["foundryId","img"]) if(fa[ignored]!==undefined) stats.provider.push({spell:record.name,field:`activity.${ignored}`,reason:"Foundry provider/display metadata."});
  }
  for(const [key,value] of Object.entries(f.system??{})) {
    const first=record.data.activities?.[0]; if(!first) continue;
    if(key==="target.affects.count") {const n=Number(value);first.target??={type:"special"};first.target.count=Number.isFinite(n)?n:{formula:String(value)};}
    else if(key==="target.affects.type") {first.target??={type:"special"};first.target.type=value==="creature"?"creature":value==="object"?"object":String(value);}
    else if(key==="target.template.size") {first.target??={type:"point"};first.target.area??={shape:"special"};first.target.area.size={value:Number(value),unit:"ft"};}
    else if(key==="duration.value") {first.duration??={type:"timed",unit:"round"};first.duration.value=Number(value);}
    else if(key==="range.value") {first.range??={};first.range.normal={value:Number(value),unit:"ft"};}
    else stats.unsupported.push({spell:record.name,field:`system.${key}`,value});
  }
}
await fs.writeFile(FILE,JSON.stringify(compendium,null,2)+"\n");
const report={generatedAt:new Date().toISOString(),activitiesCompleted,effectsMapped,schemaUnsupportedCount:stats.unsupported.length,manualSemanticCount:stats.manual.length,providerOnlyIgnoredCount:stats.provider.length,schemaUnsupported:stats.unsupported,manualSemantics:stats.manual,providerOnlyIgnored:stats.provider};
await fs.writeFile(REPORT,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({activitiesCompleted,effectsMapped,schemaUnsupportedCount:report.schemaUnsupportedCount,manualSemanticCount:report.manualSemanticCount,providerOnlyIgnoredCount:report.providerOnlyIgnoredCount},null,2));
if(stats.unsupported.length) process.exitCode=1;