/**
 * حارس وزن الإغلاق الثابت للشاشات الثقيلة.
 *
 * الشاشة تُحمَّل ديناميكياً، لكن ما تستورده **ثابتاً** يُشحن معها كلّه في مقطعها.
 * فيكفي استيراد واحد من محور بدل ورقة ليعود المحرّك كلّه إلى المقطع: سطرٌ يبدو
 * بريئاً في مراجعة، وثلاثمئة كيلوبايت على شبكة المحامي.
 *
 * حدث هذا مرّتين قبل هذا الحارس:
 *   - `lawsuit-archive-grid` بلغ ٤٨٢ ك.ب — نصفه محرّك القضايا الجزائية، سببه
 *     استيراد `parseTrialSessionNumber` (ثلاثة أسطر) من `trialSessionsEngine`.
 *   - `archive-portal-execution` بلغ ٥٣٧ ك.ب — سببه شريط نصيحة مستورد ثابتاً،
 *     ودالّة قفل واحدة تسحب طابور قرارات الحجز إلى كل مستوردي `utils` المالي.
 *
 * الميزانية على **حجم المصدر** لا المخرَج: المصدر ما يقرأه المراجع، والانحراف
 * يظهر فيه قبل أن يظهر في البناء.
 *
 * Usage:
 *   node scripts/guard-screen-closure-weight.mjs
 *   node scripts/guard-screen-closure-weight.mjs --save   تثبيت الميزانيات الحالية
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, '.audit', 'screen-closure-baseline.json');
const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.css'];
const toPosix = (p) => p.split(path.sep).join('/');

/** هامش النمو المسموح فوق المقيس: تغييرات حقيقية تحدث، والانفجار لا. */
const SLACK_KB = Number(process.env.HAMI_CLOSURE_SLACK_KB ?? 40);

/**
 * الشاشات المحروسة. تُختار لأنها ثقيلة وتُفتح كثيراً — أضف إليها كل شاشة
 * تُقاس بمئات الكيلوبايتات.
 */
const WATCHED = [
    'src/app/components/lawyer/ArchivePortal/LawsuitArchiveChrome.tsx',
    'src/app/components/lawyer/ArchivePortal/components/LawsuitArchiveFileGrid.tsx',
    'src/app/components/lawyer/ArchivePortal/ExecutionArchiveChrome.tsx',
    'src/app/components/lawyer/ArchivePortal/components/ExecutionArchiveFileGrid.tsx',
];

function stripComments(src) {
    let out = '';
    for (let i = 0; i < src.length; i += 1) {
        if (src[i] === '/' && src[i + 1] === '/') {
            while (i < src.length && src[i] !== '\n') i += 1;
            out += '\n';
            continue;
        }
        if (src[i] === '/' && src[i + 1] === '*') {
            i += 2;
            while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i += 1;
            i += 1;
            continue;
        }
        out += src[i];
    }
    return out;
}

function staticSpecs(src) {
    const cleaned = stripComments(src);
    const specs = new Set();
    for (const m of cleaned.matchAll(/(?:^|[\s;}])import\s+(?:[\w*{][^;]*?\s+from\s*)?['"]([^'"]+)['"]/g)) {
        specs.add(m[1]);
    }
    for (const m of cleaned.matchAll(/export\s+(?:\*|{[^}]*})\s*from\s*['"]([^'"]+)['"]/g)) specs.add(m[1]);
    return specs;
}

/** `import type` يُحذف قبل التجميع فلا يُشحن */
function typeOnlySpecs(src) {
    const cleaned = stripComments(src);
    const specs = new Set();
    for (const m of cleaned.matchAll(/import\s+type\s[^;]*?from\s*['"]([^'"]+)['"]/g)) specs.add(m[1]);
    return specs;
}

function resolveSpec(fromRel, spec) {
    let base;
    if (spec.startsWith('@/app/')) base = path.join(ROOT, 'src/app', spec.slice('@/app/'.length));
    else if (spec.startsWith('@/')) base = path.join(ROOT, 'src', spec.slice(2));
    else if (spec.startsWith('.')) base = path.resolve(ROOT, path.dirname(fromRel), spec);
    else return null;

    const cands = [];
    if (path.extname(base)) cands.push(base);
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

function measure(entry) {
    const seen = new Set();
    const stack = [entry];
    while (stack.length) {
        const cur = stack.pop();
        if (seen.has(cur)) continue;
        seen.add(cur);
        let src;
        try {
            src = fs.readFileSync(path.join(ROOT, cur), 'utf8');
        } catch {
            continue;
        }
        const typeOnly = typeOnlySpecs(src);
        for (const spec of staticSpecs(src)) {
            if (typeOnly.has(spec)) continue;
            const target = resolveSpec(cur, spec);
            if (target && !seen.has(target)) stack.push(target);
        }
    }
    let bytes = 0;
    for (const f of seen) {
        try {
            bytes += fs.statSync(path.join(ROOT, f)).size;
        } catch {
            /* محسوب صفراً */
        }
    }
    return { modules: seen.size, kb: Math.round((bytes / 1024) * 10) / 10 };
}

const measured = {};
let missing = 0;
for (const entry of WATCHED) {
    if (!fs.existsSync(path.join(ROOT, entry))) {
        console.error(`[screen-closure] watched entry not found: ${entry}`);
        missing += 1;
        continue;
    }
    measured[entry] = measure(entry);
}
if (missing) {
    console.error('[screen-closure] عدّل القائمة إن نُقل الملفّ، ولا تحذف الحراسة.');
    process.exit(1);
}

fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
if (process.argv.includes('--save') || !fs.existsSync(BASELINE)) {
    const budgets = Object.fromEntries(
        Object.entries(measured).map(([k, v]) => [k, { maxKb: Math.round(v.kb + SLACK_KB), modules: v.modules }]),
    );
    fs.writeFileSync(
        BASELINE,
        `${JSON.stringify({ savedAt: new Date().toISOString(), slackKb: SLACK_KB, budgets }, null, 2)}\n`,
    );
    console.log('[screen-closure] baseline saved:');
    for (const [k, v] of Object.entries(measured)) {
        console.log(`  ${v.kb} KB (${v.modules} modules)  ${k}`);
    }
    process.exit(0);
}

const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const violations = [];
for (const [entry, result] of Object.entries(measured)) {
    const budget = base.budgets?.[entry];
    if (!budget) {
        violations.push(`  ${entry}\n      لا ميزانية مسجّلة — شغّل --save`);
        continue;
    }
    const status = result.kb > budget.maxKb ? 'FAIL' : 'ok';
    console.log(
        `[screen-closure] ${status.padEnd(4)} ${String(result.kb).padStart(7)} KB / ${budget.maxKb} KB  (${result.modules} modules)  ${entry}`,
    );
    if (result.kb > budget.maxKb) {
        violations.push(
            `  ${entry}\n      ${result.kb} KB يتجاوز ${budget.maxKb} KB بـ${Math.round((result.kb - budget.maxKb) * 10) / 10} KB`,
        );
    }
}

if (violations.length) {
    console.error('');
    console.error('FAIL — إغلاق ثابت تجاوز ميزانيته:');
    for (const v of violations) console.error(v);
    console.error('');
    console.error('  الأرجح استيراد جديد من محور بدل ورقة. لتشخيصه:');
    console.error('    node scripts/analyze-static-closure.mjs <entry> --why <substr>');
    console.error('  إن كان النمو مقصوداً ومُبرَّراً: npm run guard:screen-closure -- --save');
    process.exit(1);
}

console.log('[screen-closure] OK — كل الشاشات المحروسة داخل ميزانيتها');
