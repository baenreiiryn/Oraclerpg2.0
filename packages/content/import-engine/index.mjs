import { parse5etoolsJson } from './5etools-adapter.mjs';
import { parse5etoolsMarkdown } from './markdown-adapter.mjs';
import { compileClassDocument } from './class-compiler.mjs';
import { createReferenceResolver, compileSpeciesDocument, compileBackgroundDocument, compileFeatDocument, compileItemDocument } from './domain-compilers.mjs';

function adapter(source,{format='auto',sourceName=''}={}){if(format==='5etools-json'||(format==='auto'&&source&&typeof source==='object'))return parse5etoolsJson(source,{sourceName});return parse5etoolsMarkdown(String(source||''),{sourceName})}
export function importClass(source,{format='auto',sourceName='',compendium=[]}={}){const ir=adapter(source,{format,sourceName});return{ir,...compileClassDocument(ir,{resolve:createReferenceResolver(compendium)})}}
export function importDocument(source,{kind,format='auto',sourceName='',compendium=[]}={}){const ir=adapter(source,{format,sourceName});const resolve=createReferenceResolver(compendium);const compiler={class:compileClassDocument,species:compileSpeciesDocument,race:compileSpeciesDocument,background:compileBackgroundDocument,feat:compileFeatDocument,item:compileItemDocument}[kind];if(!compiler)throw new Error(`Unsupported import kind: ${kind}`);return{ir,...compiler(ir,{resolve})}}
export { parse5etoolsJson, parse5etoolsMarkdown, compileClassDocument, createReferenceResolver, compileSpeciesDocument, compileBackgroundDocument, compileFeatDocument, compileItemDocument };
