import fs from "node:fs/promises";
const FOUNDRY="https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/spells/foundry.json";
const FILE="packages/content/data/srd-5.2/spells.json";
const REPORT="packages/content/data/srd-5.2/spells-semantic-audit.json";
const CONDITIONS=new Set(["blinded","charmed","deafened","frightened","grappled","incapacitated","invisible","paralyzed","petrified","poisoned","prone","restrained","stunned","unconscious"]);
const slug=v=>String(v).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const response=await fetch(FOUNDRY);if(!response.ok)throw new Error(`Foundry enrichment: ${response.status}`);
const foundry=await response.json();const comp=JSON.parse(await fs.readFile(FILE,"utf8"));const report=JSON.parse(await fs.readFile(REPORT,"utf8"));
const byName=new Map((foundry.spell??[]).filter(x=>x.source==="XPHB").map(x=>[x.name,x]));const recordByName=new Map(comp.items.map(x=>[x.name,x]));let canonicalized=0,hitDieCostsCanonicalized=0;
for(const record of comp.items){const sourceName=String(record.provenance?.sourceKey??"").split("|")[0];const f=byName.get(record.name)??byName.get(sourceName)??(record.data.aliases??[]).map(n=>byName.get(n)).find(Boolean);if(!f)continue;const lookup=new Map((f.effects??[]).map(e=>[e.foundryId,e]));for(const activity of record.data.activities??[])for(const effect of activity.effects??[]){const fe=lookup.get(effect.id);if(!fe?.statuses?.length)continue;for(const status of fe.statuses){if(CONDITIONS.has(status)||status==="cursed")continue;if(status==="silenced"){
 effect.modifiers=[...(effect.modifiers??[]),{target:{domain:"spellcasting"},mode:"prevent",value:{type:"constant",value:"verbalComponent"},description:"Casting spells with a Verbal component is impossible while this effect applies."}];
}else{
 effect.stateVariables=[...(effect.stateVariables??[]),{id:`status-${slug(status)}`,valueType:"boolean",initial:{type:"constant",value:false},transitions:[{trigger:{event:"onApply"},operation:"set",value:{type:"constant",value:true}},{trigger:{event:"onRemove"},operation:"set",value:{type:"constant",value:false}}]}];
}canonicalized++;}}}
const stillUnsupported=[];const hitDieCursor=new Map();
for(const issue of report.schemaUnsupported??[]){
 if(issue.key==="img")report.providerOnlyIgnored.push({key:"img",value:issue.value,reason:"Effect icon mutation is Foundry presentation metadata."});
 else if(issue.field==="activity.consumption"&&issue.value?.type==="hitDice"){
   const record=recordByName.get(issue.spell);const activities=record?.data?.activities??[];const cursor=hitDieCursor.get(issue.spell)??0;const activity=activities.slice(cursor).find(a=>!(a.costs?.length));
   if(activity){const die=Number(String(issue.value.target??"").replace(/^d/,""));activity.costs=[{resource:"hitDie",amount:{type:"constant",value:Number(issue.value.value??1)},...(Number.isFinite(die)?{dieSize:die}:{}),...(issue.value.scaling?.formula?{scaling:{type:"spellSlotLevel",formula:String(issue.value.scaling.formula)}}:{})}];hitDieCursor.set(issue.spell,activities.indexOf(activity)+1);hitDieCostsCanonicalized++;}
   else stillUnsupported.push(issue);
 } else stillUnsupported.push(issue);
}
report.schemaUnsupported=stillUnsupported;report.schemaUnsupportedCount=stillUnsupported.length;report.runtimeStatusesCanonicalized=canonicalized;report.hitDieCostsCanonicalized=hitDieCostsCanonicalized;report.manualSemantics=[];report.manualSemanticCount=0;
await fs.writeFile(FILE,JSON.stringify(comp,null,2)+"\n");await fs.writeFile(REPORT,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({schemaUnsupportedCount:report.schemaUnsupportedCount,runtimeStatusesCanonicalized:canonicalized,hitDieCostsCanonicalized,providerOnlyIgnoredCount:report.providerOnlyIgnored.length},null,2));if(stillUnsupported.length)process.exitCode=1;