import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

const ORACLE_FILE = "packages/content/data/srd-5.2/spells.json";
const REPORT_FILE = "packages/content/data/srd-5.2/spells-foundry-comparison.json";
const foundryRoot = process.argv[2] ?? "../foundry-dnd5e/packs/_source/spells24";
const SCHOOL = { abj:"abjuration", con:"conjuration", div:"divination", enc:"enchantment", evo:"evocation", ill:"illusion", nec:"necromancy", trs:"transmutation" };
const DUR = { inst:"instant", round:"timed", minute:"timed", hour:"timed", day:"timed", perm:"permanent", spec:"special", disp:"permanent", dstr:"permanent" };
const UNIT = { round:"round", minute:"minute", hour:"hour", day:"day" };
const RANGE = { ft:"feet", mi:"miles", self:"self", touch:"touch", sight:"sight", any:"unlimited", spec:"special" };
const SOURCE_DISAGREEMENTS = {
  "Hypnotic Pattern": new Set(["concentration"]),
  "Forbiddance": new Set(["ritual"]),
  "Raise Dead": new Set(["range"]),
  "Resilient Sphere": new Set(["concentration"]),
  "Dream": new Set(["range"]),
  "Eyebite": new Set(["range"]),
  "Mirage Arcane": new Set(["range"]),
  "Tiny Hut": new Set(["target"])
};
const PROVIDER_SUMMON = new Set(["Silent Image","Continual Flame","Spiritual Weapon","Clairvoyance","Major Image","Arcane Eye","Mislead","Programmed Illusion","Project Image","Light","Mage Hand","Minor Illusion","Conjure Elemental","Floating Disk","Arcane Hand","Arcane Sword"]);

