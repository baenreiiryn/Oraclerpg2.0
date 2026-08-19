import fs from 'node:fs/promises';
const path='packages/content/data/srd-5.2/species.json';
const doc=JSON.parse(await fs.readFile(path,'utf8'));
const SIZE={T:'tiny',S:'small',M:'medium',L:'large',H:'huge',G:'gargantuan'};
for(const item of doc.items??[]){
  item.data.size=(item.data.size??[]).map(x=>SIZE[x]??String(x).toLowerCase());
  if(item.data?.variants?.length && item.data.spellGrants) delete item.data.spellGrants;
}
await fs.writeFile(path,JSON.stringify(doc,null,2));
