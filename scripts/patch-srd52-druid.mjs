import fs from 'node:fs/promises';
const file='packages/content/data/srd-5.2/class-features.json',doc=JSON.parse(await fs.readFile(file,'utf8'));
const constant=value=>({type:'constant',value}),runtime=(path,subject)=>({type:'runtime',path,...(subject?{subject}:{})}),pred=description=>({type:'custom',description}),trigger=(event,description,extra={})=>({event,...(description?{description}:{}),...extra});
const eligible=(maxCr,flyRule)=>({type:'and',all:[{type:'creatureType',creatureTypes:['beast']},{type:'comparison',left:runtime('data.challengeRating','target'),operator:'lte',right:typeof maxCr==='number'?constant(maxCr):runtime(maxCr,'self')},...(flyRule?[pred(flyRule)]:[])]});
for(const x of doc.items){
 if(x.data?.category==='druid'){
  if(x.name==='Wild Shape'){
   const currentFilter=eligible('class.druid.wildShapeMaxCr','Before Druid level 8 the selected Beast must not have a Fly Speed; starting at level 8 Fly Speed is allowed.');
   x.data.classRules={...(x.data.classRules??{}),entityCollections:[{id:'druid-wild-shape-known-forms',entityTypes:['monster'],capacity:runtime('class.druid.wildShapeKnownForms'),filter:currentFilter,chooseOn:trigger('onApply','Choose Wild Shape known forms when the feature is gained.'),replace:{trigger:trigger('onRest','After a Long Rest, you can replace one known form.'),count:constant(1),filter:currentFilter},progression:[{level:2,capacity:constant(4),filter:eligible(.25,'The Beast must not have a Fly Speed.')},{level:4,capacity:constant(6),filter:eligible(.5,'The Beast must not have a Fly Speed.')},{level:8,capacity:constant(8),filter:eligible(1)}]}]};
   const tr=x.data.classMechanics?.transformations?.[0];if(tr)tr.source.filter=currentFilter;
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