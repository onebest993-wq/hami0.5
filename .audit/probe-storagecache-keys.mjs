/**
 * أيّ مفاتيح تعبر `storageCache`، وأيّها حسّاس (فيُشفَّر)؟
 *
 * السبب: `storageCache.get` يستعمل `SecureStoreService.getItemSync(key) !== null`
 * اختباراً للوجود. و`getItemSync` تُرجع `null` للمفتاح المشفَّر حين تبرد ذاكرة
 * الفكّ (LRU بحدّ ٦٤). فهي تخلط «لا أقدر قراءته متزامناً» بـ«غير موجود» — ومن
 * يبني على الخلط قراراً بالحذف يُعلن غياب بيانات سليمة على القرص.
 *
 * فحص أثر ذاتيّ أيضاً: `hami:smartvault:docs:v1` صار مشفَّراً في هذه الجلسة، فإن
 * كان يعبر هذا الكاش فالعطل من صنع يدي.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

const ENCRYPTED_KEY_PREFIXES = [
    'auth_',
    'token_',
    'session_',
    'wife_',
    'hami:sovereign-quick-note-draft:',
    'hami:device',
];
const ENCRYPTED_EXACT = new Set(['hami:smartvault:docs:v1']);
const isCriminalShard = (k) => k.startsWith('hami:criminal:case:') || k === 'hami:criminal:meta';
const isSensitive = (k) =>
    isCriminalShard(k) ||
    ENCRYPTED_EXACT.has(k) ||
    ENCRYPTED_KEY_PREFIXES.some((p) => k.startsWith(p));

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
    return out;
}

/* نداءات الكاش بمفتاح حرفيّ. المفاتيح المُركَّبة تُعدّ منفصلة — لا تُحسب يقيناً */
const CALL_RE =
    /(?:getCachedItem|setCachedItem|removeCachedItem|storageCache\.(?:get|set|remove|touchCacheEntry))\(\s*(['"`])([^'"`]+)\1/g;
const DYNAMIC_RE =
    /(?:getCachedItem|setCachedItem|storageCache\.(?:get|set))\(\s*(?![`'"])([A-Za-z_$][\w$.]*)/g;

const literal = new Map();
const dynamic = new Map();

for (const file of walk(SRC)) {
    if (/__tests__|\.test\./.test(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (!text.includes('storageCache') && !text.includes('CachedItem')) continue;
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');

    for (const m of text.matchAll(CALL_RE)) {
        if (!literal.has(m[2])) literal.set(m[2], new Set());
        literal.get(m[2]).add(rel);
    }
    for (const m of text.matchAll(DYNAMIC_RE)) {
        if (!dynamic.has(m[1])) dynamic.set(m[1], new Set());
        dynamic.get(m[1]).add(rel);
    }
}

const sensitive = [...literal.keys()].filter(isSensitive);

console.log(`مفاتيح حرفيّة تعبر الكاش: ${literal.size}`);
console.log(`منها حسّاسة (تُشفَّر): ${sensitive.length}`);
if (sensitive.length) {
    for (const k of sensitive) {
        console.log(`  !! ${k}`);
        for (const f of literal.get(k)) console.log(`       ${f}`);
    }
}
console.log(`\nمفاتيح مُركَّبة (متغيّرات) — لا يقين فيها بالقراءة الساكنة: ${dynamic.size}`);
for (const [name, files] of [...dynamic.entries()].slice(0, 25)) {
    console.log(`  ${name}  <- ${[...files][0]}`);
}
