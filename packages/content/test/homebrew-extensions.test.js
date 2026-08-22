import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const ext = fs.readFileSync(path.join(root, 'public/compendium-homebrew-extensions.js'), 'utf8');
const pt = fs.readFileSync(path.join(root, 'public/compendium-dnd.html'), 'utf8');
const en = fs.readFileSync(path.join(root, 'public/en/compendium-dnd.html'), 'utf8');
const translate = fs.readFileSync(path.join(root, 'api/ai/translate-homebrew.mjs'), 'utf8');

test('Homebrew extensions compile and load in both compendiums', () => {
  assert.doesNotThrow(() => new vm.Script(ext));
  assert.match(pt, /compendium-homebrew-extensions\.js/);
  assert.match(en, /compendium-homebrew-extensions\.js/);
});

test('Homebrew extensions support backgrounds and languages', () => {
  assert.match(ext, /entityType:type/);
  assert.match(ext, /backgroundTemplate/);
  assert.match(ext, /languageTemplate/);
  assert.match(ext, /skillProficiencies/);
  assert.match(ext, /typicalSpeakers/);
  assert.match(ext, /Importar JSON/);
});

test('Homebrew delete persists the updated account library', () => {
  assert.match(ext, /OracleAccountData\?\.saveHomebrew/);
  assert.match(ext, /hbDeleteVisible/);
  assert.match(ext, /filter\(x=>x\.id!==e\.id\)/);
});

test('Homebrew translation only sends display text and preserves entity mechanics client-side', () => {
  assert.match(ext, /function safeTexts\(entity\)/);
  assert.match(ext, /data\.text/);
  assert.match(ext, /higherLevelRules/);
  assert.doesNotMatch(ext, /canonicalId\s*=\s*t\./);
  assert.doesNotMatch(ext, /entityType\s*=\s*t\./);
});

test('translation endpoint requires auth and protected BYOK credentials', () => {
  assert.match(translate, /requireSession\(req\)/);
  assert.match(translate, /resolveByokCredential\(session\.user\.id, provider\)/);
  assert.match(translate, /Não altere números, fórmulas, IDs, canonicalIds, enums/);
  assert.match(translate, /\/chat\/completions/);
});
