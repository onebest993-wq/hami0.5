/**
 * حارس وزن المسار الحرج للإقلاع.
 *
 * أول render لا يحدث قبل أن يصل entry وكل ما يستورده استيراداً **ثابتاً**،
 * بشكل متعدٍّ. هذا الإغلاق هو ما يدفع ثمنه المستخدم على شبكة الهاتف قبل أن
 * يرى شيئاً. الاستيراد الديناميكي `import()` لا يُحسب — فهو حدّ تقسيم.
 *
 * القياس على البايت المضغوط (gzip) لأنه ما يُنقل فعلاً على السلك.
 *
 * سبب وجود هذا الحارس: وحدتان صغيرتان (sentryClient و useReduceMotion)
 * ذابتا داخل chunk بحجم 476 كيلوبايت اسمه lawsuit-archive-grid، فصار محرّك
 * القضايا الجزائية كله شرطاً لأول رسم. لا شيء في الكود يمنع تكرار ذلك —
 * إلا هذا الحارس.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DIST = process.env.HAMI_DIST_DIR ?? 'dist';
const ASSETS = path.join(DIST, 'assets');
const BUDGET_KB = Number(process.env.HAMI_BOOT_CRITICAL_BUDGET_KB ?? 190);

if (!fs.existsSync(ASSETS)) {
    console.error(`[boot-critical-weight] missing ${ASSETS} — run the build first`);
    process.exit(1);
}

const files = fs.readdirSync(ASSETS).filter((f) => f.endsWith('.js'));
const sources = new Map(files.map((f) => [f, fs.readFileSync(path.join(ASSETS, f), 'utf8')]));

const gzipCache = new Map();
function gzipKb(file) {
    if (!gzipCache.has(file)) {
        gzipCache.set(file, zlib.gzipSync(Buffer.from(sources.get(file), 'utf8')).length / 1024);
    }
    return gzipCache.get(file);
}

/** روابط الاستيراد الثابت فقط: `from "./x.js"` و `import "./x.js"` — لا `import("./x.js")`. */
function staticDeps(file) {
    const src = sources.get(file) ?? '';
    const found = new Set();
    const re = /(?:from|import)\s*["']\.\/([A-Za-z0-9._-]+\.js)["']/g;
    let m;
    while ((m = re.exec(src)) !== null) {
        const before = src.slice(Math.max(0, m.index - 8), m.index);
        if (/import\s*\($/.test(before)) continue;
        if (sources.has(m[1])) found.add(m[1]);
    }
    return [...found];
}

function closure(entry) {
    const seen = new Set();
    const stack = [entry];
    const parents = new Map();
    while (stack.length) {
        const cur = stack.pop();
        if (seen.has(cur)) continue;
        seen.add(cur);
        for (const dep of staticDeps(cur)) {
            if (!parents.has(dep)) parents.set(dep, cur);
            stack.push(dep);
        }
    }
    return { seen, parents };
}

const html = fs.existsSync(path.join(DIST, 'index.html'))
    ? fs.readFileSync(path.join(DIST, 'index.html'), 'utf8')
    : '';
const entryMatch = html.match(/<script[^>]+type="module"[^>]+src="\/assets\/([^"]+\.js)"/);
const entry = entryMatch?.[1] ?? files.find((f) => f.startsWith('index-'));
if (!entry || !sources.has(entry)) {
    console.error('[boot-critical-weight] could not locate the module entry in index.html');
    process.exit(1);
}

const { seen, parents } = closure(entry);
const rows = [...seen].map((f) => ({ file: f, kb: gzipKb(f) })).sort((a, b) => b.kb - a.kb);
const total = rows.reduce((s, r) => s + r.kb, 0);

function chainOf(file) {
    const chain = [file];
    let cur = file;
    while (parents.has(cur) && chain.length < 8) {
        cur = parents.get(cur);
        chain.push(cur);
    }
    return chain.reverse().join(' -> ');
}

console.log(`[boot-critical-weight] entry: ${entry}`);
console.log(`[boot-critical-weight] static closure: ${rows.length} chunks, ${total.toFixed(1)} KB gzip (budget ${BUDGET_KB} KB)`);
for (const r of rows.slice(0, 12)) {
    console.log(`    ${r.kb.toFixed(1).padStart(7)} KB  ${r.file}`);
}

const OVERSIZED_CHUNK_KB = 45;
const offenders = rows.filter((r) => r.kb > OVERSIZED_CHUNK_KB && r.file !== entry);
if (offenders.length) {
    console.log('\n[boot-critical-weight] heavy chunks dragged onto the critical path:');
    for (const o of offenders) console.log(`    ${o.kb.toFixed(1)} KB via ${chainOf(o.file)}`);
}

if (total > BUDGET_KB) {
    console.error(
        `\n[boot-critical-weight] FAIL — ${total.toFixed(1)} KB gzip must load before first render, budget is ${BUDGET_KB} KB.`,
    );
    console.error('Move the offending module into its own leaf chunk, or make the import dynamic.');
    process.exit(1);
}

console.log('\n[boot-critical-weight] OK');
