import fs from 'node:fs/promises';

const ROOT='packages/content/data/srd-5.2';
const FILE=`${ROOT}/class-features.json`;
const doc=JSON.parse(await fs.readFile(FILE,'utf8'));
const wizard=doc.items.filter(x=>x.data?.category==='wizard');
const byName=name=>wizard.find(x=>x.name===name);
const issues=[];

const spellcasting=byName('Spellcasting');
if(!spellcasting) issues.push('Wizard Spellcasting missing');
else {
  const collections=spellcasting.data?.classMechanics?.spellCollections??[];
  const book=collections.find(x=>x.id==='wizard-spellbook');
  const prepared=collections.find(x=>x.id==='wizard-prepared-spells');
  if(!book) issues.push('wizard-spellbook collection missing');
  else {
    if(book.capacity===null) delete book.capacity;
    book.additions={initial:{type:'constant',value:6},perLevel:{type:'constant',value:2},allowLowerLevel:true};
  }
  if(!prepared) issues.push('wizard-prepared-spells collection missing');
  else prepared.fromCollectionId='wizard-spellbook';
}

const recovery=byName('Arcane Recovery');
if(!recovery) issues.push('Arcane Recovery missing');
else {
  recovery.data.classRules ??= {};
  delete recovery.data.classRules.resourceMutations;
  recovery.data.classRules.spellSlotRecoveryBudgets=[{
    poolId:'wizard-spell-slots',
    trigger:{event:'onShortRest',description:'Finish a Short Rest and use Arcane Recovery.'},
    budget:{type:'formula',formula:'ceil(@classes.wizard.level / 2)'},
    maxSlotLevel:5,
    usage:{uses:1,recovery:'longRest'}
  }];
}

if(issues.length) throw new Error(`Wizard canonicalization failed: ${issues.join('; ')}`);
await fs.writeFile(FILE,JSON.stringify(doc,null,2)+'\n');
console.log(JSON.stringify({status:'SUPPORTED',canonicalized:['Spellcasting','Arcane Recovery'],issues:[]},null,2));
