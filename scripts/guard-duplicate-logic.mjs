/**
 * مِسنَنة المنطق المكرّر: دالة مُصدَّرة بالاسم نفسه وبجسدٍ متطابق حرفاً بحرف
 * في ملفين. نسختان من قاعدة قانونية واحدة تتباعدان مع أول إصلاح يُطبَّق على
 * إحداهما دون الأخرى — وقد حدث ذلك فعلاً في محرّك جدول المشاهدة.
 *
 * Usage:
 *   node scripts/guard-duplicate-logic.mjs           فحص
 *   node scripts/guard-duplicate-logic.mjs --list    سرد الكل
 *   node scripts/guard-duplicate-logic.mjs --save    تثبيت خط الأساس
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, '.audit', 'duplicate-logic-baseline.json');
/** أقصر من هذا لا يُعدّ منطقاً مكرّراً بل تشابه صياغة */
const MIN_BODY_CHARS = 400;

const toPosix = (p) => p.split(path.sep).join('/');

function walk(dir, out = []) {
    if (!fs.existsSync(dir)) return out;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            if (ent.name === 'node_modules' || ent.name === '__tests__' || ent.name === '__mocks__') continue;
            walk(p, out);
        } else if (/\.(ts|tsx)$/.test(ent.name) && !/\.(test|spec)\.tsx?$/.test(ent.name) && !ent.name.endsWith('.d.ts')) {
            out.push(p);
        }
    }
    return out;
}

const normalize = (src) =>
    src
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
        .replace(/\s+/g, ' ')
        .trim();

const hash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 12);

const byName = new Map();
for (const abs of walk(path.join(ROOT, 'src'))) {
    const rel = toPosix(path.relative(ROOT, abs));
    let raw;
    try {
        raw = fs.readFileSync(abs, 'utf8');
    } catch {
        continue;
    }
    const re = /export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*[<(]/g;
    let m;
    while ((m = re.exec(raw))) {
        const start = raw.indexOf('{', m.index + m[0].length - 1);
        if (start < 0) continue;
        let depth = 0;
        let end = start;
        for (; end < raw.length; end++) {
            if (raw[end] === '{') depth++;
            else if (raw[end] === '}' && --depth === 0) break;
        }
        const body = normalize(raw.slice(start, end + 1));
        if (body.length < MIN_BODY_CHARS) continue;
        if (!byName.has(m[1])) byName.set(m[1], []);
        byName.get(m[1]).push({ file: rel, bodyHash: hash(body), len: body.length });
    }
}

const clones = [];
for (const [name, list] of byName) {
    if (list.length < 2) continue;
    const byBody = new Map();
    for (const x of list) {
        if (!byBody.has(x.bodyHash)) byBody.set(x.bodyHash, []);
        byBody.get(x.bodyHash).push(x);
    }
    for (const group of byBody.values()) {
        if (group.length < 2) continue;
        clones.push({ key: `${name}@${group[0].bodyHash}`, name, len: group[0].len, files: group.map((x) => x.file).sort() });
    }
}
clones.sort((a, b) => b.len * b.files.length - a.len * a.files.length);
const wastedBytes = clones.reduce((s, c) => s + c.len * (c.files.length - 1), 0);

if (process.argv.includes('--list')) {
    for (const c of clones) {
        console.log(`  ${c.name}  (${c.len} chars ×${c.files.length})`);
        for (const f of c.files) console.log(`      ${f}`);
    }
}

console.log(`[duplicate logic] ${clones.length} cloned function(s), ${wastedBytes.toLocaleString('en-US')} excess bytes`);

fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
if (process.argv.includes('--save') || !fs.existsSync(BASELINE)) {
    fs.writeFileSync(
        BASELINE,
        `${JSON.stringify({ savedAt: new Date().toISOString(), count: clones.length, wastedBytes, keys: clones.map((c) => c.key).sort() }, null, 2)}\n`,
    );
    console.log(`[duplicate logic] baseline saved: ${clones.length} clone(s)`);
    process.exit(0);
}

const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const baseKeys = new Set(base.keys ?? []);
const added = clones.filter((c) => !baseKeys.has(c.key));

console.log(`[duplicate logic] baseline ${base.count}  ->  current ${clones.length}`);

if (added.length) {
    console.error('');
    console.error(`FAIL — ${added.length} newly duplicated function(s):`);
    for (const c of added.slice(0, 20)) {
        console.error(`  + ${c.name}  (${c.len} chars)`);
        for (const f of c.files) console.error(`        ${f}`);
    }
    console.error('  استخرج النسخة الواحدة وأعد التصدير بدل النسخ.');
    process.exit(1);
}

if (clones.length < base.count) {
    console.log(`good: ${base.count - clones.length} clone(s) removed — run with --save to lock it in`);
}
console.log('[duplicate logic] OK — no new duplicated logic');
