import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = 'packages/content/data/srd-5.2';
const IMAGE_REPO = 'LoganMagelight/5etools-img';
const IMAGE_BRANCH = 'main';
const RAW_BASE = `https://raw.githubusercontent.com/${IMAGE_REPO}/${IMAGE_BRANCH}`;
const API_BASE = `https://api.github.com/repos/${IMAGE_REPO}`;

const COLLECTION_FILES = [
  'items.json',
  'spells.json',
  'monsters.json',
  'monster-features.json',
  'species.json',
  'species-features.json',
  'feats.json',
  'classes.json',
  'subclasses.json',
  'class-features.json',
].filter(Boolean);

const CATEGORY_BY_ENTITY = {
  monster: ['bestiary'],
  item: ['items'],
  spell: ['spells'],
  species: ['races'],
  class: ['classes'],
  subclass: ['classes'],
};

const CATEGORY_BY_FEATURE_KIND = {
  monsterFeature: ['bestiary'],
  speciesFeature: ['races'],
  feat: ['feats'],
  classFeature: ['classes'],
  subclassFeature: ['classes'],
  backgroundFeature: ['backgrounds'],
};

const normalize = value => String(value ?? '')
  .normalize('NFKD')
  .replace(/[’‘]/g, "'")
  .replace(/&/g, 'and')
  .replace(/[^a-zA-Z0-9]+/g, '')
  .toLowerCase();

const imageExt = /\.(webp|png|jpe?g|gif|svg)$/i;
const mimeFor = p => p.endsWith('.png') ? 'image/png'
  : p.endsWith('.jpg') || p.endsWith('.jpeg') ? 'image/jpeg'
  : p.endsWith('.gif') ? 'image/gif'
  : p.endsWith('.svg') ? 'image/svg+xml'
  : 'image/webp';

const encodedPath = p => p.split('/').map(encodeURIComponent).join('/');

async function githubJson(url) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'OracleRPG-media-sync' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`GitHub ${response.status}: ${url}`);
  return response.json();
}

async function getCategoryTrees() {
  const root = await githubJson(`${API_BASE}/contents?ref=${IMAGE_BRANCH}`);
  const wanted = new Set(['bestiary','items','spells','races','feats','classes','backgrounds']);
  const entries = root.filter(x => x.type === 'dir' && wanted.has(x.name));
  const result = new Map();
  for (const entry of entries) {
    const tree = await githubJson(`${API_BASE}/git/trees/${entry.sha}?recursive=1`);
    const images = (tree.tree ?? [])
      .filter(x => x.type === 'blob' && imageExt.test(x.path))
      .map(x => ({ category: entry.name, path: `${entry.name}/${x.path}`, size: x.size ?? undefined }));
    result.set(entry.name, images);
  }
  return result;
}

function buildIndex(categoryTrees) {
  const index = new Map();
  for (const [category, images] of categoryTrees) {
    const byName = new Map();
    for (const image of images) {
      const base = path.basename(image.path).replace(imageExt, '');
      const key = normalize(base.replace(/(?:[-_ ]?(?:token|portrait|thumbnail|thumb))$/i, ''));
      if (!key) continue;
      const list = byName.get(key) ?? [];
      list.push(image);
      byName.set(key, list);
    }
    index.set(category, byName);
  }
  return index;
}

function categoriesFor(entity) {
  if (entity.entityType === 'feature') {
    return CATEGORY_BY_FEATURE_KIND[entity.data?.featureKind] ?? ['feats','races','bestiary','classes'];
  }
  return CATEGORY_BY_ENTITY[entity.entityType] ?? [];
}

function scoreCandidate(entity, image) {
  const lower = image.path.toLowerCase();
  let score = 0;
  const sourceBook = String(entity.source?.book ?? '').toLowerCase();
  if (sourceBook && lower.includes(`/${sourceBook}/`)) score += 20;
  if (entity.entityType === 'monster') {
    if (lower.includes('/token') || lower.includes('/tokens/')) score += 8;
    if (!lower.includes('/token') && !lower.includes('/tokens/')) score += 4;
  } else if (lower.includes('/token') || lower.includes('/tokens/')) score -= 20;
  if (lower.includes('/thumbnail/')) score -= 5;
  if (/\.webp$/i.test(image.path)) score += 2;
  return score;
}

