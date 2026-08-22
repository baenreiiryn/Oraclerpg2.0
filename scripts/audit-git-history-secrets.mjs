import { spawn } from 'node:child_process';
import readline from 'node:readline';

const patterns = [
  ['OpenAI-style secret', /\bsk-[A-Za-z0-9_-]{20,}\b/g],
  ['Google API key', /\bAIza[0-9A-Za-z_-]{30,}\b/g],
  ['NVIDIA API key', /\bnvapi-[A-Za-z0-9_-]{16,}\b/gi],
  ['GitHub token', /\bgh(?:p|o|u|s|r)_[A-Za-z0-9]{30,}\b/g],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g],
  ['Private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['Database URL with password', /postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/]+@[^\s/]+/gi],
  ['Long bearer token literal', /Bearer\s+[A-Za-z0-9._~-]{40,}/g],
];

const git = spawn('git', ['log', '--all', '-p', '--no-ext-diff', '--no-color'], {
  cwd: process.cwd(),
  stdio: ['ignore', 'pipe', 'inherit'],
});

const rl = readline.createInterface({ input: git.stdout, crlfDelay: Infinity });
let commit = '';
let file = '';
const findings = [];

for await (const line of rl) {
  if (line.startsWith('commit ')) commit = line.slice(7).trim();
  else if (line.startsWith('+++ b/')) file = line.slice(6).trim();
  else if (line.startsWith('--- a/') && !file) file = line.slice(6).trim();

  if (!(line.startsWith('+') || line.startsWith('-'))) continue;
  if (line.startsWith('+++') || line.startsWith('---')) continue;
  for (const [name, pattern] of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(line)) findings.push({ name, commit, file });
  }
}

const exitCode = await new Promise(resolve => git.on('close', resolve));
if (exitCode !== 0) process.exit(exitCode || 1);

const unique = [...new Map(findings.map(item => [`${item.name}:${item.commit}:${item.file}`, item])).values()];
if (unique.length) {
  console.error('GIT HISTORY SECRET AUDIT: FAILED');
  for (const finding of unique) {
    console.error(`- ${finding.name} in ${finding.file || 'unknown file'} at ${finding.commit || 'unknown commit'}`);
  }
  console.error('Rotate exposed credentials and rewrite history before making the repository public.');
  process.exit(1);
}

console.log('GIT HISTORY SECRET AUDIT: PASSED');
console.log('No high-confidence credential patterns were detected in reachable Git history.');
