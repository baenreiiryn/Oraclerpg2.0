(()=>{
'use strict';
const systems=[Object.freeze({
  id:'dnd-srd-5e',
  slug:'dnd5e-2024',
  name:'Dungeons & Dragons',
  shortName:'D&D 5e',
  edition:{pt:'5ª Edição · SRD 5.2 (2024)',en:'5th Edition · SRD 5.2 (2024)'},
  description:{pt:'Regras, criaturas, classes, magias, itens e conteúdo Homebrew do D&D.',en:'Rules, creatures, classes, spells, items, and Homebrew content for D&D.'},
  glyph:'D20',
  available:true,
  compendium:{pt:'/compendium-dnd.html',en:'/en/compendium-dnd.html'}
})];
const byId=new Map(systems.map(system=>[system.id,system]));
window.OracleSystems=Object.freeze({
  version:1,
  all:Object.freeze([...systems]),
  get:id=>byId.get(id)||null,
  compendiumUrl:(id,locale='pt')=>{const system=byId.get(id);return system?.compendium?.[locale==='en'?'en':'pt']||null;}
});
})();