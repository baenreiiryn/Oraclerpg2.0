import { parse5etoolsJson } from './5etools-adapter.mjs';
import { parse5etoolsMarkdown } from './markdown-adapter.mjs';
import { compileClassDocument } from './class-compiler.mjs';

export function importClass(source, { format = 'auto', sourceName = '' } = {}) {
  let ir;
  if (format === '5etools-json' || (format === 'auto' && source && typeof source === 'object')) {
    ir = parse5etoolsJson(source, { sourceName });
  } else {
    ir = parse5etoolsMarkdown(String(source || ''), { sourceName });
  }
  return { ir, ...compileClassDocument(ir) };
}

export { parse5etoolsJson, parse5etoolsMarkdown, compileClassDocument };
