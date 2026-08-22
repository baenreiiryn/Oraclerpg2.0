const slugify = (value) => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function stableId(...parts) {
  return parts.map(slugify).filter(Boolean).join(':');
}

export function createDocumentIR({ sourceType, sourceName = '', raw = '' }) {
  return {
    kind: 'oracle-import-document',
    version: 1,
    source: { type: sourceType, name: sourceName },
    raw,
    entities: [],
    diagnostics: [],
  };
}

export function addDiagnostic(ir, diagnostic) {
  ir.diagnostics.push({ severity: 'warning', ...diagnostic });
  return diagnostic;
}

export function createEntityIR({ kind, name, sourcePath = '', parentId = null, level = null, raw = '', data = {} }) {
  return {
    kind,
    name,
    sourcePath,
    parentId,
    level,
    raw,
    data,
    children: [],
    status: 'structured',
    diagnostics: [],
  };
}

export function unresolved(entity, field, reason, raw = '') {
  entity.status = entity.status === 'structured' ? 'partial' : entity.status;
  entity.diagnostics.push({ severity: 'warning', code: 'UNRESOLVED', field, reason, raw });
}

export function attach(parent, child) {
  parent.children.push(child);
  return child;
}
