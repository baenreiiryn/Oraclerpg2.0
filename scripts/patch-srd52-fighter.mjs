import fs from 'node:fs/promises';
const file='packages/content/data/srd-5.2/classes.json';
const doc=JSON.parse(await fs.readFile(file,'utf8'));
const fighter=doc.items.find(x=>x.name==='Fighter');
if(!fighter) throw new Error('Fighter class missing');
for(const bundle of fighter.data?.equipmentBundles??[]){
  for(const grant of bundle.grants??[]){
    if(grant.entity?.name==='Arrows'){
      grant.entity.name='Arrow';
      grant.entity.canonicalId='dnd2024:2024:item:arrow:srd-5.2';
    }
  }
}
await fs.writeFile(file,JSON.stringify(doc,null,2)+'\n');
console.log('Normalized Fighter starting ammunition to canonical Arrow item.');