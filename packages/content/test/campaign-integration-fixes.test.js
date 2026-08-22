import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const theme=read('public/theme.js'),classNormalizer=read('public/homebrew-class-normalizer.js'),languageGuard=read('public/campaign-language-guard.js'),aiClient=read('public/oracle-ai-client.js'),aiRuntime=read('api/oracle-ai/run.mjs'),runtime=read('public/campaign-runtime-enhancements.js'),home=read('public/home-campaign-account-sync.js');

test('campaign catalog bridge includes all playable Homebrew entity families',()=>{
 assert.doesNotThrow(()=>new vm.Script(theme));
 for(const token of ['classes','class-features','subclasses','species','species-features','backgrounds','feats','spells','items'])assert.match(theme,new RegExp(token.replace('-','\\-')));
 assert.match(theme,/type==='class'/);
 assert.match(theme,/type==='background'/);
});

test('5etools markdown class normalizer creates class features and advancement',()=>{
 assert.doesNotThrow(()=>new vm.Script(classNormalizer));
 assert.match(classNormalizer,/tableLevels/);
 assert.match(classNormalizer,/class-features/);
 assert.match(classNormalizer,/featureKind:'classFeature'/);
 assert.match(classNormalizer,/advancement/);
});

test('language guard removes pseudo System source and free ungranted languages',()=>{
 assert.doesNotThrow(()=>new vm.Script(languageGuard));
 assert.match(languageGuard,/sistema/);
 assert.match(languageGuard,/freeLanguages/);
 assert.match(theme,/languageChoices/);
 assert.match(theme,/anyStandard/);
});

test('campaign AI client uses authenticated BYOK runtime and vision-capable server route',()=>{
 assert.doesNotThrow(()=>new vm.Script(aiClient));
 assert.match(aiClient,/getApiAuthHeaders/);
 assert.match(aiClient,/\/api\/oracle-ai\/run/);
 assert.match(aiRuntime,/requireSession\(req\)/);
 assert.match(aiRuntime,/resolveByokCredential/);
 assert.match(aiRuntime,/visionModelId/);
 assert.match(aiRuntime,/image_url/);
});

test('runtime enhancements organize packs, support drag/drop, manual powers and opening narration',()=>{
 assert.doesNotThrow(()=>new vm.Script(runtime));
 assert.match(runtime,/autoOrganizedV2/);
 assert.match(runtime,/quiver\|aljava/);
 assert.match(runtime,/data-container-drop/);
 assert.match(runtime,/campaignCustomFeatures/);
 assert.match(runtime,/campaignCustomSpells/);
 assert.match(runtime,/gm\.narrate/);
 assert.match(runtime,/commitMasterMessage/);
});

test('home campaign portrait is rendered as an image inside the token ring',()=>{
 assert.doesNotThrow(()=>new vm.Script(home));
 assert.match(home,/<img src=/);
 assert.doesNotMatch(home,/background-image:url/);
 assert.match(home,/characterIdentity\?\.portrait\?\.dataUrl/);
});
