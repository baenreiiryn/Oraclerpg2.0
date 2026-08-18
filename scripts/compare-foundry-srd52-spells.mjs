import fs from "node:fs/promises";
import path from "node:path";
import YAML from "yaml";

const ORACLE_FILE = "packages/content/data/srd-5.2/spells.json";
const REPORT_FILE = "packages/content/data/srd-5.2/spells-foundry-comparison.json";
const foundryRoot = process.argv[2] ?? "../foundry-dnd5e/packs/_source/spells24";
const SCHOOL = { abj:"abjuration", con:"conjuration", div:"divination", enc:"enchantment", evo:"evocation", ill:"illusion", nec:"necromancy", trs:"transmutation" };
const ACTIVITY = { heal:"healing", utility:"utility", attack:"attack", save:"save", transform:"transform", summon:"summon", damage:"damage", enchant:"enchant", check:"check" };
const DUR = { inst:"instant", round:"timed", minute:"timed", hour:"timed", day:"timed", perm:"permanent", spec:"special" };
const UNIT = { round:"round", minute:"minute", hour:"hour", day:"day" };
const RANGE = { ft:"feet", mi:"miles", self:"self", touch:"touch", sight:"sight", any:"unlimited" };

async function walk(dir) {
  const out=[];
  for (const entry of await fs.readdir(dir,{withFileTypes:true})) {
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()) out.push(...await walk(p));
    else if(entry.name.endsWith(".yml") && entry.name!=="_folder.yml") out.push(p);
  }
  return out;
}
const sameNum=(a,b)=> Number(a)===Number(b);
const arr=v=>Array.isArray(v)?v:[];
const oracleByName=new Map((JSON.parse(await fs.readFile(ORACLE_FILE,"utf8")).items??[]).map(x=>[x.name,x]));
const files=await walk(foundryRoot);
const foundry=[];
for(const file of files){
  const d=YAML.parse(await fs.readFile(file,"utf8"));
  if(d?.type==="spell") foundry.push({file,d});
}
const issues=[]; const stats={matched:0,missingInOracle:0,level:0,school:0,activation:0,range:0,duration:0,components:0,ritual:0,concentration:0,target:0,activities:0};
for(const {file,d} of foundry){
  const o=oracleByName.get(d.name);
  if(!o){ issues.push({spell:d.name,type:"missing-in-oracle",file}); stats.missingInOracle++; continue; }
  stats.matched++;
  const od=o.data, fsys=d.system??{};
  if(sameNum(fsys.level,od.level)) stats.level++; else issues.push({spell:d.name,type:"level",foundry:fsys.level,oracle:od.level});
  const fSchool=SCHOOL[fsys.school]??fsys.school;
  if(fSchool===od.school) stats.school++; else issues.push({spell:d.name,type:"school",foundry:fSchool,oracle:od.school});
  const fAct=fsys.activation?.type; const oAct=od.castingTimes?.[0]?.unit;
  if(!fAct || fAct===oAct) stats.activation++; else issues.push({spell:d.name,type:"activation",foundry:fAct,oracle:oAct});
  const fr=fsys.range??{}, or=od.range?.distance??{}; const frType=RANGE[fr.units]??fr.units;
  const rangeOk=(!fr.units && !or.type) || (frType===or.type && (fr.value==null || fr.value==="" || sameNum(fr.value,or.amount)));
  if(rangeOk) stats.range++; else issues.push({spell:d.name,type:"range",foundry:{type:frType,value:fr.value},oracle:or});
  const fd=fsys.duration??{}, ods=od.durations??[]; const od0=ods[0]??{}; const fdt=DUR[fd.units]??(fd.units?"special":undefined);
  const durationOk=(!fd.units && !ods.length) || (fdt===od0.type && (fd.value==null || fd.value==="" || sameNum(fd.value,od0.amount)) && (!UNIT[fd.units] || UNIT[fd.units]===od0.unit));
  if(durationOk) stats.duration++; else issues.push({spell:d.name,type:"duration",foundry:fd,oracle:od0});
  const props=new Set(arr(fsys.properties)); const oc=od.components??{};
  const componentPairs=[["vocal",!!oc.verbal],["somatic",!!oc.somatic],["material",!!oc.material]];
  const componentsOk=componentPairs.every(([k,v])=>props.has(k)===v);
  if(componentsOk) stats.components++; else issues.push({spell:d.name,type:"components",foundry:[...props],oracle:oc});
  const fRitual=props.has("ritual"), fConc=props.has("concentration");
  if(fRitual===!!od.ritual) stats.ritual++; else issues.push({spell:d.name,type:"ritual",foundry:fRitual,oracle:!!od.ritual});
  if(fConc===!!od.concentration) stats.concentration++; else issues.push({spell:d.name,type:"concentration",foundry:fConc,oracle:!!od.concentration});
  const ft=fsys.target?.affects?.type; const ot=od.activities?.[0]?.target?.type;
  if(!ft || !ot || ft===ot) stats.target++; else issues.push({spell:d.name,type:"target",foundry:ft,oracle:ot});
  const fKinds=new Set(Object.values(fsys.activities??{}).map(a=>ACTIVITY[a.type]??a.type));
  const oKinds=new Set(arr(od.activities).map(a=>a.kind));
  const missingKinds=[...fKinds].filter(k=>!oKinds.has(k));
  if(!missingKinds.length) stats.activities++; else issues.push({spell:d.name,type:"activity-kinds",foundry:[...fKinds],oracle:[...oKinds],missing:missingKinds});
}
const oracleOnly=[...oracleByName.keys()].filter(n=>!foundry.some(x=>x.d.name===n));
const mechanicalIssues=issues.filter(i=>!["target"].includes(i.type));
const report={
  generatedAt:new Date().toISOString(), foundryBranch:"6.0.x", foundrySpellFiles:foundry.length, oracleSpellCount:oracleByName.size,
  matched:stats.matched, missingInOracle:stats.missingInOracle, oracleOnlyCount:oracleOnly.length, stats,
  issueCount:issues.length, mechanicalIssueCount:mechanicalIssues.length,
  issues, oracleOnly,
  status:mechanicalIssues.length===0 && stats.missingInOracle===0 ? "supported" : "partial"
};
await fs.writeFile(REPORT_FILE,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({foundrySpellFiles:report.foundrySpellFiles,oracleSpellCount:report.oracleSpellCount,matched:report.matched,issueCount:report.issueCount,mechanicalIssueCount:report.mechanicalIssueCount,status:report.status},null,2));
if(report.mechanicalIssueCount || report.missingInOracle) process.exitCode=1;
