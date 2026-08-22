import { addDiagnostic, attach, createDocumentIR, createEntityIR, unresolved } from './ir.mjs';

const clean = (value) => String(value || '').replace(/\r/g, '').trim();
const levelHeading = /^(?:level|nível)\s+(\d{1,2})\s*[:—-]\s*(.+)$/i;
const boldLevelHeading = /^\*{3}(?:level|nível)\s+(\d{1,2})\s*[:—-]\s*(.+?)\.\*{3}\s*(.*)$/i;
const markdownHeading = /^(#{2,6})\s+(.+)$/;

function parseTable(lines, start) {
  if (!/^\s*\|/.test(lines[start] || '') || !/^\s*\|(?:\s*:?-{2,}:?\s*\|)+\s*$/.test(lines[start + 1] || '')) return null;
  const split = (line) => line.split('|').slice(1, -1).map((cell) => clean(cell));
  const header = split(lines[start]);
  const rows = [];
  let end = start + 2;
  while (end < lines.length && /^\s*\|/.test(lines[end])) {
    rows.push(split(lines[end]));
    end++;
  }
  return { kind: 'table', header, rows, start, end };
}

function bodyUntil(lines, from, stop) {
  return lines.slice(from, stop).join('\n').trim();
}

function findNextBoundary(lines, from, subclassMode) {
  for (let i = from; i < lines.length; i++) {
    const line = lines[i];
    const heading = line.match(markdownHeading);
    if (heading && (heading[1].length <= 4 || subclassMode)) return i;
    if (boldLevelHeading.test(line.trim())) return i;
  }
  return lines.length;
}

function extractInlineSections(body) {
  const parts = [];
  const re = /\*{3}([^*\n]{2,100}?)\.\*{3}\s*([\s\S]*?)(?=\n\s*\n\*{3}[^*\n]{2,100}?\.\*{3}|$)/g;
  for (const match of body.matchAll(re)) {
    parts.push({ name: clean(match[1]), body: clean(match[2]) });
  }
  return parts;
}

function classifyFeatureBody(feature) {
  const inline = extractInlineSections(feature.raw);
  if (!inline.length) return;
  feature.data.sections = inline;
  const lower = feature.name.toLowerCase();
  if (/crimson rite|fighting style|otherworldly attunement/i.test(lower)) {
    feature.data.choiceOptions = inline.map((part) => ({ name: part.name, text: part.body }));
  }
}

export function parse5etoolsMarkdown(markdown, { sourceName = 'markdown' } = {}) {
  const ir = createDocumentIR({ sourceType: '5etools-markdown', sourceName, raw: markdown });
  const lines = String(markdown || '').replace(/\r/g, '').split('\n');
  let currentClass = null;
  let currentSubclass = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heading = line.match(markdownHeading);
    if (!heading) continue;
    const depth = heading[1].length;
    const title = clean(heading[2]);

    if (depth === 2) {
      if (!currentClass) {
        currentClass = createEntityIR({ kind: 'class', name: title, sourcePath: `line:${i + 1}`, raw: '' });
        ir.entities.push(currentClass);
        currentSubclass = null;
      } else {
        currentSubclass = createEntityIR({ kind: 'subclass', name: title, parentId: currentClass.name, sourcePath: `line:${i + 1}` });
        attach(currentClass, currentSubclass);
      }
      continue;
    }

    const level = title.match(levelHeading);
    if (depth === 4 && level && currentClass && !currentSubclass) {
      const end = findNextBoundary(lines, i + 1, false);
      const feature = createEntityIR({
        kind: 'classFeature',
        name: clean(level[2]),
        parentId: currentClass.name,
        level: Number(level[1]),
        sourcePath: `line:${i + 1}`,
        raw: bodyUntil(lines, i + 1, end),
      });
      classifyFeatureBody(feature);
      attach(currentClass, feature);
      i = end - 1;
      continue;
    }

    if (depth === 4 && currentSubclass) {
      const end = findNextBoundary(lines, i + 1, true);
      const maybeLevel = title.match(levelHeading);
      const feature = createEntityIR({
        kind: 'subclassFeature',
        name: clean(maybeLevel?.[2] || title),
        parentId: currentSubclass.name,
        level: maybeLevel ? Number(maybeLevel[1]) : null,
        sourcePath: `line:${i + 1}`,
        raw: bodyUntil(lines, i + 1, end),
      });
      if (!feature.level) unresolved(feature, 'level', 'Subclass feature has no explicit level in the Markdown.', title);
      classifyFeatureBody(feature);
      attach(currentSubclass, feature);
      i = end - 1;
    }
  }

  if (!currentClass) {
    addDiagnostic(ir, { code: 'NO_CLASS', severity: 'error', message: 'No level-2 class heading was found.' });
    return ir;
  }

  // Parse bold inline level features used by some 5etools Markdown exports.
  for (const subclass of currentClass.children.filter((child) => child.kind === 'subclass')) {
    const sectionStart = Number(subclass.sourcePath.split(':')[1]) - 1;
    const nextSubclass = currentClass.children
      .filter((child) => child.kind === 'subclass')
      .map((child) => Number(child.sourcePath.split(':')[1]) - 1)
      .find((lineNo) => lineNo > sectionStart) ?? lines.length;
    for (let i = sectionStart + 1; i < nextSubclass; i++) {
      const match = lines[i].trim().match(boldLevelHeading);
      if (!match) continue;
      const name = clean(match[2]);
      if (subclass.children.some((child) => child.name === name && child.level === Number(match[1]))) continue;
      const end = findNextBoundary(lines, i + 1, true);
      const feature = createEntityIR({
        kind: 'subclassFeature', name, parentId: subclass.name, level: Number(match[1]), sourcePath: `line:${i + 1}`,
        raw: [match[3], bodyUntil(lines, i + 1, Math.min(end, nextSubclass))].filter(Boolean).join('\n').trim(),
      });
      classifyFeatureBody(feature);
      attach(subclass, feature);
    }
  }

  // Attach Markdown tables to the narrowest feature that encloses them.
  for (let i = 0; i < lines.length - 2; i++) {
    const table = parseTable(lines, i);
    if (!table) continue;
    const lineNo = i + 1;
    const candidates = [];
    for (const entity of [currentClass, ...currentClass.children, ...currentClass.children.flatMap((child) => child.children || [])]) {
      if (!entity?.sourcePath) continue;
      const start = Number(entity.sourcePath.split(':')[1]);
      if (start <= lineNo) candidates.push(entity);
    }
    const owner = candidates.sort((a, b) => Number(b.sourcePath.split(':')[1]) - Number(a.sourcePath.split(':')[1]))[0];
    if (owner) {
      owner.data.tables ||= [];
      owner.data.tables.push({ header: table.header, rows: table.rows });
    }
    i = table.end - 1;
  }

  return ir;
}
