#!/usr/bin/env node
/**
 * قياسُ الإغلاق الساكن لكلّ مدخل قسم — الكلفة الحقيقية لفتح قسم.
 *
 * **لماذا وُضع:** كان يُقاس الحِمل بقائمةِ ممنوعاتٍ بالاسم
 * (`guard-first-open-shared-tax.mjs`: «لا تستورد خطوط أنابيب التنفيذ الأربع»).
 * وهي تُخدَع بسهولة: كسرُ أربعة استيرادات يُخضّرها، **ويبقى ما تجرّه الشاشة فعلاً**.
 * قيس ٢٠٢٦-٠٩-١٢: الأربع ٤٤٤٫٧ ك.ب = **١٨٪ فقط** من ٢٫٤٧ م.ب يجرّها `CommunityScreen`،
 * و٤ من ٨٥ استيراداً ساكناً. فالقائمة تحرس ثُمنَ المشكلة وتُسمّيها كلَّها.
 *
 * **ما يقيسه هذا:** الإغلاقَ المتعدّي للاستيرادات **الساكنة** من مدخلٍ حتى منتهاه —
 * أي ما يُنزّله المتصفّح حتماً عند تحميل ذلك المدخل. الاستيرادُ الديناميكيّ
 * (`import(...)`) مستثنىً لأنّه لا يُجلَب إلا عند الطلب، وهو استراتيجية المنتج المقصودة.
 *
 *   node scripts/measure-section-closure.mjs            # جدول
 *   node scripts/measure-section-closure.mjs --save     # يكتب خطّ الأساس
 *   node scripts/measure-section-closure.mjs --check    # يقارن ويسقط عند النموّ
 *
 * **ويُشترط بناءٌ بالأمر نفسه الذي يبني به العدّاء** (`npm run build`): أحجام الحزم
 * تختلف باختلاف الوضع، فخطُّ أساسٍ من بناءٍ آخر يقارن تفّاحاً ببرتقال — وهو العطل
 * الذي أسقط `chunk-baseline` نفسه (خطُّ أساسٍ يعرف ٢٫٦٪ من البنية).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'dist', 'assets');
const BASELINE = path.join(ROOT, '.audit', 'section-closure-baseline.json');

/**
 * مداخل الأقسام المرصودة — قائمةٌ صريحة تُراجَع بالعين عمداً.
 * `boot` يُشتقّ من `index.html` لا من هنا، لأنّه ما يُحمّل قبل أيّ تفاعل.
 */
const SECTION_ENTRIES = [
    'CommunityScreen-',
    'CommunityScreenContent-',
    'forumApiService-',
    'LawyerDashboardMainView-',
    'ScheduleTabHost-',
    'LawyerDashboardInner-',
    'CriminalDashboard-',
];

/** مداخل تُستبعد لأنّها ليست أقساماً بل أجزاءٌ من اسمٍ أطول. */
const NOT_ENTRIES = ['CommunityScreenHost-', 'CommunityScreenOverlays-'];

if (!fs.existsSync(ASSETS)) {
    console.error('[section-closure] missing dist/assets — run `npm run build` first');
    process.exit(1);
}

const files = fs.readdirSync(ASSETS).filter((f) => f.endsWith('.js'));
const sizeOf = (f) => {
    try {
        return fs.statSync(path.join(ASSETS, f)).size;
    } catch {
        return 0;
    }
};

/**
 * الاستيراداتُ الساكنة لملفٍّ مبنيّ — الصيغة نفسها التي يستعملها
 * `guard-first-open-shared-tax.mjs:83-94` عمداً، لئلّا يفترق مِجَسّان على شيءٍ واحد.
 */
