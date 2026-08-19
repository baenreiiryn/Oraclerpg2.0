import fs from 'node:fs/promises';
const ROOT='packages/content/data/srd-5.2',URL='https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data/class/class-ranger.json';
const src=await fetch(URL).then(r=>{if(!r.ok)throw new Error(`5etools Ranger fetch failed: ${r.status}`);return r.json()});
const cls=(src.class??[]).find(x=>x.name==='Ranger'&&x.source==='XPHB'&&x.srd52);
const sub=(src.subclass??[]).find(x=>x.className==='Ranger'&&x.classSource==='XPHB'&&x.shortName==='Hunter'&&x.source==='XPHB'&&x.srd52);
const cf=(src.classFeature??[]).filter(x=>x.className==='Ranger'&&x.classSource==='XPHB'&&x.srd52);
const sf=(src.subclassFeature??[]).filter(x=>x.className==='Ranger'&&x.classSource==='XPHB'&&x.subclassShortName==='Hunter'&&x.subclassSource==='XPHB'&&x.srd52);
const read=async f=>JSON.parse(await fs.readFile(`${ROOT}/${f}`,'utf8'));
const [classes,subs,features]=await Promise.all(['classes.json','subclasses.json','class-features.json'].map(read));
const c=classes.items.find(x=>x.name==='Ranger'),s=subs.items.find(x=>x.name==='Hunter'&&x.data?.parentClass?.name==='Ranger');
const of=features.items.filter(x=>x.data?.category==='ranger'),oh=features.items.filter(x=>x.data?.category==='ranger-hunter'),issues=[];const req=(ok,m)=>{if(!ok)issues.push(m)};
req(!!cls&&!!sub&&!!c&&!!s,'Ranger/Hunter identity mismatch');req(c?.data?.hitDie===cls?.hd?.faces,`Hit Die mismatch ${c?.data?.hitDie}/${cls?.hd?.faces}`);
const excluded=new Set(['Ranger Subclass','Subclass Feature']);const expectedClass=[...new Set(cf.filter(x=>!excluded.has(x.name)).map(x=>x.name))];const expectedSub=[...new Set(sf.filter(x=>x.name!=='Hunter').map(x=>x.name))];
for(const n of expectedClass)req(of.some(x=>x.name===n),`Missing canonical class feature: ${n}`);for(const n of expectedSub)req(oh.some(x=>x.name===n),`Missing canonical Hunter feature: ${n}`);
const prepared=cls?.preparedSpellsProgression??[],rows=(cls?.classTableGroups??[]).find(x=>Array.isArray(x.rowsSpellProgression))?.rowsSpellProgression??[];req(c?.data?.advancement?.length===20,'Oracle progression is not 20 levels');
for(let i=0;i<20;i++){const sc=c?.data?.advancement?.[i]?.scaleValues??{};if(sc.preparedSpells!==prepared[i])issues.push(`Prepared Spells L${i+1}: ${sc.preparedSpells}/${prepared[i]}`);const exp=Object.fromEntries((rows[i]??[]).map((v,j)=>[j+1,v]).filter(([,v])=>v>0));if(JSON.stringify(sc.spellSlots)!==JSON.stringify(exp))issues.push(`Spell Slots L${i+1} mismatch`)}
const report={status:issues.length?'UNSUPPORTED':'SUPPORTED',issues,class:'Ranger',subclass:'Hunter',source:{classFeatureRecords:cf.length,canonicalClassNames:expectedClass.length,subclassFeatureRecords:sf.length,canonicalSubclassNames:expectedSub.length,preparedRows:prepared.length,slotRows:rows.length},oracle:{classFeatures:of.length,subclassFeatures:oh.length}};
await fs.writeFile(`${ROOT}/ranger-5etools-comparison.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(issues.length)process.exit(1);
