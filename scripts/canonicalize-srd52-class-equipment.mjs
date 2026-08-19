import fs from 'node:fs/promises';
const F='packages/content/data/srd-5.2/classes.json';
const doc=JSON.parse(await fs.readFile(F,'utf8'));
const issues=[];
function replaceNamed(className,itemName,equipmentCategory){
  const c=doc.items.find(x=>x.name===className);if(!c){issues.push(`Missing class ${className}`);return}
  let replaced=0;
  for(const bundle of c.data?.equipmentBundles??[])for(let i=0;i<(bundle.grants??[]).length;i++){
    const g=bundle.grants[i];
    if(g?.entity?.entityType==='item'&&g.entity.name===itemName){bundle.grants[i]={equipmentCategory};replaced++}
  }
  if(!replaced&&!c.data?.equipmentBundles?.some(b=>(b.grants??[]).some(g=>g.equipmentCategory===equipmentCategory)))issues.push(`${className}: ${itemName}/${equipmentCategory} grant not found`);
}
replaceNamed('Cleric','Holy Symbol','holySymbol');
replaceNamed('Wizard','Spellbook','spellbook');
await fs.writeFile(F,JSON.stringify(doc,null,2)+'\n');
const report={status:issues.length?'UNSUPPORTED':'SUPPORTED',issues,canonicalized:['Cleric:holySymbol','Wizard:spellbook']};
console.log(JSON.stringify(report,null,2));if(issues.length)process.exit(1);