function staticImports(file) {
    const src = fs.readFileSync(path.join(ASSETS, file), 'utf8');
    const found = [];
    const re = /(?:from|import)\s*["']\.\/([^"']+\.js)["']/g;
    let m;
    while ((m = re.exec(src)) !== null) {
        const before = src.slice(Math.max(0, m.index - 8), m.index);
        if (/import\s*\($/.test(before)) continue; // ديناميكيّ — لا يُحسب
        found.push(m[1]);
    }
    return [...new Set(found)];
}

function closureOf(entry) {
    const seen = new Set([entry]);
    const queue = [entry];
    while (queue.length) {
        for (const dep of staticImports(queue.shift())) {
            if (!seen.has(dep) && files.includes(dep)) {
                seen.add(dep);
                queue.push(dep);
            }
        }
    }
    return seen;
}

function bootEntries() {
    const html = fs.readFileSync(path.join(ROOT, 'dist', 'index.html'), 'utf8');
    return [...html.matchAll(/(?:href|src)="\/?assets\/([^"]+\.js)"/g)].map((m) => m[1]);
}

/** اسمٌ ثابت لا يتغيّر بتغيّر بصمة المحتوى. */
const stemOf = (f) => f.replace(/-[A-Za-z0-9_-]{6,}\.js$/, '');

const measured = [];

{
    const seen = new Set();
    for (const e of bootEntries()) for (const f of closureOf(e)) seen.add(f);
    measured.push({
        entry: 'boot (index.html)',
        chunks: seen.size,
        kb: Math.round([...seen].reduce((a, f) => a + sizeOf(f), 0) / 1024),
    });
}

for (const prefix of SECTION_ENTRIES) {
    const matches = files.filter(
        (f) => f.startsWith(prefix) && !NOT_ENTRIES.some((n) => f.startsWith(n)),
    );
    if (matches.length === 0) {
        console.error(`[section-closure] missing entry chunk ${prefix}*.js`);
        process.exit(1);
    }
    for (const f of matches) {
        const c = closureOf(f);
        measured.push({
            entry: stemOf(f),
            chunks: c.size,
            kb: Math.round([...c].reduce((a, x) => a + sizeOf(x), 0) / 1024),
        });
    }
}

measured.sort((a, b) => b.kb - a.kb);

const mode = process.argv.includes('--save')
    ? 'save'
    : process.argv.includes('--check')
      ? 'check'
      : 'report';

if (mode === 'save') {
    fs.writeFileSync(
        BASELINE,
        `${JSON.stringify({ capturedAt: new Date().toISOString(), entries: measured }, null, 2)}\n`,
        'utf8',
    );
    console.log(`[section-closure] saved ${path.relative(ROOT, BASELINE)} (${measured.length} entries)`);
}

for (const r of measured) {
    console.log(`  ${String(r.kb).padStart(6)} KB | ${String(r.chunks).padStart(4)} chunks | ${r.entry}`);
}

if (mode !== 'check') process.exit(0);

if (!fs.existsSync(BASELINE)) {
    console.error('[section-closure] no baseline — run with --save first');
    process.exit(1);
}
const prev = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
const prevBy = new Map(prev.entries.map((e) => [e.entry, e]));
const problems = [];
for (const r of measured) {
    const p = prevBy.get(r.entry);
    if (!p) {
        problems.push(`${r.entry}: مدخلٌ جديد بلا خطّ أساس (${r.kb} KB) — أضفه بـ--save بإذنٍ موثّق`);
        continue;
    }
    if (r.kb > p.kb) {
        problems.push(
            `${r.entry}: الإغلاق الساكن نما ${p.kb} ← ${r.kb} KB (+${r.kb - p.kb}) · الحزم ${p.chunks} ← ${r.chunks}`,
        );
    }
}
if (problems.length) {
    console.error('\n[section-closure] FAIL — إغلاقٌ ساكن نما عن خطّ الأساس:');
    for (const p of problems) console.error(`  - ${p}`);
    console.error('\nالنموّ هنا يعني بايتاتٍ يُنزّلها المستخدم حتماً عند فتح القسم.');
    process.exit(1);
}
console.log('\n[section-closure] OK — لا نموّ في أيّ إغلاق ساكن');
