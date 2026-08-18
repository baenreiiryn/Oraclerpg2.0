import fs from "node:fs/promises";
const SPELLS="https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/spells/spells-xphb.json";
const FOUNDRY="https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/spells/foundry.json";
const OUT="packages/content/data/srd-5.2/spell-probe/foundry-enrichment-probe.json";
const load=async url=>{const r=await fetch(url);if(!r.ok)throw new Error(`${url}: ${r.status}`);return r.json();};
const [s,f]=await Promise.all([load(SPELLS),load(FOUNDRY)]);
const names=new Set((s.spell??[]).filter(x=>x.srd52===true).map(x=>x.name));
// Never mix legacy PHB (2014) enrichment into the D&D 2024 canonical model.
const matches=(f.spell??[]).filter(x=>names.has(x.name) && x.source==="XPHB");
const activityTypes={}; const activityKeys={}; const systemKeys={}; const effectChangeKeys={}; const examples={}; const keyExamples={};
for(const spell of matches){
 for(const key of Object.keys(spell.system??{})) systemKeys[key]=(systemKeys[key]??0)+1;
 for(const a of spell.activities??[]){
  activityTypes[a.type]=(activityTypes[a.type]??0)+1;
  for(const key of Object.keys(a)) { activityKeys[key]=(activityKeys[key]??0)+1; keyExamples[key]??=[]; if(keyExamples[key].length<5) keyExamples[key].push({name:spell.name,type:a.type,value:a[key]}); }
  examples[a.type]??=[]; if(examples[a.type].length<5) examples[a.type].push({name:spell.name,activity:a});
 }
 for(const e of spell.effects??[]) for(const c of e.changes??[]) effectChangeKeys[c.key]=(effectChangeKeys[c.key]??0)+1;
}
const report={srdSpellCount:names.size,foundryMatchedSpellCount:matches.length,activityTypes,activityKeys,systemKeys,effectChangeKeys,examples,keyExamples};
await fs.writeFile(OUT,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({srdSpellCount:report.srdSpellCount,foundryMatchedSpellCount:report.foundryMatchedSpellCount,activityTypes,activityKeys,systemKeys,effectChangeKeys},null,2));