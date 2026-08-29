/**
 * يضمن أن fixture الكتالوج متزامن مع src/app/api — لا drift صامت.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALL_BFF_ENDPOINTS } from '@/app/security/__tests__/wifeRedTeamHelpers';
import { WIFE_BOOTSTRAP_API_PATHS, WIFE_UNSIGNED_API_PREFIXES } from '@/app/security/wifePublicApi';

const ROOT = path.resolve(process.cwd());
const API_ROOT = path.join(ROOT, 'src', 'app', 'api');
const FIXTURE = path.join(ROOT, 'e2e', 'fixtures', 'wife-protected-routes.json');

const PUBLIC_PREFIXES = [...WIFE_UNSIGNED_API_PREFIXES];
const BOOTSTRAP_PATHS = new Set<string>(WIFE_BOOTSTRAP_API_PATHS);

function walk(dir: string, acc: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, acc);
    else if (ent.name === 'route.ts') acc.push(full);
  }
  return acc;
}

function toApiPath(filePath: string): string {
  const rel = path.relative(API_ROOT, filePath).replace(/\\/g, '/');
  return `/api/${rel.replace(/\/route\.ts$/, '')}`;
}

function detectMethods(source: string): string[] {
  const methods: string[] = [];
  for (const m of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
    if (new RegExp(`export\\s+async\\s+function\\s+${m}\\b`).test(source)) methods.push(m);
  }
  return methods;
}

function buildFreshCatalog() {
  const routes = walk(API_ROOT);
  const catalog = { public: [] as string[], bootstrap: [] as string[], protected: [] as string[] };
  for (const file of routes.sort()) {
    const source = fs.readFileSync(file, 'utf8');
    const apiPath = toApiPath(file);
    const methods = detectMethods(source);
    const bucket = PUBLIC_PREFIXES.some((p) => apiPath.startsWith(p))
      ? 'public'
      : BOOTSTRAP_PATHS.has(apiPath)
        ? 'bootstrap'
        : 'protected';
    for (const method of methods) {
      catalog[bucket].push(`${method} ${apiPath}`);
    }
  }
  for (const k of ['public', 'bootstrap', 'protected'] as const) {
    catalog[k].sort();
  }
  return catalog;
}

function loadFixtureKeys() {
  const raw = JSON.parse(fs.readFileSync(FIXTURE, 'utf8')) as {
    public: Array<{ method: string; path: string }>;
    bootstrap: Array<{ method: string; path: string }>;
    protected: Array<{ method: string; path: string }>;
  };
  const toKeys = (arr: Array<{ method: string; path: string }>) =>
    arr.map((h) => `${h.method} ${h.path}`).sort();
  return {
    public: toKeys(raw.public),
    bootstrap: toKeys(raw.bootstrap),
    protected: toKeys(raw.protected),
  };
}

describe('WIFE route catalog integrity', () => {
  it('fixture يطابق مسح src/app/api (شغّل npm run generate:wife-catalog عند drift)', () => {
    expect(fs.existsSync(FIXTURE)).toBe(true);
    const fresh = buildFreshCatalog();
    const fixture = loadFixtureKeys();
    expect(fixture.public).toEqual(fresh.public);
    expect(fixture.bootstrap).toEqual(fresh.bootstrap);
    expect(fixture.protected).toEqual(fresh.protected);
    expect(fixture.protected.length).toBeGreaterThanOrEqual(85);
  });

  it('قائمة فيضان الوحدة مجموعة جزئية من الكتالوج الحي', () => {
    const fresh = buildFreshCatalog();
    const catalogKeys = new Set(fresh.protected);
    for (const ep of ALL_BFF_ENDPOINTS) {
      expect(catalogKeys.has(`${ep.method} ${ep.path}`), `${ep.method} ${ep.path} missing from catalog`).toBe(
        true,
      );
    }
  });

  it('كل route.ts له method واحد على الأقل', () => {
    const routes = walk(API_ROOT);
    const empty = routes.filter((f) => detectMethods(fs.readFileSync(f, 'utf8')).length === 0);
    expect(empty, empty.join('\n')).toEqual([]);
  });
});
