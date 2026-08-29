/**
 * آثار جانبية وقت الاستيراد داخل إغلاق الإقلاع البارد.
 *
 * الوحدة التي تُنفّذ عملاً بمجرّد استيرادها تُنفّذه في **مسار الإقلاع** إن كانت في
 * إغلاقه — لا حين يطلبه المستخدم. و`void X.preload()` على مستوى الوحدة يبدو تحسيناً
 * وهو في الحقيقة تنزيلٌ إجباريّ لمقطع قبل أن يُعرف أن المستخدم يحتاجه: على شبكة
 * المحامي في المحكمة هذا حجزٌ لعرض النطاق قبل أوّل بكسل.
 *
 * يُقاس على إغلاق المدخل البارد وحده، ويُستثنى ما هو تسجيلٌ محضٌ (تعريف ثابت،
 * `createContext`) لأنه لا يُطلق عملاً.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

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

const ALIASES = [
    ['@/app/', 'src/app/'],
    ['@/', 'src/'],
];
const EXTS = ['.ts', '.tsx', '.js', '.jsx'];

function resolveSpec(spec, fromFile) {
    let rel = null;
    for (const [prefix, target] of ALIASES) {
        if (spec.startsWith(prefix)) {
            rel = target + spec.slice(prefix.length);
            break;
        }
    }
    if (rel === null) {
        if (!spec.startsWith('.')) return null;
        rel = path.relative(ROOT, path.resolve(path.dirname(fromFile), spec)).replace(/\\/g, '/');
    }
    const base = path.join(ROOT, rel);
    for (const cand of [base, ...EXTS.map((e) => base + e), ...EXTS.map((e) => path.join(base, `index${e}`))]) {
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand;
    }
    return null;
}

function staticSpecs(cleaned) {
    const specs = new Set();
    for (const m of cleaned.matchAll(
        /(?:^|[\s;}])import\s+(?:[\w*{][^;]*?\s+from\s*)?['"]([^'"]+)['"]/g,
    )) {
        specs.add(m[1]);
    }
    for (const m of cleaned.matchAll(/export\s+(?:\*|\{[^}]*\})\s*from\s*['"]([^'"]+)['"]/g)) {
        specs.add(m[1]);
    }
    return specs;
}

/* مدخل الإقلاع البارد */
const ENTRY = path.join(ROOT, 'src/index.tsx');
const closure = new Set();
const queue = [ENTRY];
while (queue.length > 0) {
    const abs = queue.pop();
    if (!abs || closure.has(abs)) continue;
    closure.add(abs);
    const cleaned = stripComments(fs.readFileSync(abs, 'utf8'));
    for (const spec of staticSpecs(cleaned)) {
        const next = resolveSpec(spec, abs);
        if (next) queue.push(next);
    }
}

/* أنماط عملٍ يُطلق وقت الاستيراد على المستوى الأعلى (لا داخل دالّة) */
const PATTERNS = [
    [/^\s*void\s+[\w.$]*preload\s*\(/m, 'preload() وقت الاستيراد'],
    [/^\s*void\s+[\w.$]*prefetch[\w$]*\s*\(/m, 'prefetch() وقت الاستيراد'],
    [/^\s*setInterval\s*\(/m, 'setInterval على مستوى الوحدة'],
    [/^\s*(?:void\s+)?[\w.$]+\.addEventListener\s*\(/m, 'addEventListener على مستوى الوحدة'],
    [/^\s*(?:void\s+)?fetch\s*\(/m, 'fetch وقت الاستيراد'],
    [/^\s*(?:void\s+)?import\s*\(/m, 'import() وقت الاستيراد'],
];

const findings = [];
for (const abs of closure) {
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    const cleaned = stripComments(fs.readFileSync(abs, 'utf8'));
    for (const [re, label] of PATTERNS) {
        if (re.test(cleaned)) findings.push({ rel, label });
    }
}

console.log(`إغلاق المدخل البارد: ${closure.size} وحدة`);
console.log(`وحدات فيها عملٌ وقت الاستيراد: ${new Set(findings.map((f) => f.rel)).size}\n`);
for (const f of findings) console.log(`  ${f.label.padEnd(34)} ${f.rel}`);
