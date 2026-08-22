import { attach, createDocumentIR, createEntityIR } from './ir.mjs';

const clean = (v) => String(v || '').replace(/\r/g, '').replace(/\u00a0/g, ' ').trim();
const parentNames = ['Cleric','Druid','Fighter','Sorcerer','Warlock','Wizard','Rogue','Ranger','Paladin','Monk','Barbarian','Bard'];
const parentPattern = parentNames.join('|');
const subclassHeading = new RegExp(`^(?:#{1,6}\\s+)?([A-Z][A-Z’' -]+?)\\s*\\((${parentPattern})\\)\\s*$`, 'im');
const levelHeading = /^(?:#{1,6}\s+)?LEVEL\s+(\d{1,2})\s*:\s*(.+?)\s*$/i;

const titleCase = (v) => clean(v).toLowerCase().replace(/(^|[\s-])([a-z])/g, (_m,p,c)=>p+c.toUpperCase());
const tableRow = (line) => clean(line).split(/\s{2,}|\s+\|\s+/).filter(Boolean);

export function isMultiSubclassDocument(text) {
  const s = String(text || '');
  const matches = [...s.matchAll(new RegExp(subclassHeading.source, 'gim'))];
  const parents = new Set(matches.map(m => m[2].toLowerCase()));
  return matches.length >= 2 && parents.size >= 2;
}

function sectionize(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n');
  const starts = [];
  for (let i=0;i<lines.length;i++) {
    const m = lines[i].match(subclassHeading);
    if (m) starts.push({i, name:titleCase(m[1]), parent:m[2]});
  }
  return starts.map((s, idx) => ({...s, end: starts[idx+1]?.i ?? lines.length, lines: lines.slice(s.i, starts[idx+1]?.i ?? lines.length)}));
}

function semantic(raw, name='') {
  const out = {};
  if (/as a bonus action/i.test(raw)) out.activation = 'bonusAction';
  else if (/as a magic action/i.test(raw)) out.activation = 'magicAction';
  else if (/reaction/i.test(raw)) out.activation = 'reaction';
  if (/long rest/i.test(raw)) out.recovery = /short or long rest/i.test(raw) ? 'shortRest' : 'longRest';
  const wis = raw.match(/number of times equal to your Wisdom modifier/i); if (wis) out.uses={formula:'WIS'};
  const con = raw.match(/number of times equal to your Constitution modifier/i); if (con) out.uses={formula:'CON'};
  const radius = raw.match(/(\d+)-foot (?:Emanation|radius)/i); if (radius) out.areaFeet=Number(radius[1]);
  const dur = raw.match(/for (\d+) (minute|minutes|hour|hours)/i); if (dur) out.duration=`${dur[1]} ${dur[2]}`;
  const resist = [...raw.matchAll(/Resistance to ([A-Za-z, ]+?)(?: damage|\.|, and)/gi)].flatMap(m=>m[1].split(/,| and /)).map(x=>clean(x).toLowerCase()).filter(Boolean);
  if (resist.length) out.resistances=[...new Set(resist)];
  if (/always have the listed spells prepared/i.test(raw)) out.preparedSpellTable=true;
  if (/Wild Shape/i.test(raw) && /Titan Form/i.test(raw)) out.modifies=['Wild Shape'];
  if (/Action Surge/i.test(raw)) out.modifies=['Action Surge'];
  if (/Innate Sorcery/i.test(raw)) out.modifies=['Innate Sorcery'];
  if (/Infernal Wound Die/i.test(raw)) out.resourceDie='d6';
  if (/Sorcery Point/i.test(raw)) out.resourceReference='Sorcery Points';
  return out;
}

function parseFeatureTables(lines, start, end) {
  const tables=[];
  for(let i=start;i<end;i++) {
    const line=clean(lines[i]);
    if (!line || /^LEVEL\s+/i.test(line)) continue;
    if (/^(?:Cleric|Druid|Sorcerer) Level\s+(?:Prepared )?Spells/i.test(line)) {
      const header=line.match(/^(Cleric|Druid|Sorcerer) Level\s+(.*)$/i);
      const rows=[];
      for(let j=i+1;j<end;j++) {
        const r=tableRow(lines[j]);
        if (!r.length || /^LEVEL\s+/i.test(r[0])) break;
        if (/^\d+$/.test(r[0])) rows.push([r[0], r.slice(1).join(' ')]);
        else if(rows.length && !/^[A-Z][A-Z ’'-]+$/.test(clean(lines[j]))) rows[rows.length-1][1] += ` ${clean(lines[j])}`;
      }
      if(rows.length) tables.push({header:[`${header[1]} Level`, header[2]], rows});
    }
  }
  return tables;
}

function parseTitanForms(block, subclass) {
  const text=block.lines.join('\n');
  if (!/Circle of the Titan/i.test(subclass.name)) return;
  const names=['BEHEMOTH','LEVIATHAN','INSECTOID'];
  const found=[];
  for (const name of names) {
    const re=new RegExp(`(?:^|\\n)${name}\\s*\\n([\\s\\S]*?)(?=\\n(?:${names.filter(n=>n!==name).join('|')})\\s*\\n|$)`,'i');
    const m=text.match(re);
    if(m) found.push({name:titleCase(name),raw:clean(m[1])});
  }
  if (!found.length) return;
  const group=createEntityIR({kind:'featureChoiceGroup',name:'Titan Forms',parentId:subclass.name,data:{choiceKind:'form'}});
  for(const f of found) attach(group,createEntityIR({kind:'featureOption',name:f.name,parentId:'Titan Forms',level:3,raw:f.raw,data:{requiredLevel:3,optionType:'titanForm',semantic:semantic(f.raw,f.name)}}));
  attach(subclass,group);
}

export function parseMultiSubclassDocument(text,{sourceName='document'}={}) {
  const ir=createDocumentIR({sourceType:'multi-subclass-document',sourceName,raw:text});
  for(const block of sectionize(text)) {
    const cls=createEntityIR({kind:'class',name:block.parent,sourcePath:`line:${block.i+1}`,data:{syntheticParent:true}});
    const sub=createEntityIR({kind:'subclass',name:block.name,parentId:block.parent,sourcePath:`line:${block.i+1}`,data:{parentClassName:block.parent}});
    attach(cls,sub); ir.entities.push(cls);
    const lines=block.lines;
    let firstFeature=lines.length;
    for(let i=1;i<lines.length;i++) {
      const m=clean(lines[i]).match(levelHeading); if(!m) continue;
      firstFeature=Math.min(firstFeature,i);
      const level=Number(m[1]), name=titleCase(m[2]);
      let end=lines.length;
      for(let j=i+1;j<lines.length;j++) if(levelHeading.test(clean(lines[j]))){end=j;break;}
      const raw=lines.slice(i+1,end).join('\n').trim();
      const tables=parseFeatureTables(lines,i+1,end);
      attach(sub,createEntityIR({kind:'subclassFeature',name,parentId:sub.name,level,sourcePath:`line:${block.i+i+1}`,raw,data:{semantic:semantic(raw,name),tables}}));
      i=end-1;
    }
    sub.data.description=lines.slice(1,firstFeature).join('\n').trim();
    parseTitanForms(block,sub);
  }
  return ir;
}
