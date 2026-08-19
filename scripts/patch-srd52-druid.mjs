import fs from 'node:fs/promises';
const file='packages/content/data/srd-5.2/class-features.json',doc=JSON.parse(await fs.readFile(file,'utf8'));
const constant=value=>({type:'constant',value}),runtime=path=>({type:'runtime',path}),pred=description=>({type:'custom',description}),trigger=(event,description,extra={})=>({event,...(description?{description}:{}),...extra});
for(const x of doc.items){
 if(x.data?.category==='druid'){
  if(x.name==='Wild Shape'){
   x.data.classRules={...(x.data.classRules??{}),entityCollections:[{id:'druid-wild-shape-known-forms',entityTypes:['monster'],capacity:runtime('class.druid.wildShapeKnownForms'),filter:pred('Beast monster whose challenge rating is at most class.druid.wildShapeMaxCr; Fly Speed is forbidden before Druid level 8.'),chooseOn:trigger('onApply','Choose Wild Shape known forms when the feature is gained.'),replace:{trigger:trigger('onRest','After a Long Rest, you can replace one known form.'),count:constant(1),filter:pred('Replacement must satisfy the current Wild Shape Beast CR and Fly Speed limits.')},progression:[{level:2,capacity:constant(4),filter:pred('Beast, CR <= 1/4, no Fly Speed.')},{level:4,capacity:constant(6),filter:pred('Beast, CR <= 1/2, no Fly Speed.')},{level:8,capacity:constant(8),filter:pred('Beast, CR <= 1; Fly Speed allowed.')}]}]};
  }
  if(x.name==='Wild Resurgence'||x.name==='Archdruid'){
   if(x.data.classRules?.crossResourceRules){x.data.crossResourceRules=x.data.classRules.crossResourceRules;delete x.data.classRules.crossResourceRules;if(!Object.keys(x.data.classRules).length)delete x.data.classRules;}
  }
 }
 if(x.data?.category==='druid-land'&&x.name==="Nature's Ward"){
  delete x.data.conditionInteractions;
  x.data.effects=[{id:'natures-ward-poisoned-immunity',conditions:[{action:'immunity',conditions:['poisoned']}],description:'You have Immunity to the Poisoned condition.'}];
 }
}
await fs.writeFile(file,JSON.stringify(doc,null,2)+'\n');