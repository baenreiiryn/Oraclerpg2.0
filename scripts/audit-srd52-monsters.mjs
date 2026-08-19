import fs from "node:fs/promises";
const monsters=JSON.parse(await fs.readFile("packages/content/data/srd-5.2/monsters.json","utf8"));
const resolver=JSON.parse(await fs.readFile("packages/content/data/srd-5.2/monster-feature-aliases.json","utf8"));
const defs=JSON.parse(await fs.readFile("packages/content/data/srd-5.2/monster-features.json","utf8"));
const ids=new Set((defs.items??[]).map(x=>x.canonicalId));
const issues=[];
if(monsters.count!==331) issues.push({path:"count",message:`Expected 331 SRD 5.2 monsters, got ${monsters.count}`});
const seen=new Set(); let featureInstances=0;
for(const m of monsters.items??[]){
 if(seen.has(m.canonicalId)) issues.push({path:m.canonicalId,message:"Duplicate canonicalId"}); seen.add(m.canonicalId);
 const d=m.data??{}; for(const k of ["creatureType","size","challengeRating","abilities","armorClass","hitPoints","movement"]) if(d[k]==null) issues.push({path:`${m.name}.${k}`,message:"Missing required monster field"});
 for(const f of d.features??[]){ featureInstances++; const id=f.definition?.canonicalId; if(!id||!ids.has(id)) issues.push({path:`${m.name}.features.${f.name}`,message:`Invalid feature definition ${id}`}); }
}
if(featureInstances!==resolver.occurrenceCount) issues.push({path:"features",message:`Expected ${resolver.occurrenceCount} materialized feature instances, got ${featureInstances}`});
const report={generatedAt:new Date().toISOString(),ok:issues.length===0,monsterCount:monsters.count,featureInstances,definitionCount:ids.size,issues};
await fs.writeFile("packages/content/data/srd-5.2/monsters-coverage-audit.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2)); if(issues.length) process.exit(1);
