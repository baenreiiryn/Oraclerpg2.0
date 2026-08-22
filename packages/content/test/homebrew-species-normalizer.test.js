import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../../..');
const script = fs.readFileSync(path.join(repoRoot, 'public/homebrew-species-normalizer.js'), 'utf8');

function loadNormalizer() {
  const window = {
    addEventListener() {},
    dispatchEvent() {},
    OracleAccountData: null,
  };
  const storage = new Map();
  const context = {
    window,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, String(value)),
    },
    structuredClone: globalThis.structuredClone,
    CustomEvent: class CustomEvent {},
    setTimeout() { return 0; },
    console,
  };
  vm.runInNewContext(script, context, { filename: 'homebrew-species-normalizer.js' });
  return window.OracleSpeciesHomebrewNormalizer;
}

test('Cambion-style imported species splits embedded traits into species-feature entities', () => {
  const normalizer = loadNormalizer();
  const speciesId = 'homebrew:species:cambion';
  const library = [{
    id: speciesId,
    canonicalId: speciesId,
    category: 'species',
    name: 'Cambion',
    entity: {
      id: speciesId,
      canonicalId: speciesId,
      entityType: 'species',
      name: 'Cambion',
      data: {
        features: [
          {
            name: 'Fiendish Legacy',
            description: 'You know the Fire Bolt cantrip. At higher levels, you can cast Hellish Rebuke and Darkness.',
            grantedSpells: ['fire-bolt', 'hellish-rebuke', 'darkness'],
          },
          {
            name: 'Darkvision',
            description: 'You can see in dim light within 60 feet as if it were bright light.',
          },
          {
            name: 'Fiendish Resistance',
            description: 'You have resistance to fire damage.',
            resistances: ['fire'],
          },
        ],
        text: { rules: [] },
      },
    },
  }];

  const normalized = normalizer.normalizeLibrary(library);
  assert.ok(normalized);
  const species = normalized.find((entry) => entry.category === 'species');
  const features = normalized.filter((entry) => entry.category === 'species-features');

  assert.equal(features.length, 3);
  assert.equal(species.entity.data.features.length, 3);
  assert.ok(species.entity.data.features.every((ref) => ref.entityType === 'feature' && ref.canonicalId));

  const legacy = features.find((entry) => entry.name === 'Fiendish Legacy');
  const darkvision = features.find((entry) => entry.name === 'Darkvision');
  const resistance = features.find((entry) => entry.name === 'Fiendish Resistance');

  assert.deepEqual(Array.from(legacy.entity.data.grantedSpells), ['fire-bolt', 'hellish-rebuke', 'darkness']);
  assert.equal(legacy.entity.data.speciesTemplate.family, 'spellcasting');
  assert.equal(darkvision.entity.data.speciesTemplate.family, 'sense');
  assert.equal(resistance.entity.data.speciesTemplate.family, 'resistance');
  assert.deepEqual(Array.from(resistance.entity.data.resistances), ['fire']);
});

test('species trait names can be recovered from markdown rule sections', () => {
  const normalizer = loadNormalizer();
  const speciesId = 'homebrew:species:cambion-markdown';
  const library = [{
    id: speciesId,
    canonicalId: speciesId,
    category: 'species',
    name: 'Cambion',
    entity: {
      id: speciesId,
      canonicalId: speciesId,
      entityType: 'species',
      name: 'Cambion',
      data: {
        features: ['Fiendish Legacy', 'Darkvision'],
        text: {
          rules: [
            '### Fiendish Legacy\nYou know the Fire Bolt cantrip and later learn additional spells.\n\n### Darkvision\nYou can see in darkness within 60 feet.',
          ],
        },
      },
    },
  }];

  const normalized = normalizer.normalizeLibrary(library);
  const features = normalized.filter((entry) => entry.category === 'species-features');
  assert.equal(features.length, 2);
  assert.match(features.find((entry) => entry.name === 'Fiendish Legacy').entity.data.text.rules[0], /Fire Bolt/);
  assert.equal(features.find((entry) => entry.name === 'Fiendish Legacy').entity.data.speciesTemplate.family, 'spellcasting');
});

test('new account and portrait scripts remain valid JavaScript', () => {
  for (const file of [
    'public/account-data.js',
    'public/home-campaign-account-sync.js',
    'public/campaign-portrait-editor.js',
    'public/theme.js',
    'public/auth-gate.js',
  ]) {
    const source = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    assert.doesNotThrow(() => new vm.Script(source), `${file} should parse`);
  }
});