function roleFor(entity, image, selectedSet) {
  const lower = image.path.toLowerCase();
  if (lower.includes('/token') || lower.includes('/tokens/')) return 'token';
  if (lower.includes('/thumbnail/')) return 'thumbnail';
  if (entity.entityType === 'monster') return 'portrait';
  if (entity.entityType === 'feature') return 'icon';
  if (entity.entityType === 'item') return 'artwork';
  if (entity.entityType === 'spell') return 'artwork';
  if (entity.entityType === 'species') return 'artwork';
  if (entity.entityType === 'class' || entity.entityType === 'subclass') return 'artwork';
  return selectedSet.size ? 'artwork' : 'icon';
}

function resolveAssets(entity, index) {
  const key = normalize(entity.name);
  if (!key) return [];
  const candidates = [];
  for (const category of categoriesFor(entity)) {
    for (const image of index.get(category)?.get(key) ?? []) candidates.push(image);
  }
  if (!candidates.length) return [];
  candidates.sort((a,b) => scoreCandidate(entity,b) - scoreCandidate(entity,a) || a.path.localeCompare(b.path));

  const roles = new Set();
  const assets = [];
  for (const candidate of candidates) {
    const role = roleFor(entity, candidate, roles);
    if (roles.has(role) && role !== 'artwork') continue;
    if (role === 'artwork' && assets.filter(a => a.role === 'artwork').length >= 4) continue;
    roles.add(role);
    assets.push({
      id: `${role}:${normalize(candidate.path)}`,
      role,
      provider: '5etools-img',
      sourcePath: candidate.path,
      sourceUrl: `${RAW_BASE}/${encodedPath(candidate.path)}`,
      mimeType: mimeFor(candidate.path.toLowerCase()),
      storagePolicy: 'mirrorOnDemand',
      metadata: { repository: IMAGE_REPO, branch: IMAGE_BRANCH, ...(candidate.size ? { bytes: candidate.size } : {}) },
    });
  }
  return assets;
}

function choosePrimary(entity, assets) {
  const roles = new Set(assets.map(x => x.role));
  if (entity.entityType === 'monster' && roles.has('portrait')) return 'portrait';
  if (entity.entityType === 'feature' && roles.has('icon')) return 'icon';
  if (roles.has('artwork')) return 'artwork';
  if (roles.has('portrait')) return 'portrait';
  if (roles.has('icon')) return 'icon';
  if (roles.has('token')) return 'token';
  return assets[0]?.role;
}

const categoryTrees = await getCategoryTrees();
const index = buildIndex(categoryTrees);
const report = {
  generatedAt: new Date().toISOString(),
  provider: '5etools-img',
  repository: IMAGE_REPO,
  branch: IMAGE_BRANCH,
  collections: {},
  totals: { entities: 0, withMedia: 0, assets: 0 },
  unmatched: [],
};

for (const file of COLLECTION_FILES) {
  const filePath = `${ROOT}/${file}`;
  let raw;
  try { raw = await fs.readFile(filePath, 'utf8'); } catch { continue; }
  const doc = JSON.parse(raw);
  if (!Array.isArray(doc.items)) continue;
  const stats = { entities: doc.items.length, withMedia: 0, assets: 0, byRole: {} };
  for (const entity of doc.items) {
    const assets = resolveAssets(entity, index);
    if (assets.length) {
      entity.media = { primaryRole: choosePrimary(entity, assets), assets };
      stats.withMedia++;
      stats.assets += assets.length;
      for (const asset of assets) stats.byRole[asset.role] = (stats.byRole[asset.role] ?? 0) + 1;
    } else {
      delete entity.media;
      report.unmatched.push({ collection: file, canonicalId: entity.canonicalId, name: entity.name, entityType: entity.entityType });
    }
  }
  report.collections[file] = stats;
  report.totals.entities += stats.entities;
  report.totals.withMedia += stats.withMedia;
  report.totals.assets += stats.assets;
  await fs.writeFile(filePath, JSON.stringify(doc, null, 2));
}

report.coverage = report.totals.entities ? report.totals.withMedia / report.totals.entities : 0;
report.availableUpstreamMatchesAttached = true;
await fs.writeFile(`${ROOT}/media-coverage-audit.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ totals: report.totals, coverage: report.coverage, unmatched: report.unmatched.length }, null, 2));