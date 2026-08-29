#!/usr/bin/env node
/**
 * يمسح الأيقونات المستعملة ويكتب ملفاً لكل واحدة.
 * `node scripts/scan-lucide-icons.mjs --write`
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const write = process.argv.includes('--write');
const result = spawnSync(process.execPath, [path.join(ROOT, 'scripts/write-lucide-icon-modules.mjs')], {
    stdio: 'inherit',
    cwd: ROOT,
});
if (result.status !== 0) process.exit(result.status ?? 1);
if (!write) {
    console.log('[scan-lucide-icons] modules written; pass --write (نفس السلوك — التوافق مع icons:scan)');
}
