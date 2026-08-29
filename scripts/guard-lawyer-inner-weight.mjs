/**
 * حارس إغلاق Inner الثابت — أول تبويب بعد الإقلاع.
 *
 * Inner يُحمَّل ديناميكياً، لكن ما يستورده ثابتاً يصل مع المنزل. وثيقة الشروط
 * ومحرّك التنفيذ/الجزائي/PDF إن عادت باستيراد ثابت تُدفع على شبكة المحامي
 * قبل أن يفتح أي إضبارة.
 *
 *   npm run build && node scripts/guard-lawyer-inner-weight.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const DIST = process.env.HAMI_DIST_DIR ?? 'dist';
const ASSETS = path.join(DIST, 'assets');
const BUDGET_KB = Number(process.env.HAMI_INNER_BUDGET_KB ?? 220);
const FORBIDDEN = [
    /^ExecutionDashboard-[A-Za-z0-9_-]+\.js$/,
    /^criminalStore-/,
    /^vendor-pdf-/,
    /^accountLegalContent-/,
    /^LegalTermsConsentGate-/,
    /^LawyerSignInGate-/,
];

if (!fs.existsSync(ASSETS)) {
    console.error(`[lawyer-inner-weight] missing ${ASSETS} — run the build first`);
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

function chainOf(file, parents) {
    const chain = [file];
    let cur = file;
    while (parents.has(cur) && chain.length < 8) {
        cur = parents.get(cur);
        chain.push(cur);
    }
    return chain.reverse().join(' -> ');
}

const inner = files.find((f) => f.startsWith('LawyerDashboardInner-'));
if (!inner || !sources.has(inner)) {
    console.error('[lawyer-inner-weight] LawyerDashboardInner chunk not found');
    process.exit(1);
}

const { seen, parents } = closure(inner);
const rows = [...seen].map((f) => ({ file: f, kb: gzipKb(f) })).sort((a, b) => b.kb - a.kb);
const total = rows.reduce((s, r) => s + r.kb, 0);
const hits = rows.filter((r) => FORBIDDEN.some((re) => re.test(r.file)));

console.log(`[lawyer-inner-weight] entry: ${inner}`);
console.log(
    `[lawyer-inner-weight] static closure: ${rows.length} chunks, ${total.toFixed(1)} KB gzip (budget ${BUDGET_KB} KB)`,
);
for (const r of rows.slice(0, 10)) {
    console.log(`    ${r.kb.toFixed(1).padStart(7)} KB  ${r.file}`);
}

if (hits.length) {
    console.error('\n[lawyer-inner-weight] FAIL — forbidden chunks on Inner static path:');
    for (const h of hits) console.error(`    ${h.kb.toFixed(1)} KB via ${chainOf(h.file, parents)}`);
    process.exit(1);
}

if (total > BUDGET_KB) {
    console.error(
        `\n[lawyer-inner-weight] FAIL — ${total.toFixed(1)} KB gzip Inner closure, budget is ${BUDGET_KB} KB.`,
    );
    process.exit(1);
}

console.log('\n[lawyer-inner-weight] OK');
