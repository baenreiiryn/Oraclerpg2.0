import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const issues = [];
const readText = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const readJson = (p) => JSON.parse(readText(p));

const roadmap = readText('docs/ORACLE_AI_2_ROADMAP.md');
for (let phase = 1; phase <= 10; phase += 1) {
  const section = roadmap.match(new RegExp(`## AI-${phase}[^]*?(?=\\n## AI-|\\n### Release|$)`));
  if (!section || !/\*\*Status: COMPLETE\*\*/.test(section[0])) issues.push(`AI-${phase} is not marked COMPLETE in roadmap`);
}

const aiPkg = readJson('packages/ai/package.json');
const aiDeps = { ...(aiPkg.dependencies ?? {}), ...(aiPkg.peerDependencies ?? {}) };
for (const forbidden of ['@oraclerpg/runtime', '@oraclerpg/core', '@oraclerpg/schema']) {
  if (forbidden in aiDeps) issues.push(`AI package must not depend on ${forbidden}`);
}
for (const providerFragment of ['openai', 'anthropic', 'google-generative', 'openrouter', 'groq', 'mistral']) {
  const found = Object.keys(aiDeps).find((name) => name.toLowerCase().includes(providerFragment));
  if (found) issues.push(`AI package contains provider dependency ${found}`);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

for (const file of walk(path.join(root, 'packages/ai/src')).filter((p) => p.endsWith('.ts'))) {
  const source = fs.readFileSync(file, 'utf8');
  if (/from\s+["']@oraclerpg\/(runtime|core|schema)["']/.test(source)) issues.push(`AI source imports authoritative package: ${path.relative(root, file)}`);
  if (/WorldState(Service|StorePort)/.test(source)) issues.push(`AI source references world mutation/storage authority: ${path.relative(root, file)}`);
}

const orchestrator = readText('packages/runtime/src/turn-orchestrator.ts');
const capabilityGate = orchestrator.indexOf('capabilityAllowsProposal');
const validatorGate = orchestrator.indexOf('actionValidator.validate');
const executorGate = orchestrator.indexOf('actionExecutor.execute');
if (capabilityGate < 0 || validatorGate < 0 || executorGate < 0 || !(capabilityGate < validatorGate && validatorGate < executorGate)) {
  issues.push('Turn Orchestrator gate order must be capability -> validator -> executor');
}

const gmRuntime = readText('packages/runtime/src/gm-runtime.ts');
for (const required of ['operationRouter.run', 'capabilityAllowsProposal', 'actionValidator.validate', 'actionExecutor.execute', 'memoryExtractor.extract', 'persistence.persistTurn']) {
  if (!gmRuntime.includes(required)) issues.push(`GM Runtime missing required boundary: ${required}`);
}
if (/alias:\s*["']oracle-/.test(gmRuntime)) issues.push('GM Runtime must request semantic operations instead of selecting Oracle aliases directly');
if (/providerId|modelId/.test(gmRuntime)) issues.push('GM Runtime must not reference provider/model identity');

const router = readText('packages/ai/src/router/model-router.ts');
for (const op of ['gm.interpret-turn','gm.narrate','gm.npc-dialogue','memory.extract','session.summarize','retrieval.rerank','vision.inspect','embedding.generate']) {
  if (!router.includes(`operation: "${op}"`)) issues.push(`Model Router missing specialized operation ${op}`);
}
if (/providerId|modelId/.test(router)) issues.push('Model Router policy must route to Oracle aliases, not provider/model identities');

const gatewayTypes = readText('packages/ai/src/gateway/types.ts');
if (!gatewayTypes.includes('secretRef') || !gatewayTypes.includes('AiSecretResolverPort')) issues.push('Gateway BYOK secret isolation contract missing');

const retrieval = readText('packages/runtime/src/retrieval/hybrid-retrieval.ts');
if (!retrieval.includes('query.maxTokens') || !retrieval.includes('isVisible')) issues.push('Retrieval hard budget/visibility gates missing');

const compendium = readJson('packages/content/data/srd-5.2/compendium-final-audit.json');
if (compendium.status !== 'SUPPORTED' || (compendium.issues?.length ?? 0) !== 0) issues.push('Persisted SRD 5.2 compendium audit is not SUPPORTED');
const expectedTotals = { classes: 12, subclasses: 12, classFeatures: 274, items: 550, spells: 340 };
for (const [key, value] of Object.entries(expectedTotals)) {
  if (compendium.totals?.[key] !== value) issues.push(`Compendium total ${key} expected ${value}, got ${compendium.totals?.[key]}`);
}

const report = {
  status: issues.length ? 'UNSUPPORTED' : 'SUPPORTED',
  phases: Array.from({ length: 10 }, (_, i) => `AI-${i + 1}`),
  authorityBoundary: 'AI interprets/proposes/narrates; Runtime validates and mutates',
  routingBoundary: 'Runtime requests semantic operations; Router selects Oracle aliases; Gateway selects providers/models',
  compendium: compendium.totals,
  issues,
};
console.log(JSON.stringify(report, null, 2));
if (issues.length) process.exit(1);
