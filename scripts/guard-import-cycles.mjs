#!/usr/bin/env node
/**
 * حارس الدوائر — يكشف حلقات الاستيراد على مستوى الوحدات ويمنع تكاثرها.
 *
 * الدائرة ليست مسألة ذوق: ترتيب تهيئة الوحدات داخلها يصير رهن أي ملف دخلت منه،
 * فتحصل على `undefined` وقت التشغيل في مسار وتعمل في آخر. وهي تمنع rollup من
 * الفصل النظيف فتُضخّم الحزم وتُبقي كوداً حيّاً لا يُهزّ.
 *
 * لا يُحسب إلا استيراد القيم: `import type` يُمحى عند الترجمة فلا يصنع حلقة
 * وقت تشغيل، وحسابه يُغرق التقرير بضجيج لا ضرر فيه.
 *
 *   node scripts/guard-import-cycles.mjs          # فحص مقابل خطّ الأساس
 *   node scripts/guard-import-cycles.mjs --save   # تثبيت خطّ أساس جديد
 *   node scripts/guard-import-cycles.mjs --list   # عرض كل الحلقات مفصّلة
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const BASELINE = path.join(ROOT, '.audit', 'import-cycles-baseline.json');

const toPosix = (p) => p.split(path.sep).join('/');

function walk(dir, acc = []) {
    if (!fs.existsSync(dir)) return acc;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ent.name === 'node_modules' || ent.name === 'dist') continue;
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) walk(p, acc);
        else if (/\.(ts|tsx)$/.test(ent.name) && !ent.name.endsWith('.d.ts')) acc.push(p);
    }
    return acc;
}

/**
 * يزيل التعليقات والنصوص الحرفية قبل البحث عن الاستيرادات.
 * بدونها يلتقط الماسح مسارات مذكورة داخل تعليق فيخترع حلقة لا وجود لها.
 */
function stripCommentsAndStrings(src) {
    let out = '';
    let i = 0;
    const n = src.length;
    while (i < n) {
        const c = src[i];
        const next = src[i + 1];
        if (c === '/' && next === '/') {
            while (i < n && src[i] !== '\n') i++;
            continue;
        }
        if (c === '/' && next === '*') {
            i += 2;
            while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
            i += 2;
            continue;
        }
        if (c === '`') {
            out += c;
            i++;
            while (i < n && src[i] !== '`') {
                if (src[i] === '\\') i++;
                i++;
            }
            out += '`';
            i++;
            continue;
        }
        out += c;
        i++;
    }
    return out;
}

/**
 * القيم فقط دون الأنواع، مع تمييز الساكن عن الديناميكي.
 *
 * التمييز ليس تجميلاً: `import()` يُقيَّم عند الاستدعاء لا عند تحميل الوحدة،
 * فحلقة تمرّ به لا تُنتج `undefined` وقت التهيئة — بل هي غالباً حدّ تقسيم كود
 * مقصود (محمّلات runtime الكسولة هنا مثال). خلط النوعين يُضخّم الرقم بلا معنى.
 */
