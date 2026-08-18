import fs from "node:fs/promises";
const URL="https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/spells/spells-xphb.json";
const FILE="packages/content/data/srd-5.2/spells.json";
const REPORT="packages/content/data/srd-5.2/spells-import-report.json";
const r=await fetch(URL); if(!r.ok) throw new Error(`Upstream spells: ${r.status}`);
const source=(await r.json()).spell.filter(x=>x.srd52===true);
const comp=JSON.parse(await fs.readFile(FILE,"utf8"));
const byName=new Map(comp.items.map(x=>[x.name,x]));
let aliases=0; const ignored={referenceSources:0,hasFluffImages:0}; const unexpected=[];
const core=new Set(["name","source","page","level","school","time","range","components","duration","entries","entriesHigherLevel","meta","miscTags","areaTags","damageInflict","savingThrow","conditionInflict","spellAttack","affectsCreatureType","scalingLevelDice","abilityCheck","damageResist","conditionImmune","damageImmune","damageVulnerable","srd52","basicRules2024","alias","referenceSources","hasFluffImages"]);
for(const s of source){const rec=byName.get(s.name);if(!rec)continue;if(Array.isArray(s.alias)&&s.alias.length){rec.data.aliases=[...s.alias];aliases+=s.alias.length;}if(s.referenceSources)ignored.referenceSources++;if(s.hasFluffImages)ignored.hasFluffImages++;for(const k of Object.keys(s))if(!core.has(k))unexpected.push({name:s.name,field:k});}
await fs.writeFile(FILE,JSON.stringify(comp,null,2)+"\n");
let report={};try{report=JSON.parse(await fs.readFile(REPORT,"utf8"));}catch{}
report.diagnostics=unexpected.map(x=>({name:x.name,status:"unmapped-source-fields",fields:[x.field]}));
report.aliasesPreserved=aliases;report.ignoredNonMechanicalFields=ignored;
await fs.writeFile(REPORT,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({aliasesPreserved:aliases,ignoredNonMechanicalFields:ignored,unexpectedFields:unexpected.length},null,2));
if(unexpected.length)process.exitCode=1;