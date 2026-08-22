import { attach, createDocumentIR, createEntityIR } from './ir.mjs';

const arr = (value) => Array.isArray(value) ? value : value == null ? [] : [value];
const featureRefKey = (ref) => String(ref || '').split('|').slice(0, 3).join('|').toLowerCase();

export function parse5etoolsJson(payload, { sourceName = '5etools-json' } = {}) {
  const ir = createDocumentIR({ sourceType: '5etools-json', sourceName, raw: '' });
  const classes = arr(payload?.class);
  const classFeatures = arr(payload?.classFeature);
  const subclasses = arr(payload?.subclass);
  const subclassFeatures = arr(payload?.subclassFeature);

  for (const cls of classes) {
    const classEntity = createEntityIR({
      kind: 'class',
      name: cls.name,
      data: {
        source: cls.source || '',
        hitDie: cls.hd?.faces || null,
        hitDieNumber: cls.hd?.number || 1,
        savingThrows: arr(cls.proficiency),
        primaryAbility: arr(cls.primaryAbility),
        spellcastingAbility: cls.spellcastingAbility || null,
        casterProgression: cls.casterProgression || null,
        startingProficiencies: cls.startingProficiencies || null,
        startingEquipment: cls.startingEquipment || null,
        classTableGroups: arr(cls.classTableGroups),
        classFeatures: arr(cls.classFeatures),
      },
    });
    ir.entities.push(classEntity);

    const featureRefs = new Map();
    arr(cls.classFeatures).forEach((entry, index) => {
      const ref = typeof entry === 'string' ? entry : entry?.classFeature;
      if (!ref) return;
      featureRefs.set(featureRefKey(ref), { ref, index });
    });

    for (const feature of classFeatures) {
      if (String(feature.className || '').toLowerCase() !== String(cls.name || '').toLowerCase()) continue;
      const key = featureRefKey(`${feature.name}|${feature.className}|${feature.classSource || cls.source}|${feature.level}`);
      const matched = [...featureRefs.entries()].find(([refKey]) => refKey.startsWith(featureRefKey(`${feature.name}|${feature.className}`)));
      const entity = createEntityIR({
        kind: 'classFeature',
        name: feature.name,
        parentId: cls.name,
        level: Number(feature.level) || null,
        data: {
          source: feature.source || feature.classSource || cls.source || '',
          entries: feature.entries || [],
          choices: feature.options || feature.choose || null,
          uses: feature.uses || null,
          key,
          ref: matched?.[1]?.ref || null,
        },
      });
      attach(classEntity, entity);
    }

    for (const sub of subclasses) {
      if (String(sub.className || '').toLowerCase() !== String(cls.name || '').toLowerCase()) continue;
      const subEntity = createEntityIR({
        kind: 'subclass',
        name: sub.name,
        parentId: cls.name,
        data: {
          shortName: sub.shortName || sub.name,
          source: sub.source || '',
          classSource: sub.classSource || cls.source || '',
          subclassFeatures: arr(sub.subclassFeatures),
          additionalSpells: sub.additionalSpells || null,
        },
      });
      attach(classEntity, subEntity);

      for (const feature of subclassFeatures) {
        if (String(feature.className || '').toLowerCase() !== String(cls.name || '').toLowerCase()) continue;
        const sameSubclass = [feature.subclassShortName, feature.subclassName]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase() === String(sub.shortName || sub.name).toLowerCase());
        if (!sameSubclass) continue;
        attach(subEntity, createEntityIR({
          kind: 'subclassFeature',
          name: feature.name,
          parentId: sub.name,
          level: Number(feature.level) || null,
          data: {
            source: feature.source || sub.source || '',
            entries: feature.entries || [],
            choices: feature.options || feature.choose || null,
            uses: feature.uses || null,
          },
        }));
      }
    }
  }

  return ir;
}
