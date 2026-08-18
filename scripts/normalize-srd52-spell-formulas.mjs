import fs from "node:fs/promises";
const FILE="packages/content/data/srd-5.2/spells.json";
const REPORT="packages/content/data/srd-5.2/spells-formula-audit.json";
const canonical=raw=>String(raw)
 .replaceAll("@item.level","spell.slotLevel")
 .replaceAll("@item.uses.value","state.spellActivityUses")
 .replaceAll("@mod","spellcasting.mod")
 .replaceAll("@prof","proficiencyBonus")
 .replace(/@abilities\.([a-z]{3})\.mod/g,"$1.mod")
 .replaceAll("@attributes.spell.mod","spellcasting.mod")
 .replaceAll("@source.attributes.hp.max","source.hp.max")
 .replaceAll("@details.level","character.level")
 .replaceAll("@attributes.spell.level","spellcasting.level")
 .replaceAll("@flags.dnd-players-handbook.mirrorImages","state.mirrorImages");
const comp=JSON.parse(await fs.readFile(FILE,"utf8"));let removedUnsafeScaling=0,normalizedFormulas=0;const providerFormulaTokens=[];
function walk(value,path=[]){if(Array.isArray(value)){value.forEach((v,i)=>walk(v,[...path,i]));return;}if(!value||typeof value!=="object")return;for(const [key,v] of Object.entries(value)){const p=[...path,key];if(key==="formula"&&typeof v==="string"){const next=canonical(v);if(next!==v){value[key]=next;normalizedFormulas++;}if(value[key].includes("@"))providerFormulaTokens.push({path:p.join("."),formula:value[key]});}else walk(v,p);}}
for(const record of comp.items){for(const activity of record.data.activities??[]){for(const part of activity.damage??[]){if(part.scaling){delete part.scaling;removedUnsafeScaling++;}}for(const part of activity.healing??[]){if(part.scaling){delete part.scaling;removedUnsafeScaling++;}}}walk(record.data,[record.name]);}
await fs.writeFile(FILE,JSON.stringify(comp,null,2)+"\n");const report={generatedAt:new Date().toISOString(),removedUnsafeScaling,normalizedFormulas,providerFormulaTokenCount:providerFormulaTokens.length,providerFormulaTokens};await fs.writeFile(REPORT,JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify({removedUnsafeScaling,normalizedFormulas,providerFormulaTokenCount:providerFormulaTokens.length},null,2));