import fs from 'node:fs/promises';

const ROOT='packages/content/data/srd-5.2';
const files=['items.json','spells.json','monsters.json','monster-features.json','species.json','species-features.json','feats.json','classes.json','subclasses.json','class-features.json'];
const collections={};
const unmatched=[];
const totals={entities:0,withMedia:0,assets:0};

for(const file of files){
  const p=`${ROOT}/${file}`;
  let raw;
  try{raw=await fs.readFile(p,'utf8');}catch{continue;}
  const doc=JSON.parse(raw);
  const stats={entities:doc.items?.length??0,withMedia:0,assets:0,byRole:{}};
  for(const entity of doc.items??[]){
    // Bestiary artwork depicts creatures, not features with the same name.
    if(entity.entityType==='feature' && entity.data?.featureKind==='monsterFeature') delete entity.media;
    if(entity.media?.assets?.length){
      entity.media.assets=entity.media.assets.filter(asset=>{
        if((asset.role==='token'||asset.role==='portrait') && entity.entityType!=='monster') return false;
        return true;
      });
      if(!entity.media.assets.length) delete entity.media;
    }
    if(entity.media?.assets?.length){
      const roles=new Set(entity.media.assets.map(x=>x.role));
      if(!roles.has(entity.media.primaryRole)) entity.media.primaryRole=entity.media.assets[0].role;
      stats.withMedia++;
      stats.assets+=entity.media.assets.length;
      for(const asset of entity.media.assets) stats.byRole[asset.role]=(stats.byRole[asset.role]??0)+1;
    }else unmatched.push({collection:file,canonicalId:entity.canonicalId,name:entity.name,entityType:entity.entityType});
  }
  collections[file]=stats;
  totals.entities+=stats.entities;totals.withMedia+=stats.withMedia;totals.assets+=stats.assets;
  await fs.writeFile(p,JSON.stringify(doc,null,2));
}

const report={
  generatedAt:new Date().toISOString(),
  provider:'5etools-img',
  repository:'LoganMagelight/5etools-img',
  branch:'main',
  collections,
  totals,
  coverage:totals.entities?totals.withMedia/totals.entities:0,
  unmatched,
  safeguards:{
    monsterFeatureBestiaryArtworkBlocked:true,
    tokenRestrictedToMonsters:true,
    portraitRestrictedToMonsters:true,
  },
};
await fs.writeFile(`${ROOT}/media-coverage-audit.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({totals,coverage:report.coverage,unmatched:unmatched.length,safeguards:report.safeguards},null,2));