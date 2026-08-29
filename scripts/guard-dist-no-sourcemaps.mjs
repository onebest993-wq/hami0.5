/**
 * يمنع نشر خرائط المصدر.
 *
 * الخريطة تُعيد بناء المصدر كاملاً: منطق الصلاحيات، مسارات الواجهة الخلفية،
 * وطريقة التشفير. بناءٌ واحد بـ`VITE_SOURCEMAP=true` نُشر سهواً يكفي لتحويل
 * الحزمة المُصغَّرة إلى شيفرة مقروءة لأي زائر.
 *
 * الرفع إلى Sentry يسبق النشر: ابنِ بـVITE_SOURCEMAP=true، ارفع، ثم
 * `node scripts/strip-dist-sourcemaps.mjs` قبل الرفع إلى المستضيف.
 *
 * Usage: node scripts/guard-dist-no-sourcemaps.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');

if (!fs.existsSync(DIST)) {
    console.log('[guard-dist-no-sourcemaps] dist غير موجود — تخطٍّ');
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

const files = walk(DIST);
const maps = files.filter((f) => f.endsWith('.map')).map((f) => path.relative(DIST, f));

const inlined = files
    .filter((f) => /\.(js|css)$/.test(f))
    .filter((f) => /sourceMappingURL\s*=\s*data:/.test(fs.readFileSync(f, 'utf8')))
    .map((f) => path.relative(DIST, f));

if (maps.length || inlined.length) {
    console.error('[guard-dist-no-sourcemaps] FAIL — خرائط مصدر في المخرجات:');
    for (const m of maps.slice(0, 20)) console.error(`  .map  ${m}`);
    if (maps.length > 20) console.error(`  … و${maps.length - 20} أخرى`);
    for (const i of inlined.slice(0, 20)) console.error(`  inline ${i}`);
    console.error('[guard-dist-no-sourcemaps] شغّل: node scripts/strip-dist-sourcemaps.mjs');
    process.exit(1);
}

console.log(`[guard-dist-no-sourcemaps] OK — لا خرائط مصدر في dist (${files.length} ملفاً)`);