function readValueImports(src) {
    const cleaned = stripCommentsAndStrings(src);
    /** spec -> 'static' | 'dynamic' ('static' يغلب عند اجتماعهما) */
    const specs = new Map();
    const mark = (spec, kind) => {
        if (kind === 'static' || !specs.has(spec)) specs.set(spec, kind);
    };

    // كل جملة على حدة. البحث بنمط واحد ممتد عبر الملف كان يبتلع
    // `export const X = [...];` ثم يلتقط الـfrom التالي، فينسب إعادة تصدير
    // أنواع إلى استيراد قيمة ويخترع ضلعاً لا وجود له.
    const headRe = /^[ \t]*(import|export)\b/gm;
    let head;
    while ((head = headRe.exec(cleaned))) {
        const start = head.index + head[0].indexOf(head[1]);
        let depth = 0;
        let end = start;
        while (end < cleaned.length) {
            const ch = cleaned[end];
            if (ch === '{' || ch === '(' || ch === '[') depth++;
            else if (ch === '}' || ch === ')' || ch === ']') depth--;
            else if (ch === ';' && depth <= 0) break;
            else if (ch === '\n' && depth <= 0 && end > start) {
                // جملة بلا فاصلة منقوطة: تنتهي عند سطر لا يُكمل ما قبله
                const sofar = cleaned.slice(start, end).trimEnd();
                if (/['"]$/.test(sofar) || /\bfrom$/.test(sofar) === false) break;
            }
            end++;
        }
        const stmt = cleaned.slice(start, end);
        headRe.lastIndex = Math.max(headRe.lastIndex, end);

        const fromMatch = stmt.match(/\bfrom\s*['"]([^'"]+)['"]\s*$/);
        if (!fromMatch) {
            // `import './side-effect'` بلا from
            const bare = stmt.match(/^import\s*['"]([^'"]+)['"]\s*$/);
            if (bare) mark(bare[1], 'static');
            continue;
        }

        const clause = stmt.slice(stmt.indexOf(head[1]) + head[1].length, stmt.lastIndexOf(fromMatch[0])).trim();
        // `import type X from` / `export type { X } from` يُمحى عند الترجمة
        if (/^type\b/.test(clause)) continue;
        // كل الأسماء داخل الأقواس مُعلَّمة بـtype — لا شيء يبقى وقت التشغيل
        const braced = clause.match(/\{([\s\S]*)\}/);
        if (braced) {
            const names = braced[1]
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            const hasDefaultOrNamespace = /^[A-Za-z_$][\w$]*\s*,|\*\s+as\s/.test(clause);
            if (names.length && !hasDefaultOrNamespace && names.every((nm) => /^type\s/.test(nm))) continue;
        }
        mark(fromMatch[1], 'static');
    }

    const dynamicRe = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    let m;
    while ((m = dynamicRe.exec(cleaned))) mark(m[1], 'dynamic');

    return specs;
}

const EXTS = ['.ts', '.tsx', '/index.ts', '/index.tsx', '.js', '/index.js'];

function resolveSpec(fromRel, spec) {
    if (spec.endsWith('.css') || spec.endsWith('.json') || spec.endsWith('.svg')) return null;
    let base;
    if (spec.startsWith('@/app/')) base = `src/app/${spec.slice(6)}`;
    else if (spec.startsWith('@/')) base = `src/${spec.slice(2)}`;
    else if (spec.startsWith('.')) base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
    else return null; // حزمة خارجية

    if (/\.(ts|tsx)$/.test(base) && fs.existsSync(path.join(ROOT, base))) return base;
    for (const ext of EXTS) {
        const cand = `${base}${ext}`;
        if (fs.existsSync(path.join(ROOT, cand))) return cand;
    }
    return null;
}

const files = walk(SRC);
/** الأضلاع الساكنة وحدها — هذه هي التي تُنتج حلقة تهيئة حقيقية */
const staticGraph = new Map();
/** الساكن + الديناميكي — يكشف تشابك التقسيم، للعِلم لا للإسقاط */
const fullGraph = new Map();

for (const abs of files) {
    const rel = toPosix(path.relative(ROOT, abs));
    let text;
    try {
        text = fs.readFileSync(abs, 'utf8');
    } catch {
        continue;
    }
    const staticEdges = new Set();
    const allEdges = new Set();
    for (const [spec, kind] of readValueImports(text)) {
        const target = resolveSpec(rel, spec);
        if (!target || target === rel) continue;
        allEdges.add(target);
        if (kind === 'static') staticEdges.add(target);
    }
    staticGraph.set(rel, staticEdges);
    fullGraph.set(rel, allEdges);
}

/**
 * Tarjan تكرارياً لا تعاوديّاً: العمق يبلغ آلاف الوحدات فينفجر مكدّس V8
 * على شكل RangeError يبدو عطلاً في الأداة لا في المشروع.
 */
function stronglyConnectedComponents(g) {
    const index = new Map();
    const low = new Map();
    const onStack = new Set();
    const stack = [];
    const result = [];
    let counter = 0;

    for (const root of g.keys()) {
        if (index.has(root)) continue;
        const work = [{ node: root, edges: [...(g.get(root) ?? [])], i: 0 }];
        index.set(root, counter);
        low.set(root, counter);
        counter++;
        stack.push(root);
        onStack.add(root);

        while (work.length) {
            const frame = work[work.length - 1];
            if (frame.i < frame.edges.length) {
                const child = frame.edges[frame.i++];
                if (!g.has(child)) continue;
                if (!index.has(child)) {
                    index.set(child, counter);
                    low.set(child, counter);
                    counter++;
                    stack.push(child);
                    onStack.add(child);
                    work.push({ node: child, edges: [...(g.get(child) ?? [])], i: 0 });
                } else if (onStack.has(child)) {
                    low.set(frame.node, Math.min(low.get(frame.node), index.get(child)));
                }
            } else {
                work.pop();
                if (work.length) {
                    const parent = work[work.length - 1].node;
                    low.set(parent, Math.min(low.get(parent), low.get(frame.node)));
                }
                if (low.get(frame.node) === index.get(frame.node)) {
                    const group = [];
                    let w;
                    do {
                        w = stack.pop();
                        onStack.delete(w);
                        group.push(w);
                    } while (w !== frame.node);
                    if (group.length > 1) result.push(group.sort());
                }
            }
        }
    }
    return result;
}

/** حلقة الملف على نفسه لا تظهر في SCC لأن الأضلاع الذاتية مستبعَدة أصلاً. */
const bySize = (a, b) => b.length - a.length;
const groups = stronglyConnectedComponents(staticGraph).sort(bySize);
const fullGroups = stronglyConnectedComponents(fullGraph).sort(bySize);
const filesInCycles = groups.reduce((sum, g) => sum + g.length, 0);
const filesInFullCycles = fullGroups.reduce((sum, g) => sum + g.length, 0);

const summary = {
    scannedFiles: staticGraph.size,
    cycleGroups: groups.length,
    filesInCycles,
    largestGroup: groups[0]?.length ?? 0,
    /** للعِلم فقط — الديناميكي حدّ تقسيم مقصود لا عطل */
    withDynamicGroups: fullGroups.length,
    withDynamicFiles: filesInFullCycles,
};

if (process.argv.includes('--list')) {
    for (const [i, g] of groups.entries()) {
        console.log(`\n--- static cycle ${i + 1} (${g.length} files) ---`);
        for (const f of g) console.log(`  ${f}`);
    }
}

console.log(`[import cycles] scanned ${summary.scannedFiles} modules`);
console.log(
    `[import cycles] STATIC  groups=${summary.cycleGroups}  files=${summary.filesInCycles}  largest=${summary.largestGroup}`,
);
console.log(
    `[import cycles] incl. dynamic  groups=${summary.withDynamicGroups}  files=${summary.withDynamicFiles}  (informational — lazy-load boundaries)`,
);

if (groups.length && !process.argv.includes('--list')) {
    console.log('');
    console.log('largest static cycles:');
    for (const g of groups.slice(0, 8)) {
        console.log(`  ${String(g.length).padStart(3)} files  ${g[0]}`);
    }
    console.log('  (run with --list for full membership)');
}

fs.mkdirSync(path.dirname(BASELINE), { recursive: true });

if (process.argv.includes('--save') || !fs.existsSync(BASELINE)) {
    fs.writeFileSync(
        BASELINE,
        JSON.stringify({ savedAt: new Date().toISOString(), ...summary, groups }, null, 2),
        'utf8',
    );
    console.log(`\n[import cycles] baseline saved: ${summary.cycleGroups} group(s), ${filesInCycles} file(s)`);
    process.exit(0);
}

const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
console.log('');
console.log(
    `[import cycles] groups  baseline ${base.cycleGroups}  ->  current ${summary.cycleGroups}` +
        `   |   files  baseline ${base.filesInCycles}  ->  current ${summary.filesInCycles}`,
);

/** عضويّة لا عدداً: ملفٌّ يدخل دائرة وآخر يخرج يُبقي المجموع ثابتاً فيمرّ الانحدار */
const baseMembers = new Set((base.groups ?? []).flat());
const currentMembers = new Set(groups.flat());
const added = [...currentMembers].filter((f) => !baseMembers.has(f)).sort();
const left = [...baseMembers].filter((f) => !currentMembers.has(f)).sort();

if (added.length > 0 || summary.cycleGroups > base.cycleGroups) {
    console.error('');
    console.error('FAIL — new import cycle(s) introduced.');
    if (added.length) {
        console.error(`${added.length} module(s) newly inside a cycle:`);
        for (const f of added.slice(0, 30)) console.error(`  + ${f}`);
        if (added.length > 30) console.error(`  … +${added.length - 30} more`);
    }
    process.exit(1);
}

if (left.length > 0) {
    console.log('');
    console.log(`good: ${left.length} module(s) left the cycles`);
    console.log('run with --save to lock in the improvement');
}

console.log('');
console.log('[import cycles] OK — no new cycles');
