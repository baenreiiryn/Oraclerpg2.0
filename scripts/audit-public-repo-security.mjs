import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'coverage', '.vercel']);
const issues = [];

const secretPatterns = [
  ['OpenAI-style secret', /\bsk-[A-Za-z0-9_-]{20,}\b/g],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{30,}\b/g],
  ['NVIDIA API key', /\bnvapi-[A-Za-z0-9_-]{16,}\b/gi],
  ['GitHub token', /\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{30,}\b/g],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g],
  ['Private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['Database URL with password', /postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@[^\s/]+/gi],
  ['Bearer token literal', /Bearer\s+[A-Za-z0-9._~-]{40,}/g],
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else inspect(full);
  }
}

function inspect(full) {
  const rel = path.relative(root, full).replaceAll('\\', '/');
  if (/^\.env(?:\.|$)/.test(path.basename(full)) && path.basename(full) !== '.env.example') {
    issues.push(`${rel}: environment file must not be tracked`);
    return;
  }
  const stat = fs.statSync(full);
  if (stat.size > 2_000_000) return;
  let source;
  try { source = fs.readFileSync(full, 'utf8'); } catch { return; }
  if (source.includes('\u0000')) return;

  for (const [name, pattern] of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(source)) issues.push(`${rel}: possible ${name}`);
  }

  if (/localStorage\.setItem\([^\n]*(?:api.?key|secret|credential|password)/i.test(source)) {
    issues.push(`${rel}: sensitive credential must not be stored in localStorage`);
  }

  if (rel.startsWith('public/') && /neonauth\.[^'"\s]+/i.test(source)) {
    issues.push(`${rel}: Neon Auth endpoint must be injected from server environment, not hardcoded in public code`);
  }
}

walk(root);

const requiredIgnored = ['.env', '.env.*'];
const gitignore = fs.readFileSync(path.join(root, '.gitignore'), 'utf8');
for (const item of requiredIgnored) {
  if (!gitignore.split(/\r?\n/).includes(item)) issues.push(`.gitignore: missing ${item}`);
}

const credentialEndpoint = path.join(root, 'api/ai/credentials.mjs');
if (!fs.existsSync(credentialEndpoint)) issues.push('api/ai/credentials.mjs: secure BYOK endpoint missing');
else {
  const endpoint = fs.readFileSync(credentialEndpoint, 'utf8');
  for (const required of ['requireSession', 'encryptSecret', 'sameOrigin', 'user.id']) {
    if (!endpoint.includes(required)) issues.push(`api/ai/credentials.mjs: missing security boundary ${required}`);
  }
}

if (issues.length) {
  console.error('PUBLIC REPOSITORY SECURITY GATE: FAILED');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log('PUBLIC REPOSITORY SECURITY GATE: PASSED');
console.log('No tracked secret-like values or browser-persisted BYOK credentials detected.');
