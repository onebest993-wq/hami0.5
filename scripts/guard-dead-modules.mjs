/**
 * مِسنَنة الوحدات الميتة: ملف لا يصله الإقلاع ولا اختبار ولا عامل هو حجر
 * في الأساس لا يحمل شيئاً — يُبنى ويُفحص ويُصان بلا مقابل، ويضلّل من يقرأ.
 *
 * العدد مسموح أن ينزل لا أن يرتفع. الأسماء محفوظة في خط الأساس، فالحارس
 * يسمّي الوحدات الميتة الجديدة بدل أن يقول «الرقم ارتفع» وحسب.
 *
 * Usage:
 *   node scripts/guard-dead-modules.mjs            فحص
 *   node scripts/guard-dead-modules.mjs --list     سرد الكل
 *   node scripts/guard-dead-modules.mjs --save     تثبيت خط الأساس
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, '.audit', 'dead-modules-baseline.json');
const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.css'];
const toPosix = (p) => p.split(path.sep).join('/');

/** ملفات git المتتبعة فقط — untracked debris لا يُحسب «ميتاً» في البوابة */
function loadGitTrackedSourceSet() {
    const result = spawnSync('git', ['ls-files', '--cached', 'src', 'api', 'e2e'], {
        cwd: ROOT,
        encoding: 'utf8',
    });
    if (result.status !== 0 || !result.stdout?.trim()) return null;
    const set = new Set();
    for (const line of result.stdout.trim().split('\n')) {
        const rel = toPosix(line.trim());
        if (rel && /\.(ts|tsx|js|jsx|mjs)$/.test(rel)) set.add(rel);
    }
    return set;
}

function walk(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name === 'node_modules') continue;
            walk(p, out);
        } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(ent.name)) {
            out.push(p);
        }
    }
    return out;
}

function stripCommentsAndStrings(src) {
    let out = '';
    let i = 0;
    const n = src.length;
    while (i < n) {
        const c = src[i];
        const c2 = src[i + 1];
        if (c === '/' && c2 === '/') {
            while (i < n && src[i] !== '\n') i++;
            continue;
        }
        if (c === '/' && c2 === '*') {
            i += 2;
            while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
            i += 2;
            continue;
        }
        out += c;
        i++;
    }
    return out;
}

/** كل صيغة تشير إلى ملف آخر: ساكن، ديناميكي، أثر جانبي، require، وعامل عبر new URL */
function readAllSpecs(src) {
    const cleaned = stripCommentsAndStrings(src);
    const specs = new Set();
    for (const m of cleaned.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)) specs.add(m[1]);
    for (const m of cleaned.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.add(m[1]);
    for (const m of cleaned.matchAll(/^\s*import\s*['"]([^'"]+)['"]/gm)) specs.add(m[1]);
    for (const m of cleaned.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) specs.add(m[1]);
    for (const m of cleaned.matchAll(/new\s+URL\s*\(\s*['"]([^'"]+)['"]/g)) specs.add(m[1]);
    return specs;
}

function resolveSpec(fromRel, spec) {
    let base;
    if (spec.startsWith('@/app/')) base = path.join(ROOT, 'src/app', spec.slice('@/app/'.length));
    else if (spec.startsWith('@/')) base = path.join(ROOT, 'src', spec.slice(2));
    else if (spec.startsWith('.')) base = path.resolve(ROOT, path.dirname(fromRel), spec);
    else return null;

    const cands = [];
    if (path.extname(base)) {
        cands.push(base, base.replace(/\.js$/, '.ts'), base.replace(/\.js$/, '.tsx'));
    }
    for (const e of EXTS) cands.push(base + e);
    for (const e of EXTS) cands.push(path.join(base, `index${e}`));
    for (const c of cands) {
        try {
            if (fs.statSync(c).isFile()) return toPosix(path.relative(ROOT, c));
        } catch {
            /* التالي */
        }
    }
    return null;
}

const files = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'api')), ...walk(path.join(ROOT, 'e2e'))];
const graph = new Map();
for (const abs of files) {
    const rel = toPosix(path.relative(ROOT, abs));
    let text;
    try {
        text = fs.readFileSync(abs, 'utf8');
    } catch {
        continue;
    }
    const edges = new Set();
    for (const spec of readAllSpecs(text)) {
        const t = resolveSpec(rel, spec);
        if (t && t !== rel) edges.add(t);
    }
    graph.set(rel, edges);
}

const isTest = (f) =>
    /(^|\/)(__tests__|__mocks__)\//.test(f) ||
    /\.(test|spec)\.(ts|tsx)$/.test(f) ||
    f.startsWith('src/test/') ||
    f.startsWith('e2e/');

