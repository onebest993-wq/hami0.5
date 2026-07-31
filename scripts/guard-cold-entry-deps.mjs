/**
 * HWCAC — حارس مسار الإقلاع على dist بعد البناء.
 * يفشل إن سحب entry أو boot-ui بشكل ثابت: vendor-supabase | secure-api-client | criminal-requests | Seizure/Heirs
 *
 * الاستخدام: npm run build && node scripts/guard-cold-entry-deps.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const assetsDir = path.join(ROOT, 'dist', 'assets');
const indexHtml = path.join(ROOT, 'dist', 'index.html');

const FORBIDDEN_ON_ENTRY = [
    /^vendor-supabase-/i,
    /^secure-api-client-/i,
    /^criminal-requests-/i,
    /^ExecutionHeirs/i,
    /^SeizureRequest/i,
    /^ExecutorWorkflowConfirmModal/i,
    /^ExecutionDashboard/i,
];

const FORBIDDEN_ON_BOOT = [/^vendor-supabase-/i, /^secure-api-client-/i];

/** app-crypto مسموح على boot/entry — لا يسحب supabase إن بقي dynamic داخل CryptoService */

function fail(msg) {
    console.error(`[guard-cold-entry-deps] FAIL: ${msg}`);
    process.exit(1);
}

function parseStaticDeps(jsText) {
    const named = [...jsText.matchAll(/import(?:\{[^}]*\})?from"\.\/([^"]+)"/g)].map((m) => m[1]);
    const side = [...jsText.matchAll(/import"\.\/([^"]+)"/g)].map((m) => m[1]);
    return [...new Set([...named, ...side])];
}

if (!fs.existsSync(assetsDir) || !fs.existsSync(indexHtml)) {
    fail('dist missing — run npm run build first');
}

const html = fs.readFileSync(indexHtml, 'utf8');
const entryName = (html.match(/src="\/assets\/(index-[^"]+\.js)"/) || [])[1];
if (!entryName) fail('entry script not found in index.html');

const entryText = fs.readFileSync(path.join(assetsDir, entryName), 'utf8');
const entryDeps = parseStaticDeps(entryText);

const entryHits = entryDeps.filter((d) => FORBIDDEN_ON_ENTRY.some((re) => re.test(d)));
if (entryHits.length) {
    fail(`entry static deps forbidden: ${entryHits.join(', ')}`);
}

const bootName = entryDeps.find((d) => d.startsWith('boot-ui-primitives-'));
if (!bootName) {
    console.warn('[guard-cold-entry-deps] WARN: boot-ui-primitives not a direct entry dep (ok if inlined)');
} else {
    const bootText = fs.readFileSync(path.join(assetsDir, bootName), 'utf8');
    const bootDeps = parseStaticDeps(bootText);
    const bootHits = bootDeps.filter((d) => FORBIDDEN_ON_BOOT.some((re) => re.test(d)));
    if (bootHits.length) {
        fail(`boot-ui-primitives static deps forbidden: ${bootHits.join(', ')}`);
    }
}

const preloads = [...html.matchAll(/modulepreload[^>]+href="\/assets\/([^"]+)"/g)].map((m) => m[1]);
const preloadHits = preloads.filter((d) =>
    /SeizureRequest|ExecutionHeirs|HeirsQuick|criminal-|secure-api|vendor-supabase|ExecutionDashboard|LawyerDashboard/i.test(
        d,
    ),
);
if (preloadHits.length) {
    fail(`modulepreload forbidden: ${preloadHits.join(', ')}`);
}

console.log('[guard-cold-entry-deps] PASS');
console.log(`  entry=${entryName}`);
console.log(`  entryDeps=${entryDeps.length}`);
console.log(`  preloads=${preloads.join(', ') || '(none)'}`);
if (bootName) console.log(`  boot=${bootName}`);
