import { addDiagnostic, attach, createDocumentIR, createEntityIR, unresolved } from './ir.mjs';

const clean = (value) => String(value || '').replace(/\r/g, '').trim();
const A = (value) => Array.isArray(value) ? value : value == null ? [] : [value];
const levelHeading = /^(?:level|nível)\s+(\d{1,2})\s*[:—-]\s*(.+)$/i;
const boldLevelHeading = /^\*{3}(?:level|nível)\s+(\d{1,2})\s*[:—-]\s*(.+?)\.\*{3}\s*(.*)$/i;
const markdownHeading = /^(#{1,6})\s+(.+)$/;

function parseTable(lines, start) {
  if (!/^\s*\|/.test(lines[start] || '') || !/^\s*\|(?:\s*:?-{2,}:?\s*\|)+\s*$/.test(lines[start + 1] || '')) return null;
  const split = (line) => line.split('|').slice(1, -1).map((cell) => clean(cell));
  const header = split(lines[start]);
  const rows = [];
  let end = start + 2;
  while (end < lines.length && /^\s*\|/.test(lines[end])) { rows.push(split(lines[end])); end++; }
  return { kind: 'table', header, rows, start, end };
}
function bodyUntil(lines, from, stop) { return lines.slice(from, stop).join('\n').trim(); }
function findNextBoundary(lines, from, subclassMode) {
  for (let i = from; i < lines.length; i++) {
    const line = lines[i], heading = line.match(markdownHeading);
    if (heading && (heading[1].length <= 4 || subclassMode)) return i;
    if (boldLevelHeading.test(line.trim())) return i;
  }
  return lines.length;
}
function extractInlineSections(body) {
  const parts = [], re = /\*{3}([^*\n]{2,100}?)\.\*{3}\s*([\s\S]*?)(?=\n\s*\n\*{3}[^*\n]{2,100}?\.\*{3}|$)/g;
  for (const match of body.matchAll(re)) parts.push({ name: clean(match[1]), body: clean(match[2]) });
  return parts;
}
function classifyFeatureBody(feature) {
  const inline = extractInlineSections(feature.raw);
  if (!inline.length) return;
  feature.data.sections = inline;
  const lower = feature.name.toLowerCase();
  if (/crimson rite|fighting style|otherworldly attunement/i.test(lower)) feature.data.choiceOptions = inline.map((part) => ({ name: part.name, text: part.body }));
}

function titleFrom(lines, sourceName) {
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(markdownHeading); if (h) return { name: clean(h[2]), line: i, depth: h[1].length };
  }
  return { name: clean(sourceName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')) || 'Imported Homebrew', line: -1, depth: 1 };
}
function fieldValue(body, labels) {
  for (const label of labels) {
    const re = new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?(?:\\*{1,2})?${label}(?:\\*{1,2})?\\s*[:.]\\s*([^\\n]+)`, 'i');
    const m = body.match(re); if (m) return clean(m[1]);
  }
  return null;
}
function numberFrom(text) { const m = String(text || '').match(/\d+/); return m ? Number(m[0]) : null; }
function parseChoiceText(text, nounPattern) {
  if (!text) return null;
  const choose = text.match(new RegExp(`(?:choose|select|escolha|selecione)\\s+(\\d+)\\s+(?:[^.\\n]{0,30})?(?:${nounPattern})`, 'i'));
  if (!choose) return null;
  const options = text.split(/[,;]|\bor\b|\bou\b/i).map(clean).filter((x) => x && !/(choose|select|escolha|selecione)/i.test(x));
  return { count: Number(choose[1]), options };
}
function spellRefs(text) {
  const out = [];
  for (const m of String(text || '').matchAll(/\{@spell\s+([^|}]+)(?:\|[^}]*)?\}/gi)) out.push({ name: clean(m[1]) });
  return [...new Map(out.map((x) => [x.name.toLowerCase(), x])).values()];
}
function bulletItems(text) {
  return String(text || '').split('\n').map((line) => line.match(/^\s*[-*+]\s+(.+)$/)?.[1]).filter(Boolean).map((line) => {
    const q = line.match(/^(\d+)\s*[×x]?\s+(.+)$/i); return { name: clean(q?.[2] || line), quantity: q ? Number(q[1]) : 1 };
  });
}
function sections(lines, rootLine, rootDepth) {
  const out = [];
  for (let i = rootLine + 1; i < lines.length; i++) {
    const h = lines[i].match(markdownHeading); if (!h) continue;
    const depth = h[1].length; if (depth <= rootDepth) continue;
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) { const next = lines[j].match(markdownHeading); if (next && next[1].length <= depth) { end = j; break; } }
    out.push({ name: clean(h[2]), body: bodyUntil(lines, i + 1, end), line: i, depth }); i = end - 1;
  }
  return out;
}
function parseSpeed(text) {
  if (!text) return null;
  const feet = text.match(/(\d+)\s*(?:ft\.?|feet|pés)/i); return feet ? Number(feet[1]) : numberFrom(text) || text;
}
function parseItemKind(stat, body) {
  const s = `${stat || ''} ${body || ''}`;
  if (/wondrous|maravilhoso/i.test(s)) return 'wondrous'; if (/weapon|arma/i.test(s)) return 'weapon'; if (/armor|armadura/i.test(s)) return 'armor';
  if (/potion|poção/i.test(s)) return 'potion'; if (/ring|anel/i.test(s)) return 'ring'; if (/wand|varinha/i.test(s)) return 'wand'; if (/rod|bastão/i.test(s)) return 'rod';
  if (/pack|kit|container|recipiente|mochila|bolsa|quiver|aljava/i.test(s)) return 'container'; return 'equipment';
}
function parseGenericMarkdown(markdown, { sourceName, expectedKind }) {
  const ir = createDocumentIR({ sourceType: '5etools-markdown', sourceName, raw: markdown });
  const lines = String(markdown || '').replace(/\r/g, '').split('\n');
  const title = titleFrom(lines, sourceName), kind = expectedKind === 'race' ? 'species' : expectedKind;
  const root = createEntityIR({ kind, name: title.name, sourcePath: `line:${Math.max(1, title.line + 1)}`, raw: '' });
  ir.entities.push(root);
  const childSections = sections(lines, title.line, title.depth);
  const firstChildLine = childSections[0]?.line ?? lines.length;
  const intro = bodyUntil(lines, Math.max(0, title.line + 1), firstChildLine);
  root.raw = intro;
  const whole = [intro, ...childSections.map((s) => `${s.name}\n${s.body}`)].join('\n\n');

  if (kind === 'species') {
    root.data.size = fieldValue(intro, ['Size', 'Tamanho']);
    root.data.speed = parseSpeed(fieldValue(intro, ['Speed', 'Deslocamento', 'Movement']));
    root.data.languages = fieldValue(intro, ['Languages?', 'Idiomas?']);
    root.data.languageChoices = parseChoiceText(root.data.languages || whole, 'languages?|idiomas?');
    root.data.spellGrants = spellRefs(whole);
    const ignored = /^(description|descrição|appearance|aparência|age|idade|alignment|alinhamento|size|tamanho|speed|deslocamento|languages?|idiomas?)$/i;
    root.data.traits = childSections.filter((s) => !ignored.test(s.name)).map((s) => ({ name: s.name, rules: [s.body], sourcePath: `line:${s.line + 1}` }));
  } else if (kind === 'background') {
    const skills = fieldValue(intro, ['Skill Proficiencies', 'Skills?', 'Perícias?']);
    const langs = fieldValue(intro, ['Languages?', 'Idiomas?']);
    const tools = fieldValue(intro, ['Tool Proficiencies', 'Tools?', 'Ferramentas?']);
    root.data.skillChoices = parseChoiceText(skills || whole, 'skills?|perícias?') || skills;
    root.data.languageChoices = parseChoiceText(langs || whole, 'languages?|idiomas?') || langs;
    root.data.toolChoices = parseChoiceText(tools || whole, 'tools?|ferramentas?') || tools;
    const equipmentSection = childSections.find((s) => /^(starting )?equipment|equipamento( inicial)?$/i.test(s.name));
    root.data.startingEquipment = bulletItems(equipmentSection?.body || fieldValue(intro, ['Starting Equipment', 'Equipment', 'Equipamento Inicial', 'Equipamento']) || '');
    root.data.features = childSections.filter((s) => !/equipment|equipamento|suggested characteristics|características sugeridas/i.test(s.name)).map((s) => ({ name: s.name, rules: [s.body], sourcePath: `line:${s.line + 1}` }));
  } else if (kind === 'feat') {
    root.data.prerequisite = fieldValue(intro, ['Prerequisite', 'Pré-requisito', 'Prerequisites', 'Pré-requisitos']);
    const asi = fieldValue(whole, ['Ability Score Increase', 'Aumento no Valor de Habilidade']);
    root.data.abilityChoices = asi ? { text: asi } : null;
    root.data.spellGrants = spellRefs(whole);
    root.data.activities = childSections.filter((s) => /action|ação|bonus action|ação bônus|reaction|reação|attack|ataque|cast|conjurar/i.test(`${s.name} ${s.body}`)).map((s) => ({ type: /reaction|reação/i.test(s.name) ? 'reaction' : /bonus action|ação bônus/i.test(s.name) ? 'bonusAction' : 'action', name: s.name, text: s.body }));
    root.data.rules = [whole].filter(Boolean);
  } else if (kind === 'item') {
    const statLine = lines.slice(title.line + 1, firstChildLine).find((line) => /^\s*\*[^*].*\*\s*$/.test(line)) || '';
    root.data.itemKind = parseItemKind(statLine, whole);
    root.data.attunement = /requires attunement|requer sintonização|requer sintonia/i.test(`${statLine} ${whole}`);
    root.data.slot = fieldValue(intro, ['Slot', 'Espaço']);
    root.data.damage = fieldValue(intro, ['Damage', 'Dano']);
    root.data.armor = fieldValue(intro, ['Armor Class', 'AC', 'Classe de Armadura', 'CA']);
    const props = fieldValue(intro, ['Properties', 'Propriedades']); root.data.properties = props ? props.split(/[,;]/).map(clean).filter(Boolean) : [];
    root.data.charges = numberFrom(fieldValue(whole, ['Charges', 'Cargas']));
    root.data.recovery = fieldValue(whole, ['Recharge', 'Recovery', 'Recarga', 'Recuperação']);
    root.data.activities = childSections.filter((s) => /action|ação|bonus action|ação bônus|reaction|reação|use|uso|attack|ataque/i.test(`${s.name} ${s.body}`)).map((s) => ({ type: /reaction|reação/i.test(s.name) ? 'reaction' : /bonus action|ação bônus/i.test(s.name) ? 'bonusAction' : 'action', name: s.name, text: s.body }));
    const contentSection = childSections.find((s) => /contents?|conteúdo|itens incluídos|included items|equipment/i.test(s.name));
    root.data.containedItems = bulletItems(contentSection?.body || '');
    root.data.container = root.data.itemKind === 'container' || root.data.containedItems.length > 0;
    root.data.rules = [whole].filter(Boolean);
  }
  return ir;
}

function parseClassMarkdown(markdown, { sourceName = 'markdown' } = {}) {
  const ir = createDocumentIR({ sourceType: '5etools-markdown', sourceName, raw: markdown });
  const lines = String(markdown || '').replace(/\r/g, '').split('\n');
  let currentClass = null, currentSubclass = null;
  for (let i = 0; i < lines.length; i++) {
    const heading = lines[i].match(markdownHeading); if (!heading) continue;
    const depth = heading[1].length, title = clean(heading[2]);
    if (depth === 2) {
      if (!currentClass) { currentClass = createEntityIR({ kind: 'class', name: title, sourcePath: `line:${i + 1}`, raw: '' }); ir.entities.push(currentClass); currentSubclass = null; }
      else { currentSubclass = createEntityIR({ kind: 'subclass', name: title, parentId: currentClass.name, sourcePath: `line:${i + 1}` }); attach(currentClass, currentSubclass); }
      continue;
    }
    const level = title.match(levelHeading);
    if (depth === 4 && level && currentClass && !currentSubclass) {
      const end = findNextBoundary(lines, i + 1, false), feature = createEntityIR({ kind: 'classFeature', name: clean(level[2]), parentId: currentClass.name, level: Number(level[1]), sourcePath: `line:${i + 1}`, raw: bodyUntil(lines, i + 1, end) });
      classifyFeatureBody(feature); attach(currentClass, feature); i = end - 1; continue;
    }
    if (depth === 4 && currentSubclass) {
      const end = findNextBoundary(lines, i + 1, true), maybeLevel = title.match(levelHeading), feature = createEntityIR({ kind: 'subclassFeature', name: clean(maybeLevel?.[2] || title), parentId: currentSubclass.name, level: maybeLevel ? Number(maybeLevel[1]) : null, sourcePath: `line:${i + 1}`, raw: bodyUntil(lines, i + 1, end) });
      if (!feature.level) unresolved(feature, 'level', 'Subclass feature has no explicit level in the Markdown.', title);
      classifyFeatureBody(feature); attach(currentSubclass, feature); i = end - 1;
    }
  }
  if (!currentClass) { addDiagnostic(ir, { code: 'NO_CLASS', severity: 'error', message: 'No level-2 class heading was found.' }); return ir; }
  for (const subclass of currentClass.children.filter((child) => child.kind === 'subclass')) {
    const sectionStart = Number(subclass.sourcePath.split(':')[1]) - 1;
    const nextSubclass = currentClass.children.filter((child) => child.kind === 'subclass').map((child) => Number(child.sourcePath.split(':')[1]) - 1).find((lineNo) => lineNo > sectionStart) ?? lines.length;
    for (let i = sectionStart + 1; i < nextSubclass; i++) {
      const match = lines[i].trim().match(boldLevelHeading); if (!match) continue;
      const name = clean(match[2]); if (subclass.children.some((child) => child.name === name && child.level === Number(match[1]))) continue;
      const end = findNextBoundary(lines, i + 1, true), feature = createEntityIR({ kind: 'subclassFeature', name, parentId: subclass.name, level: Number(match[1]), sourcePath: `line:${i + 1}`, raw: [match[3], bodyUntil(lines, i + 1, Math.min(end, nextSubclass))].filter(Boolean).join('\n').trim() });
      classifyFeatureBody(feature); attach(subclass, feature);
    }
  }
  for (let i = 0; i < lines.length - 2; i++) {
    const table = parseTable(lines, i); if (!table) continue;
    const lineNo = i + 1, candidates = [];
    for (const entity of [currentClass, ...currentClass.children, ...currentClass.children.flatMap((child) => child.children || [])]) { if (!entity?.sourcePath) continue; const start = Number(entity.sourcePath.split(':')[1]); if (start <= lineNo) candidates.push(entity); }
    const owner = candidates.sort((a, b) => Number(b.sourcePath.split(':')[1]) - Number(a.sourcePath.split(':')[1]))[0];
    if (owner) { owner.data.tables ||= []; owner.data.tables.push({ header: table.header, rows: table.rows }); }
    i = table.end - 1;
  }
  return ir;
}

export function parse5etoolsMarkdown(markdown, { sourceName = 'markdown', expectedKind = 'class' } = {}) {
  if (expectedKind && expectedKind !== 'class') return parseGenericMarkdown(markdown, { sourceName, expectedKind });
  return parseClassMarkdown(markdown, { sourceName });
}
