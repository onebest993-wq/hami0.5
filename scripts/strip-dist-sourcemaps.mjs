/**
 * يحذف خرائط المصدر من `dist` بعد رفعها إلى Sentry.
 *
 * ترتيب الإصدار المقصود:
 *   1. VITE_SOURCEMAP=true npm run build
 *   2. رفع dist/assets/*.map إلى Sentry بالإصدار من scripts/app-release-identity.mjs
 *   3. node scripts/strip-dist-sourcemaps.mjs
 *   4. النشر
 *
 * Usage: node scripts/strip-dist-sourcemaps.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

if (!fs.existsSync(DIST)) {
    console.log('[strip-dist-sourcemaps] dist غير موجود — تخطٍّ');
    process.exit(0);
}

/** @param {string} dir @returns {string[]} */
function walk(dir) {
    const out = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) out.push(...walk(abs));
        else out.push(abs);
    }
    return out;
}

let removed = 0;
for (const file of walk(DIST)) {
    if (!file.endsWith('.map')) continue;
    fs.rmSync(file);
    removed += 1;
}

console.log(`[strip-dist-sourcemaps] OK — حُذفت ${removed} خريطة`);
