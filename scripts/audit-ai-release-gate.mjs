import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const issues = [];
const readText = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const readJson = (p) => JSON.parse(readText(p));

const roadmap = readText('docs/ORACLE_AI_2_ROADMAP.md');
for (let phase = 1; phase <= 5; phase += 1) {
  const section = roadmap.match(new RegExp(`## AI-${phase}[^]*?(?=\\n## AI-|\\n### Release|$)`));
  if (!section || !/\*\*Status: COMPLETE\*\*/.test(section[0])) {
    issues.push(`AI-${phase} is not marked COMPLETE in roadmap`);
  }
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
  if (/from\s+["']@oraclerpg\/(runtime|core|schema)["']/.test(source)) {
    issues.push(`AI source imports authoritative package: ${path.relative(root, file)}`);
  }
  if (/WorldState(Service|StorePort)/.test(source)) {
    issues.push(`AI source references world mutation/storage authority: ${path.relative(root, file)}`);
  }
}

const orchestrator = readText('packages/runtime/src/turn-orchestrator.ts');
const capabilityGate = orchestrator.indexOf('capabilityAllowsProposal');
const validatorGate = orchestrator.indexOf('actionValidator.validate');
const executorGate = orchestrator.indexOf('actionExecutor.execute');
if (capabilityGate < 0 || validatorGate < 0 || executorGate < 0 || !(capabilityGate < validatorGate && validatorGate < executorGate)) {
  issues.push('Turn Orchestrator gate order must be capability -> validator -> executor');
}

const compendium = readJson('packages/content/data/srd-5.2/compendium-final-audit.json');
if (compendium.status !== 'SUPPORTED' || (compendium.issues?.length ?? 0) !== 0) {
  issues.push('Persisted SRD 5.2 compendium audit is not SUPPORTED');
}
const expectedTotals = { classes: 12, subclasses: 12, classFeatures: 274, items: 550, spells: 340 };
for (const [key, value] of Object.entries(expectedTotals)) {
  if (compendium.totals?.[key] !== value) issues.push(`Compendium total ${key} expected ${value}, got ${compendium.totals?.[key]}`);
}

const report = {
  status: issues.length ? 'UNSUPPORTED' : 'SUPPORTED',
  phases: ['AI-1', 'AI-2', 'AI-3', 'AI-4', 'AI-5'],
  authorityBoundary: 'AI proposes; Runtime validates and mutates',
  compendium: compendium.totals,
  issues,
};
console.log(JSON.stringify(report, null, 2));
if (issues.length) process.exit(1);
