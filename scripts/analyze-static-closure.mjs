/**
 * وزن الإغلاق الثابت لأي وحدة مصدرية.
 *
 * `manualChunks` يسمّي chunk بوحدتين، ثم يسحب Rollup إليه كل ما تستوردانه
 * استيراداً ثابتاً ولم يُسمَّ لغيره. فيصير الاسم وعداً والحجم شيئاً آخر: chunk
 * اسمه «شبكة أرشيف الدعاوى» يضمّ محرّك القضايا الجزائية كاملاً.
 *
 * هذه الأداة تقيس ما تستورده وحدةٌ ثابتاً — بشكل متعدٍّ — وتجمعه حسب المجلّد،
 * فيظهر الفرق بين ما يخصّ الشاشة وما يُسحب معها بلا داعٍ.
 *
 * Usage:
 *   node scripts/analyze-static-closure.mjs src/app/components/lawyer/ArchivePortal/LawsuitArchiveChrome.tsx
 *   node scripts/analyze-static-closure.mjs <entry> --depth 3   عمق التجميع
 *   node scripts/analyze-static-closure.mjs <entry> --why <substr>  مسار السحب
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXTS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json', '.css'];
const toPosix = (p) => p.split(path.sep).join('/');

const args = process.argv.slice(2);
const entryArg = args.find((a) => !a.startsWith('--'));
const depth = Number(args[args.indexOf('--depth') + 1] ?? 4);
const why = args.includes('--why') ? args[args.indexOf('--why') + 1] : null;

if (!entryArg) {
    console.error('usage: node scripts/analyze-static-closure.mjs <entry-file> [--depth N] [--why substr]');
    process.exit(1);
}

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

/** الاستيراد الثابت وحده. `import()` حدّ تقسيم لا ضلع في الإغلاق. */
function staticSpecs(src) {
    const cleaned = stripComments(src);
    const specs = new Set();
    for (const m of cleaned.matchAll(/(?:^|[\s;}])import\s+(?:[\w*{][^;]*?\s+from\s*)?['"]([^'"]+)['"]/g)) {
        specs.add(m[1]);
    }
    for (const m of cleaned.matchAll(/export\s+(?:\*|{[^}]*})\s*from\s*['"]([^'"]+)['"]/g)) {
        specs.add(m[1]);
    }
    return specs;
}

/** الأنواع لا تُشحن: `import type` و`import { type X }` تُحذف قبل التجميع */
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
            /* next */
        }
    }
    return null;
}

const entry = toPosix(path.relative(ROOT, path.resolve(ROOT, entryArg)));
if (!fs.existsSync(path.join(ROOT, entry))) {
    console.error(`not found: ${entry}`);
    process.exit(1);
}

const seen = new Set();
const parent = new Map();
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
        if (!target || seen.has(target)) continue;
        if (!parent.has(target)) parent.set(target, cur);
        stack.push(target);
    }
}

const sizeOf = (rel) => {
    try {
        return fs.statSync(path.join(ROOT, rel)).size;
    } catch {
        return 0;
    }
};

const total = [...seen].reduce((sum, f) => sum + sizeOf(f), 0);
const groups = new Map();
for (const f of seen) {
    const key = f.split('/').slice(0, depth).join('/');
    groups.set(key, (groups.get(key) ?? 0) + sizeOf(f));
}

console.log(`entry: ${entry}`);
console.log(`static closure: ${seen.size} modules, ${(total / 1024).toFixed(1)} KB of source\n`);
console.log('  KB     share  group');
for (const [key, bytes] of [...groups.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    const kb = (bytes / 1024).toFixed(1).padStart(7);
    const share = `${((bytes / total) * 100).toFixed(1)}%`.padStart(6);
    console.log(`${kb}  ${share}  ${key}`);
}

if (why) {
    const hit = [...seen].filter((f) => f.includes(why));
    console.log(`\nwhy "${why}" is pulled in (${hit.length} module(s)):`);
    for (const f of hit.slice(0, 6)) {
        const chain = [f];
        let cur = f;
        while (parent.has(cur) && chain.length < 12) {
            cur = parent.get(cur);
            chain.push(cur);
        }
        console.log(`\n  ${chain.reverse().join('\n    → ')}`);
    }
}
