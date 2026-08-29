#!/usr/bin/env node
/**
 * Generates exhaustive WIFE route catalog from src/app/api route.ts files
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const API_ROOT = path.join(ROOT, 'src', 'app', 'api');
const OUT = path.join(ROOT, 'e2e', 'fixtures', 'wife-protected-routes.json');

const PUBLIC_PREFIXES = ['/api/public'];

function readWifeBootstrapPaths() {
  const src = fs.readFileSync(path.join(ROOT, 'src/app/security/wifePublicApi.ts'), 'utf8');
  const block = src.match(/export const WIFE_BOOTSTRAP_API_PATHS = \[([\s\S]*?)\]\s*as const/)?.[1] ?? '';
  const paths = [...block.matchAll(/'(\/api\/[^']+)'/g)].map((m) => m[1]);
  if (paths.length === 0) {
    throw new Error('failed to parse WIFE_BOOTSTRAP_API_PATHS');
  }
  return new Set(paths);
}

const BOOTSTRAP_PATHS = readWifeBootstrapPaths();

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, acc);
    else if (ent.name === 'route.ts') acc.push(full);
  }
  return acc;
}

function toApiPath(filePath) {
  const rel = path.relative(API_ROOT, filePath).replace(/\\/g, '/');
  const dir = rel.replace(/\/route\.ts$/, '');
  return `/api/${dir}`;
}

function detectMethods(source) {
  const methods = [];
  for (const m of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
    if (new RegExp(`export\\s+async\\s+function\\s+${m}\\b`).test(source)) methods.push(m);
  }
  return methods;
}

function defaultBody(apiPath, method) {
  if (method === 'GET' || method === 'DELETE') return undefined;
  if (apiPath.includes('/kv-proxy')) return { action: 'get', key: 'user:probe:cases:1' };
  if (apiPath.includes('/upload/remove')) return { paths: ['guest-lawyer-1/vault/x.pdf'] };
  if (apiPath.includes('/upload/signed-url')) return { path: 'guest-lawyer-1/vault/x.pdf' };
  if (apiPath.includes('/upload')) return {};
  if (apiPath.includes('/timeline-events')) return { executionFileId: 'probe-exec', event: { id: '1', title: 't' } };
  if (apiPath.includes('/cloud-sync')) return { app_data: { probe: true } };
  if (apiPath.includes('/case-share')) return { action: 'create', recipientId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' };
  if (apiPath.includes('/forum/')) return { postId: 'p1', content: 'probe', title: 't' };
  if (apiPath.includes('/notifications/')) return { item: {}, items: [], ids: [] };
  if (apiPath.includes('/laws/')) return { law_name: 'قانون التنفيذ', confirm: true, articles: [] };
  if (apiPath.includes('/admin/consultations')) return { postId: 'p1' };
  if (apiPath.includes('/admin/devices')) return { action: 'revoke', deviceId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' };
  if (apiPath.includes('/admin/')) return { targetUserId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' };
  if (apiPath.includes('/settings/wipe')) return { confirmation: 'WRONG', version: 1 };
  if (apiPath.includes('/account/delete')) return { confirmation: 'WRONG', version: 1 };
  if (apiPath.includes('/auth/')) return {};
  return { probe: true };
}

const routes = walk(API_ROOT);
const catalog = {
  generated: new Date().toISOString(),
  totalRouteFiles: routes.length,
  public: [],
  bootstrap: [],
  protected: [],
};

for (const file of routes.sort()) {
  const source = fs.readFileSync(file, 'utf8');
  const apiPath = toApiPath(file);
  const methods = detectMethods(source);
  const bucket =
    PUBLIC_PREFIXES.some((p) => apiPath.startsWith(p)) ? 'public' :
    BOOTSTRAP_PATHS.has(apiPath) ? 'bootstrap' :
    'protected';

  for (const method of methods) {
    catalog[bucket].push({
      method,
      path: apiPath,
      body: defaultBody(apiPath, method),
    });
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(catalog, null, 2));

console.log(`WIFE route catalog → ${OUT}`);
console.log(`  route files: ${catalog.totalRouteFiles}`);
console.log(`  public hits: ${catalog.public.length}`);
console.log(`  bootstrap hits: ${catalog.bootstrap.length}`);
console.log(`  protected hits: ${catalog.protected.length}`);
