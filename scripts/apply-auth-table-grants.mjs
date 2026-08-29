#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const sqlFile = join(
  ROOT,
  'supabase',
  'migrations',
  'ops',
  '20260812000003_grant_service_role_auth_tables.sql',
);

if (!existsSync(sqlFile)) {
  console.error('Missing', sqlFile);
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), 'hami-grants-'));
const dest = join(dir, 'grants.sql');
try {
  copyFileSync(sqlFile, dest);
  const r = spawnSync(
    'npx',
    ['supabase', 'db', 'query', '--yes', '--linked', `--file=${dest}`],
    { stdio: 'inherit', shell: true, cwd: ROOT, env: process.env },
  );
  process.exit(r.status ?? 1);
} finally {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
