import fs from 'node:fs/promises';
const file='packages/content/data/srd-5.2/class-features.json';
const doc=JSON.parse(await fs.readFile(file,'utf8'));
const constant=value=>({type:'constant',value});const formula=formula=>({type:'formula',formula});const trigger=(event,description,extra={})=>({event,...(description?{description}:{}),...extra});const pred=description=>({type:'custom',description});
for(const x of doc.items){if(x.data?.category!=='cleric')continue;switch(x.name){
case 'Sear Undead':x.data.damageRules=[{id:'sear-undead',action:'extraDamage',formula:'max(1, @abilities.wis.mod)d8',damageTypes:['radiant'],trigger:trigger('onFailedSave','An Undead fails its save against your Turn Undead.'),predicate:pred('This Radiant damage does not end the Turn Undead effect.')}];break;
case 'Blessed Strikes':delete x.data.damageRules;x.data.classMechanics={runtimeChoices:[{id:'cleric-blessed-strikes',options:['Divine Strike','Potent Spellcasting'],chooseOn:trigger('onApply','Choose one Blessed Strikes option.')} ]};break;
case 'Divine Strike':x.data.damageRules=[{id:'divine-strike',action:'extraDamage',formula:'1d8',damageTypes:['radiant','necrotic'],trigger:trigger('onHit','Once on each of your turns when you hit a creature with an attack roll using a weapon.'),usage:{max:constant(1),scope:'turn'}}];break;
case 'Potent Spellcasting':x.data.triggeredGrants=[{id:'potent-spellcasting',trigger:trigger('onDamage','When a Cleric cantrip deals damage to a creature.'),grant:'temporaryHitPoints',value:formula('@abilities.wis.mod'),predicate:pred('Grant the temporary hit points to yourself or another creature within 60 feet.')}];break;
case 'Improved Blessed Strikes':x.data.patches=[{level:14,setValues:{'divineStrike.damage':'2d8','potentSpellcasting.temporaryHitPoints':'2 * @abilities.wis.mod'}}];break;
}}
await fs.writeFile(file,JSON.stringify(doc,null,2)+'\n');