import fs from 'node:fs/promises';
const file='packages/content/data/srd-5.2/class-features.json';
const doc=JSON.parse(await fs.readFile(file,'utf8'));
const constant=value=>({type:'constant',value});const formula=formula=>({type:'formula',formula});const trigger=(event,description,extra={})=>({event,...(description?{description}:{}),...extra});const pred=description=>({type:'custom',description});
for(const x of doc.items){if(x.data?.category!=='cleric')continue;switch(x.name){
case 'Sear Undead':x.data.damageRules=[{id:'sear-undead',action:'extraDamage',formula:'max(1, @abilities.wis.mod)d8',damageTypes:['radiant'],trigger:trigger('onFailedSave','An Undead fails its save against your Turn Undead.'),predicate:pred('This Radiant damage does not end the Turn Undead effect.')}];break;
case 'Divine Order':case 'Protector':case 'Thaumaturge':case 'Spellcasting':case 'Channel Divinity':case 'Divine Spark':case 'Turn Undead':case 'Blessed Strikes':case 'Improved Blessed Strikes':case 'Divine Intervention':case 'Greater Divine Intervention':case 'Ability Score Improvement':case 'Epic Boon':break;
default: if(Object.keys(x.data).every(k=>['featureKind','category','text'].includes(k))) x.data.properties=[`structured-marker:${x.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`];
}}
await fs.writeFile(file,JSON.stringify(doc,null,2)+'\n');