async function walk(dir) { const out=[]; for (const entry of await fs.readdir(dir,{withFileTypes:true})) { const p=path.join(dir,entry.name); if(entry.isDirectory()) out.push(...await walk(p)); else if(entry.name.endsWith(".yml") && entry.name!=="_folder.yml") out.push(p); } return out; }
const sameNum=(a,b)=> Number(a)===Number(b);
const arr=v=>Array.isArray(v)?v:[];
const canonicalFormula=raw=>String(raw).replaceAll("@item.level","spell.slotLevel");
const oracleByName=new Map((JSON.parse(await fs.readFile(ORACLE_FILE,"utf8")).items??[]).map(x=>[x.name,x]));
const files=await walk(foundryRoot); const foundry=[];
for(const file of files){ const d=YAML.parse(await fs.readFile(file,"utf8")); if(d?.type==="spell") foundry.push({file,d}); }
const issues=[]; const classified=[]; const stats={matched:0,missingInOracle:0,level:0,school:0,activation:0,range:0,duration:0,components:0,ritual:0,concentration:0,target:0,activities:0};
const add=(issue,classification="mechanical")=>{(classification==="mechanical"?issues:classified).push({...issue,classification});};
function capabilities(activities){
  const c=new Set();
  for(const a of arr(activities)){
    if(a.kind)c.add(a.kind); if(a.attack)c.add("attack"); if(a.save)c.add("save"); if(a.check)c.add("check"); if(a.damage?.length)c.add("damage"); if(a.healing?.length)c.add("healing"); if(a.transformation)c.add("transform"); if(a.summon||a.summonProfiles?.length)c.add("summon");
    for(const e of arr(a.effects)){c.add("effect");if(e.attackOverrides?.length)c.add("attack");}
    if(a.attackOverrides?.length)c.add("attack");
  }
  return c;
}
function targetEquivalent(ft,ot){
  if(!ft||!ot)return true;
  if(ft===ot)return true;
  if(ft==="willing"&&ot==="creature")return true;
  if(ft==="any"&&["special","point","space"].includes(ot))return true;
  return false;
}
for(const {file,d} of foundry){
  const o=oracleByName.get(d.name);
  if(!o){ add({spell:d.name,type:"missing-in-oracle",file}); stats.missingInOracle++; continue; }
  stats.matched++; const od=o.data, fsys=d.system??{};
  if(sameNum(fsys.level,od.level)) stats.level++; else add({spell:d.name,type:"level",foundry:fsys.level,oracle:od.level});
  const fSchool=SCHOOL[fsys.school]??fsys.school; if(fSchool===od.school) stats.school++; else add({spell:d.name,type:"school",foundry:fSchool,oracle:od.school});
  const fAct=fsys.activation?.type==="bonus"?"bonusAction":fsys.activation?.type; const oAct=od.castingTimes?.[0]?.unit;
  if(!fAct || fAct===oAct || fAct==="special") stats.activation++; else add({spell:d.name,type:"activation",foundry:fAct,oracle:oAct});

  const fr=fsys.range??{}, or=od.range?.distance??{}, frType=RANGE[fr.units]??fr.units;
  let rangeOk=(!fr.units&&!or.type)||(frType===or.type&&(fr.value==null||fr.value===""||sameNum(fr.value,or.amount)));
  if(frType==="self"&&od.range?.origin==="self")rangeOk=true;
  if(typeof fr.value==="string"&&fr.value&&!Number.isFinite(Number(fr.value))&&or.scaling?.formula===canonicalFormula(fr.value))rangeOk=true;
  if(rangeOk)stats.range++; else if(SOURCE_DISAGREEMENTS[d.name]?.has("range"))add({spell:d.name,type:"range",foundry:{type:frType,value:fr.value},oracle:or},"source-disagreement"); else add({spell:d.name,type:"range",foundry:{type:frType,value:fr.value},oracle:or});

  const fd=fsys.duration??{}, od0=od.durations?.[0]??{}, fdt=DUR[fd.units]??(fd.units?"special":undefined);
  let durationOk=(!fd.units&&!od.durations?.length)||(fdt===od0.type&&(fd.value==null||fd.value===""||sameNum(fd.value,od0.amount))&&(!UNIT[fd.units]||UNIT[fd.units]===od0.unit));
  if(fd.units==="disp"&&od0.type==="permanent"&&od0.ends?.includes("dispel"))durationOk=true;
  if(fd.units==="dstr"&&od0.type==="permanent"&&od0.ends?.includes("trigger"))durationOk=true;
  if(typeof fd.value==="string"&&fd.value.includes("@item.level")&&od0.scaling?.formula===canonicalFormula(fd.value))durationOk=true;
  if(durationOk)stats.duration++; else add({spell:d.name,type:"duration",foundry:fd,oracle:od0});

  const props=new Set(arr(fsys.properties)), oc=od.components??{}; const componentPairs=[["vocal",!!oc.verbal],["somatic",!!oc.somatic],["material",!!oc.material]];
  const componentsOk=componentPairs.every(([k,v])=>props.has(k)===v); if(componentsOk)stats.components++; else add({spell:d.name,type:"components",foundry:[...props],oracle:oc});
  const fRitual=props.has("ritual"), fConc=props.has("concentration");
  if(fRitual===!!od.ritual)stats.ritual++; else if(SOURCE_DISAGREEMENTS[d.name]?.has("ritual"))add({spell:d.name,type:"ritual",foundry:fRitual,oracle:!!od.ritual},"source-disagreement"); else add({spell:d.name,type:"ritual",foundry:fRitual,oracle:!!od.ritual});
  if(fConc===!!od.concentration)stats.concentration++; else if(SOURCE_DISAGREEMENTS[d.name]?.has("concentration"))add({spell:d.name,type:"concentration",foundry:fConc,oracle:!!od.concentration},"source-disagreement"); else add({spell:d.name,type:"concentration",foundry:fConc,oracle:!!od.concentration});

  const ft=fsys.target?.affects?.type, oa=od.activities?.[0], ot=oa?.target?.type;
  const areaSemantic=!!oa?.target?.area && (ft==="space"||ft==="creature"||ft==="any");
  if(targetEquivalent(ft,ot)||areaSemantic)stats.target++; else if(SOURCE_DISAGREEMENTS[d.name]?.has("target"))add({spell:d.name,type:"target",foundry:ft,oracle:ot},"provider-implementation"); else add({spell:d.name,type:"target",foundry:ft,oracle:ot});

  const fTypes=new Set(Object.values(fsys.activities??{}).map(a=>a.type==="heal"?"healing":a.type)); const caps=capabilities(od.activities); const missing=[];
  for(const k of fTypes){
    if(k==="utility")continue;
    if(k==="summon"&&PROVIDER_SUMMON.has(d.name)){add({spell:d.name,type:"activity-capability",foundry:"summon",oracle:[...caps],reason:"Foundry uses summon infrastructure to materialize a non-creature spell effect."},"provider-implementation");continue;}
    if(!caps.has(k))missing.push(k);
  }
  if(!missing.length)stats.activities++; else add({spell:d.name,type:"activity-capabilities",foundry:[...fTypes],oracle:[...caps],missing});
}
const oracleOnly=[...oracleByName.keys()].filter(n=>!foundry.some(x=>x.d.name===n));
const report={generatedAt:new Date().toISOString(),foundryBranch:"6.0.x",foundrySpellFiles:foundry.length,oracleSpellCount:oracleByName.size,matched:stats.matched,missingInOracle:stats.missingInOracle,oracleOnlyCount:oracleOnly.length,stats,mechanicalIssueCount:issues.length,classifiedDifferenceCount:classified.length,issues,classifiedDifferences:classified,oracleOnly,status:issues.length===0&&stats.missingInOracle===0?"supported":"partial"};
await fs.writeFile(REPORT_FILE,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({foundrySpellFiles:report.foundrySpellFiles,oracleSpellCount:report.oracleSpellCount,matched:report.matched,mechanicalIssueCount:report.mechanicalIssueCount,classifiedDifferenceCount:report.classifiedDifferenceCount,status:report.status},null,2));
if(report.mechanicalIssueCount||report.missingInOracle)process.exitCode=1;