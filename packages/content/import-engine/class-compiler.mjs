import { stableId } from './ir.mjs';

const arr = (value) => Array.isArray(value) ? value : value == null ? [] : [value];
const textOf = (node) => String(node?.raw || arr(node?.data?.entries).join('\n\n') || '').trim();

function wrapper(category, entity) {
  return {
    id: entity.canonicalId,
    canonicalId: entity.canonicalId,
    category,
    entityType: entity.entityType,
    name: entity.name,
    summary: entity.data?.text?.summary || '',
    entity,
  };
}

function compileFeature(node, { classId, subclassId = null, className, subclassName = '' }) {
  const id = subclassId
    ? `${subclassId}:feature:${stableId(node.name)}`
    : `${classId}:feature:${stableId(node.name)}`;
  const rules = textOf(node);
  const featureKind = subclassId ? 'subclassFeature' : 'classFeature';
  const data = {
    featureKind,
    category: stableId(subclassName || className),
    level: node.level ?? null,
    parentClassId: classId,
    requiredSubclassId: subclassId,
    activities: [],
    choices: arr(node.data?.choiceOptions).map((option, index) => ({
      id: `${id}:option:${index + 1}:${stableId(option.name)}`,
      name: option.name,
      description: option.text || '',
    })),
    tables: arr(node.data?.tables),
    sourceData: node.data || {},
    importStatus: node.status || 'structured',
    unresolved: arr(node.diagnostics),
    text: {
      summary: (rules.split(/\n\s*\n|\n/)[0] || node.name).slice(0, 600),
      rules: rules ? [rules] : [],
    },
  };

  const table = arr(node.data?.tables).find((entry) => {
    const headers = arr(entry.header).join(' ').toLowerCase();
    return /cantrips? known/.test(headers) && /spell slots?/.test(headers);
  });
  if (table) {
    data.spellcastingProgression = {
      type: 'pact',
      columns: table.header,
      rows: table.rows,
    };
  }

  return {
    id,
    canonicalId: id,
    entityType: 'feature',
    name: node.name,
    system: { gameSystem: 'dnd2024', rulesVersion: '2024' },
    source: { sourceId: 'homebrew' },
    provenance: { origin: 'homebrew', provider: 'oracle-import-engine' },
    schemaVersion: 1,
    data,
  };
}

function compileSubclass(node, { classId, className }) {
  const id = `${classId}:subclass:${stableId(node.name)}`;
  const features = node.children.filter((child) => child.kind === 'subclassFeature');
  const featureEntities = features.map((feature) => compileFeature(feature, {
    classId, subclassId: id, className, subclassName: node.name,
  }));
  const advancement = Array.from({ length: 20 }, (_, index) => ({ level: index + 1, features: [] }));
  for (const feature of featureEntities) {
    if (Number.isInteger(feature.data.level) && feature.data.level >= 1 && feature.data.level <= 20) {
      advancement[feature.data.level - 1].features.push(feature.canonicalId);
    }
  }
  return {
    entity: {
      id,
      canonicalId: id,
      entityType: 'subclass',
      name: node.name,
      system: { gameSystem: 'dnd2024', rulesVersion: '2024' },
      source: { sourceId: 'homebrew' },
      provenance: { origin: 'homebrew', provider: 'oracle-import-engine' },
      schemaVersion: 1,
      data: {
        parentClassId: classId,
        advancement,
        features: featureEntities.map((feature) => ({
          canonicalId: feature.canonicalId,
          name: feature.name,
          level: feature.data.level,
        })),
        unresolved: features.flatMap((feature) => arr(feature.diagnostics)),
        sourceData: node.data || {},
      },
    },
    featureEntities,
  };
}

export function compileClassDocument(ir) {
  const classNode = ir.entities.find((entity) => entity.kind === 'class');
  if (!classNode) return { entries: [], diagnostics: [...ir.diagnostics, { severity: 'error', code: 'NO_CLASS' }] };

  const classId = `homebrew:class:${stableId(classNode.name)}`;
  const classFeatures = classNode.children.filter((child) => child.kind === 'classFeature');
  const subclasses = classNode.children.filter((child) => child.kind === 'subclass');
  const classFeatureEntities = classFeatures.map((feature) => compileFeature(feature, {
    classId, className: classNode.name,
  }));
  const subclassResults = subclasses.map((subclass) => compileSubclass(subclass, {
    classId, className: classNode.name,
  }));
  const subclassEntities = subclassResults.map((result) => result.entity);
  const subclassFeatureEntities = subclassResults.flatMap((result) => result.featureEntities);

  const advancement = Array.from({ length: 20 }, (_, index) => ({
    level: index + 1,
    features: [],
    featureChoices: [],
    values: {},
  }));
  for (const feature of classFeatureEntities) {
    const level = Number(feature.data.level);
    if (!Number.isInteger(level) || level < 1 || level > 20) continue;
    advancement[level - 1].features.push(feature.canonicalId);
    if (/subclass/i.test(feature.name)) {
      advancement[level - 1].featureChoices.push({
        id: `${classId}:choice:subclass`,
        kind: 'subclass',
        count: 1,
        optionIds: subclassEntities.map((subclass) => subclass.canonicalId),
      });
    }
  }

  const classEntity = {
    id: classId,
    canonicalId: classId,
    entityType: 'class',
    name: classNode.name,
    system: { gameSystem: 'dnd2024', rulesVersion: '2024' },
    source: { sourceId: 'homebrew' },
    provenance: { origin: 'homebrew', provider: 'oracle-import-engine' },
    schemaVersion: 1,
    data: {
      hitDie: classNode.data?.hitDie ?? null,
      hitDieNumber: classNode.data?.hitDieNumber ?? 1,
      savingThrowProficiencies: arr(classNode.data?.savingThrows),
      primaryAbilities: arr(classNode.data?.primaryAbility),
      startingProficiencies: classNode.data?.startingProficiencies || null,
      startingEquipment: classNode.data?.startingEquipment || null,
      spellcastingAbility: classNode.data?.spellcastingAbility || null,
      casterProgression: classNode.data?.casterProgression || null,
      advancement,
      features: classFeatureEntities.map((feature) => ({
        canonicalId: feature.canonicalId,
        name: feature.name,
        level: feature.data.level,
      })),
      subclasses: subclassEntities.map((subclass) => ({ canonicalId: subclass.canonicalId, name: subclass.name })),
      classTableGroups: arr(classNode.data?.classTableGroups),
      importDiagnostics: [...ir.diagnostics, ...classNode.diagnostics],
      rawSourcePreserved: Boolean(ir.raw),
    },
  };

  const entries = [
    wrapper('classes', classEntity),
    ...classFeatureEntities.map((feature) => wrapper('class-features', feature)),
    ...subclassEntities.map((subclass) => wrapper('subclasses', subclass)),
    ...subclassFeatureEntities.map((feature) => wrapper('subclass-features', feature)),
  ];

  return {
    entries,
    diagnostics: [
      ...ir.diagnostics,
      ...subclasses.flatMap((subclass) => subclass.children.flatMap((feature) => arr(feature.diagnostics))),
    ],
  };
}
