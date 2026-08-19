import fs from 'node:fs/promises';
const path='packages/content/data/srd-5.2/species.json';
const doc=JSON.parse(await fs.readFile(path,'utf8'));
for(const item of doc.items??[]){
  if(item.data?.variants?.length && item.data.spellGrants) delete item.data.spellGrants;
}
await fs.writeFile(path,JSON.stringify(doc,null,2));
