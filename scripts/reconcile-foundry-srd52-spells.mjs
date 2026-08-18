import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

const FILE="packages/content/data/srd-5.2/spells.json";
const REPORT="packages/content/data/srd-5.2/spells-foundry-reconciliation.json";
const foundryRoot=process.argv[2]??"../foundry-dnd5e/packs/_source/spells24";
const canonicalFormula=raw=>String(raw).replaceAll("@item.level","spell.slotLevel").replaceAll("@mod","spellcasting.mod");
const num=v=>{const n=Number(v);return Number.isFinite(n)?n:undefined;};
const slug=v=>String(v).normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");

async function walk(dir){const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await walk(p));else if(e.name.endsWith(".yml")&&e.name!=="_folder.yml")out.push(p);}return out;}
function targetFromFoundry(raw){
  if(!raw)return undefined;
  if(raw==="creature"||raw==="willing")return {type:"creature",...(raw==="willing"?{restrictions:[{type:"custom",description:"Target must be willing."}]}:{})};
  if(["object","creatureOrObject","self","space"].includes(raw))return {type:raw};
  return undefined;
}
function healingFormula(h){
  if(!h)return undefined;
  if(h.custom?.enabled&&h.custom?.formula)return canonicalFormula(h.custom.formula);
  const n=num(h.number),d=num(h.denomination);let out="";
  if(n&&d)out=`${n}d${d}`;
  if(h.bonus&&String(h.bonus)!=="0")out+=`${out?" + ":""}${canonicalFormula(h.bonus)}`;
  return out||undefined;
}

const comp=JSON.parse(await fs.readFile(FILE,"utf8"));
const byName=new Map(comp.items.map(x=>[x.name,x]));
const files=await walk(foundryRoot);
let targetReconciled=0,rangeOrigins=0,rangeScaling=0,durationScaling=0,healingAdded=0,officialCorrections=0;
const notes=[];
for(const file of files){
  const f=YAML.parse(await fs.readFile(file,"utf8"));
  if(f?.type!=="spell")continue;
  const record=byName.get(f.name);if(!record)continue;
  const d=record.data,fsys=f.system??{},activity=d.activities?.[0];
  const ft=targetFromFoundry(fsys.target?.affects?.type);
  if(activity&&ft){
    const hasArea=!!activity.target?.area;
    const shouldReplace=!activity.target||activity.target.type==="special"||(!hasArea&&activity.target.type!==ft.type)||fsys.target?.affects?.type==="space";
    if(shouldReplace){activity.target={...ft,...(activity.target?.count!=null?{count:activity.target.count}:{}),...(activity.target?.area?{area:activity.target.area}:{})};targetReconciled++;}
    else if(fsys.target?.affects?.type==="willing"&&activity.target?.type==="creature"&&!activity.target.restrictions){activity.target.restrictions=ft.restrictions;targetReconciled++;}
  }
  const fr=fsys.range??{};
  if(fr.units==="self"&&d.range?.origin!=="self"){d.range.origin="self";rangeOrigins++;}
  if(typeof fr.value==="string"&&fr.value&&Number.isNaN(Number(fr.value))&&d.range?.distance){d.range.distance.scaling={type:"spellSlotLevel",formula:canonicalFormula(fr.value)};rangeScaling++;}
  const fd=fsys.duration??{};const od=d.durations?.[0];
  if(od&&typeof fd.value==="string"&&fd.value.includes("@item.level")){od.scaling={type:"spellSlotLevel",formula:canonicalFormula(fd.value)};durationScaling++;}

  const fActivities=Object.values(fsys.activities??{});
  const heal=fActivities.find(a=>a?.type==="heal"&&a.healing);
  const hasHealing=(d.activities??[]).some(a=>a.healing?.length);
  if(heal&&!hasHealing){
    const formula=healingFormula(heal.healing);
    if(formula){
      const scaleN=num(heal.healing?.scaling?.number),den=num(heal.healing?.denomination);
      const target=targetFromFoundry(fsys.target?.affects?.type);
      const a={id:`foundry-heal-${slug(f.name)}`,name:`Heal with ${f.name}`,kind:"healing",activation:{type:fsys.activation?.type==="bonus"?"bonusAction":fsys.activation?.type??"action",cost:1},...(target?{target}:{}),healing:[{formula,type:(heal.healing.types??[]).includes("temphp")?"temporaryHp":"healing",...(scaleN&&den?{scaling:{type:"spellSlotLevel",formula:`${scaleN}d${den} * max(0, spell.slotLevel - ${Number(fsys.level)})`}}:{})}]};
      d.activities.push(a);healingAdded++;
    } else notes.push({spell:f.name,type:"healing-formula-unparsed"});
  }
}

// Official SRD/2024 source wins over provider disagreements.
const dream=byName.get("Dream");
if(dream){dream.data.range={type:"point",origin:"point",distance:{type:"feet",amount:10}};const a=dream.data.activities?.[0];if(a)a.range={normal:{value:10,unit:"ft"}};officialCorrections++;}
const goodberry=byName.get("Goodberry");
if(goodberry){goodberry.data.range={type:"point",origin:"self",distance:{type:"self"}};const a=goodberry.data.activities?.[0];if(a)a.range={normal:{unit:"self"}};officialCorrections++;}
const eyebite=byName.get("Eyebite");
if(eyebite){eyebite.data.range={type:"point",origin:"self",distance:{type:"self"}};officialCorrections++;}
const mirage=byName.get("Mirage Arcane");
if(mirage){mirage.data.range={type:"point",origin:"point",distance:{type:"sight"}};officialCorrections++;}

await fs.writeFile(FILE,JSON.stringify(comp,null,2)+"\n");
const report={generatedAt:new Date().toISOString(),targetReconciled,rangeOrigins,rangeScaling,durationScaling,healingAdded,officialCorrections,notes};
await fs.writeFile(REPORT,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report,null,2));