/**
 * نقاط الدخول الحقيقية: المتصفّح، الأدوات، الخادم، والـe2e.
 *
 * `api/` هو المخرج المجمّع (`api/handler.js`) — esbuild يطوي المسارات فلا تُرى
 * كاستيرادات. المصدر الحي للـ BFF هو البيان + المعالج في `src/app/api`.
 * بدون هذين يبقى كل `route.ts` غير المغطى باختبار «ميتاً» وهو مسار إنتاج.
 */
const ENTRY = [
    /^src\/index\.tsx$/,
    /^src\/hq\/index\.tsx$/,
    /^src\/vite-plugins\//,
    /^src\/test\/setup\.ts$/,
    /\.d\.ts$/,
    /^api\//,
    /^e2e\//,
    /^src\/app\/api\/vercelNodeHandler\.ts$/,
    /^src\/app\/api\/vercelRouteManifest\.ts$/,
];
const readIfExists = (p) => (fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '');
const viteConfigText = readIfExists(path.join(ROOT, 'vite.config.mts'));
const external = new Set();
for (const m of `${readIfExists(path.join(ROOT, 'index.html'))}\n${viteConfigText}`.matchAll(
    /['"](?:\.\/)?(src\/[^'"]+?)['"]/g,
)) {
    external.add(m[1]);
}

// بدائل alias المركّبة: `const shimDir = path.resolve(…, 'src/…')` ثم
// `path.join(shimDir, 'core.ts')`. لا يظهر منها مسار كامل كسلسلة واحدة، فكانت
// طبقة shims الكاباستور كلّها تُحسب ميتة — وهي ما يبني عليه الويب فعلاً.
const aliasDirs = new Map();
for (const m of viteConfigText.matchAll(/\b(?:const|let)\s+(\w+)\s*=\s*path\.resolve\([^)]*?['"](src\/[^'"]+?)['"]\s*\)/g)) {
    aliasDirs.set(m[1], m[2].replace(/\/+$/, ''));
}
for (const m of viteConfigText.matchAll(/path\.join\(\s*(\w+)\s*,\s*['"]([^'"]+?)['"]\s*\)/g)) {
    const dir = aliasDirs.get(m[1]);
    if (dir) external.add(`${dir}/${m[2]}`);
}
// بوّابات dev/prod تُحسم عبر alias في vite.config — كلا الطرفين حيّ
for (const f of graph.keys()) {
    if (/^src\/app\/bootstrap\/.*\.(dev|prod)\.tsx?$/.test(f)) external.add(f);
}

// الاختبارات نقاط دخول أيضاً: ما يستورده اختبار ليس ميتاً بالمعنى الذي يُحذف
// به بلا تبعات. الميت هنا هو ما لا يصله إقلاعٌ ولا اختبارٌ ولا أداة.
const seeds = [...graph.keys()].filter((f) => ENTRY.some((re) => re.test(f)) || external.has(f) || isTest(f));
const seen = new Set();
const stack = [...seeds];
while (stack.length) {
    const cur = stack.pop();
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const nxt of graph.get(cur) ?? []) if (!seen.has(nxt)) stack.push(nxt);
}

const trackedSources = loadGitTrackedSourceSet();

const dead = [...graph.keys()]
    .filter(
        (f) =>
            !isTest(f) &&
            !/\.d\.ts$/.test(f) &&
            !seen.has(f) &&
            (trackedSources == null || trackedSources.has(f)),
    )
    .sort();

if (process.argv.includes('--list')) for (const f of dead) console.log(`  ${f}`);

console.log(`[dead modules] scanned ${graph.size} modules, reachable ${seen.size}, dead ${dead.length}`);

fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
if (process.argv.includes('--save') || !fs.existsSync(BASELINE)) {
    fs.writeFileSync(BASELINE, `${JSON.stringify({ savedAt: new Date().toISOString(), count: dead.length, dead }, null, 2)}\n`);
    console.log(`[dead modules] baseline saved: ${dead.length}`);
    process.exit(0);
}

const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const baseSet = new Set(base.dead ?? []);
const added = dead.filter((f) => !baseSet.has(f));

console.log(`[dead modules] baseline ${base.count}  ->  current ${dead.length}`);

if (added.length) {
    console.error('');
    console.error(`FAIL — ${added.length} module(s) newly unreachable:`);
    for (const f of added.slice(0, 30)) console.error(`  + ${f}`);
    if (added.length > 30) console.error(`  … +${added.length - 30} more`);
    console.error('  احذفها أو صِلها بنقطة دخول.');
    process.exit(1);
}

if (dead.length < base.count) {
    console.log(`good: ${base.count - dead.length} dead module(s) removed — run with --save to lock it in`);
}
console.log('[dead modules] OK — no new unreachable modules');
