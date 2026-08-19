import fs from 'node:fs/promises';
const ROOT='packages/content/data/srd-5.2';
const load=async n=>JSON.parse(await fs.readFile(`${ROOT}/${n}`,'utf8'));
const save=async(n,v)=>fs.writeFile(`${ROOT}/${n}`,JSON.stringify(v,null,2));
const feats=await load('feats.json');
const features=await load('species-features.json');
const mi=feats.items.find(x=>x.name==='Magic Initiate')?.data;
for(const choice of mi?.spellGrantChoices??[]) for(const option of choice.options){
  const additions=[];
  for(const sel of option.selections){
    if(sel.alsoPrepared) delete sel.alsoPrepared;
    if(sel.mode==='innate' && /level=1/.test(sel.query??'')) additions.push({mode:'prepared',query:sel.query,count:1});
  }
  option.selections.push(...additions);
}
const hill=features.items.find(x=>x.name==="Hill's Tumble")?.data;
if(hill){
  delete hill.properties;delete hill.effects;
  hill.actionRules=[{id:'hills-tumble',activity:{id:'hills-tumble',name:"Hill's Tumble",kind:'utility',target:{type:'creature',count:1},triggers:[{event:'onHit',actor:'self'}],predicates:[{type:'size',sizes:['tiny','small','medium','large']}],conditions:[{condition:'prone'}],uses:{max:{type:'proficiencyBonus',subject:'self'},recovery:[{period:'longRest',amount:'all'}]},description:'When you hit a Large or smaller creature and deal damage, give it the Prone condition.'}}];
}
await save('feats.json',feats);await save('species-features.json',features);
