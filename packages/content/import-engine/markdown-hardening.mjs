const clean=v=>String(v||'').replace(/\r/g,'').trim();
const heading=/^(#{1,6})\s+(.+)$/;
const metadataLabels=['Size','Tamanho','Speed','Deslocamento','Movement','Languages?','Idiomas?','Skill Proficiencies','Perícias?','Skills?','Tool Proficiencies','Ferramentas?','Tools?','Starting Equipment','Equipamento Inicial','Equipment','Equipamento','Prerequisite','Prerequisites','Pré-requisito','Pré-requisitos','Ability Score Increase','Aumento no Valor de Habilidade','Damage','Dano','Armor Class','Classe de Armadura','AC','CA','Properties','Propriedades','Charges','Cargas','Recharge','Recarga','Recovery','Recuperação','Slot','Espaço','Contents?','Conteúdo','Included Items','Itens Incluídos'];
const metadataPattern=new RegExp(`^(?:${metadataLabels.join('|')})$`,'i');
const wrapperPattern=/^(?:traits?|species traits?|racial traits?|features?|background features?|feat features?|details?|statistics?|stats?|properties|propriedades|características|traços|traços raciais|traços de espécie)$/i;

function normalizeLabelLine(line){
 const m=String(line).match(/^\s*(?:[-*+]\s*)?(?:\*\*|__)?([^:*_]{1,60}?)(?:\*\*|__)?\s*(?:[:.]|[—–-])\s*(.+?)\s*$/);
 if(!m)return null; const label=clean(m[1]).replace(/[.*]+$/,'').trim(); if(!metadataPattern.test(label))return null;
 const value=clean(m[2]).replace(/^\*\*|\*\*$/g,'').trim(); return{label,value};
}
function splitList(value){
 return String(value||'').replace(/\s+and\s+/gi,', ').replace(/\s+e\s+/gi,', ').split(/[,;]+/).map(clean).filter(Boolean).map(x=>x.replace(/^an?\s+/i,'').trim()).filter(Boolean);
}
function boldSection(line){
 const m=String(line).match(/^\s*(?:\*\*\*|\*\*|__)(.+?)(?:\*\*\*|\*\*|__)\s*(.*)$/); if(!m)return null;
 let name=clean(m[1]).replace(/[.:]+$/,'').trim(),body=clean(m[2]);
 if(metadataPattern.test(name)||wrapperPattern.test(name))return null;
 const colon=name.match(/^(?:Feature|Trait|Traço|Característica)\s*[:—–-]\s*(.+)$/i); if(colon)name=clean(colon[1]);
 return name?{name,body}:null;
}
function firstTitle(lines,sourceName){
 for(let i=0;i<lines.length;i++){const h=lines[i].match(heading);if(h)return{index:i,name:clean(h[2])};}
 for(let i=0;i<Math.min(lines.length,12);i++){const raw=clean(lines[i]);if(!raw||/^[-*_]{3,}$/.test(raw)||/^>/.test(raw))continue;const bold=raw.match(/^(?:\*\*|__)([^*_]{2,100})(?:\*\*|__)$/);if(bold&&!metadataPattern.test(clean(bold[1])))return{index:i,name:clean(bold[1])};if(!/^[-*+]\s/.test(raw)&&!normalizeLabelLine(raw)&&!/^\*[^*].*\*$/.test(raw)&&raw.length<=100)return{index:i,name:raw.replace(/^#+\s*/,'')};}
 return{index:-1,name:clean(sourceName).replace(/\.[^.]+$/,'').replace(/[-_]+/g,' ')||'Imported Homebrew'};
}
function flattenHeadings(lines,titleIndex){
 return lines.map((line,i)=>{const h=line.match(heading);if(!h)return line;if(i===titleIndex)return`# ${clean(h[2])}`;const name=clean(h[2]);return wrapperPattern.test(name)?'':`## ${name}`;});
}
function expandInlineCollections(lines,kind){
 const out=[];for(const line of lines){const f=normalizeLabelLine(line);if(!f){out.push(line);continue;}const collection=/^(?:Starting Equipment|Equipamento Inicial|Equipment|Equipamento)$/i.test(f.label)&&kind==='background'||/^(?:Contents?|Conteúdo|Included Items|Itens Incluídos)$/i.test(f.label)&&kind==='item';if(collection&&f.value&&splitList(f.value).length>1){out.push(`## ${kind==='item'?'Contents':'Equipment'}`,...splitList(f.value).map(x=>`- ${x}`));continue;}out.push(`**${f.label}:** ${f.value}`);}return out;
}
function promoteBoldSections(lines,titleIndex){
 const out=[];for(let i=0;i<lines.length;i++){const line=lines[i];if(i===titleIndex){out.push(line);continue;}const b=boldSection(line);if(!b){out.push(line);continue;}out.push(`## ${b.name}`);if(b.body)out.push(b.body);}return out;
}
function tableParts(line){return String(line).split('|').slice(1,-1).map(clean);}
function expandItemTables(lines,kind){
 if(!['item','background'].includes(kind))return lines;const out=[];for(let i=0;i<lines.length;i++){if(!/^\s*\|/.test(lines[i]||'')||!/^\s*\|(?:\s*:?-{2,}:?\s*\|)+\s*$/.test(lines[i+1]||'')){out.push(lines[i]);continue;}const headers=tableParts(lines[i]),itemIdx=headers.findIndex(h=>/^(?:item|equipment|name|item nome|nome)$/i.test(h)),qtyIdx=headers.findIndex(h=>/^(?:qty|quantity|quantidade|qtd)$/i.test(h));if(itemIdx<0){out.push(lines[i]);continue;}const rows=[];let j=i+2;while(j<lines.length&&/^\s*\|/.test(lines[j])){const cells=tableParts(lines[j]);const name=cells[itemIdx],qty=qtyIdx>=0?cells[qtyIdx]:'';if(name)rows.push(`${qty&&qty!=='1'?`${qty} `:''}${name}`);j++;}const previous=out.map(clean).filter(Boolean).at(-1)||'';if(!/^##\s+(?:Contents?|Conteúdo|Equipment|Equipamento)$/i.test(previous))out.push(`## ${kind==='item'?'Contents':'Equipment'}`);out.push(...rows.map(x=>`- ${x}`));i=j-1;}return out;
}
function stripDecorators(lines){return lines.map(line=>/^\s*(?:___+|---+|===+)\s*$/.test(line)?'':line).filter((line,i,a)=>!(line===''&&a[i-1]===''))}

export function hardenMarkdown(markdown,{expectedKind='class',sourceName='markdown'}={}){
 const kind=expectedKind==='race'?'species':expectedKind;if(kind==='class')return String(markdown||'');
 let lines=String(markdown||'').replace(/\r/g,'').split('\n');const title=firstTitle(lines,sourceName);
 if(title.index<0){lines.unshift(`# ${title.name}`);title.index=0;}else if(!heading.test(lines[title.index]))lines[title.index]=`# ${title.name}`;
 lines=flattenHeadings(lines,title.index);lines=expandInlineCollections(lines,kind);lines=promoteBoldSections(lines,title.index);lines=expandItemTables(lines,kind);lines=stripDecorators(lines);
 return lines.join('\n').trim();
}
