/**
 * حارس التصديرات بلا مستهلك.
 *
 * حارس الوحدات الميتة يسأل: «هل يستورد أحدٌ هذا **الملفّ**؟». وهذا سؤال ناقص. فملفٌّ
 * يُصدّر ستّين اسماً ويُستورد منه عشرون يبقى أخضر، والأربعون الباقية شيفرةٌ ميتة
 * تُشحن في المقطع وتُبقي أضلع استيراد ثابتة لها ثمن.
 *
 * وقع هذا في `utils/lazyComponents.tsx`: ٦٣ تصديراً، ٤٠ منها بلا مستهلك — أغلفةٌ
 * لمُحمِّلات صار يُنادى مصدرها مباشرة، وأربع قشرات `const` سهميّة، ودالّات `reset*`
 * لاختبارات لم تعد تستدعيها. وكان لها ثمن ملموس:
 *
 *   - استيراد `communityHubLoader` لأجل دالّة ميتة أغلق دائرة من ستّة ملفّات على
 *     مسار المنتدى — وقطعُها أنزل الدوائر من ١٤ مجموعة إلى ١١، ومن ٤٨ ملفّاً إلى ٣٦
 *   - استيراد `lazySmartFileModalWidgets` لم يُستعمل إطلاقاً: سطرٌ لا يُنادى
 *
 * ── حدّ القياس (مُعلَن) ──────────────────────────────────────────────────────
 * الحكم بالموت هنا **متحفّظ**: الاسم حيٌّ إن ذُكر في أي ملفّ آخر بأي صيغة — استيراداً
 * أو `m.name` أو نصّاً. فما يُبلَّغ عنه ميتٌ يقيناً، وما يُسكت عنه قد يكون ميتاً ولا
 * يُدرَك (اسمٌ يتصادف مع اسم محليّ في ملفّ آخر). تقديرٌ ناقص لا زائد — لأن كلفة
 * إبقاء ميتٍ أهون من كلفة حذف حيّ.
 *
 * Usage:
 *   node scripts/guard-dead-exports.mjs
 *   node scripts/guard-dead-exports.mjs --list          كل الأسماء الميتة
 *   node scripts/guard-dead-exports.mjs --save          تثبيت العدد الحالي
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');
const BASELINE = path.join(ROOT, '.audit', 'dead-exports-baseline.json');

const LIST = process.argv.includes('--list');
const SAVE = process.argv.includes('--save');

/*
 * مداخل وواجهات نظام: تصديراتها يستهلكها المتصفّح أو البناء أو الخادم، لا استيرادٌ
 * مصدريّ. وبلا هذا الاستثناء يُبلّغ الحارس عنها «ميتة» فيدفع إلى حذفٍ يكسر بناءً —
 * وهذا أسوأ من السكوت عن ميت.
 *
 * أهدافُ الأسماء المستعارة في `vite.config.mts` أخطرُها: بديل `@capacitor/*` على
 * الويب، وبديل `@sentry/react` حين لا يُحزَم، وبوّابة `SecurityInitializerGate.prod`
 * التي تُستبدل بـ`.dev` وقت البناء باستبدال نصّيّ في المسار. لا يستوردها أحد بالاسم،
 * وحذف تصديراتها يُسقط بناء الويب أو يُعطّل بوّابة أمنٍ في الإنتاج.
 */
const DEFINER_EXEMPT = [
    /^src\/index\.tsx$/,
    /^src\/vite-env\.d\.ts$/,
    /\.d\.ts$/,
    /^src\/app\/api\//, // معالِجات المسارات — يستدعيها الخادم بالاسم الاصطلاحي
    /^src\/app\/runtime\/capacitorWebShims\//, // alias: @capacitor/*
    /^src\/app\/observability\/sentryReactStub\.ts$/, // alias: @sentry/react
    /\.prod\.tsx?$/, // بوّابات تُستبدل من `.dev.` وقت البناء
];

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
    return out;
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

const toPosix = (p) => p.replace(/\\/g, '/');

function exportedNames(cleaned) {
    const names = new Set();
    for (const m of cleaned.matchAll(
        /^export\s+(?:declare\s+)?(?:async\s+)?(?:abstract\s+)?(?:const|let|var|function|class|enum|type|interface)\s+([A-Za-z_$][\w$]*)/gm,
    )) {
        names.add(m[1]);
    }
    for (const m of cleaned.matchAll(/^export\s+(?:type\s+)?\{([^}]*)\}/gm)) {
        for (const part of m[1].split(',')) {
            const name = part.trim().split(/\s+as\s+/).pop()?.trim();
            if (name && /^[A-Za-z_$][\w$]*$/.test(name) && name !== 'default') names.add(name);
        }
    }
    return names;
}

const files = walk(SRC);

/* المرور الأوّل: معرّفات كل ملفّ */
const identifierOwners = new Map(); // اسم -> Set<relPath>
const perFile = new Map(); // relPath -> { cleaned, rel }

for (const abs of files) {
    const rel = toPosix(path.relative(ROOT, abs));
    const cleaned = stripComments(fs.readFileSync(abs, 'utf8'));
    perFile.set(rel, cleaned);
    for (const m of cleaned.matchAll(/[A-Za-z_$][\w$]*/g)) {
        const name = m[0];
        let owners = identifierOwners.get(name);
        if (!owners) {
            owners = new Set();
            identifierOwners.set(name, owners);
        }
        owners.add(rel);
    }
}

/* المرور الثاني: تصديرات بلا ذكر خارج ملفّها */
const deadByFile = new Map();
let deadTotal = 0;

for (const [rel, cleaned] of perFile) {
    if (/__tests__|\.test\.|\.spec\./.test(rel)) continue;
    if (DEFINER_EXEMPT.some((re) => re.test(rel))) continue;

    const names = exportedNames(cleaned);
    if (names.size === 0) continue;

    const dead = [];
    for (const name of names) {
        const owners = identifierOwners.get(name) ?? new Set();
        let mentionedElsewhere = false;
        for (const owner of owners) {
            if (owner !== rel) {
                mentionedElsewhere = true;
                break;
            }
        }
        if (!mentionedElsewhere) dead.push(name);
    }
    if (dead.length > 0) {
        deadByFile.set(rel, dead.sort());
        deadTotal += dead.length;
    }
}

const ranked = [...deadByFile.entries()].sort((a, b) => b[1].length - a[1].length);

console.log(`[dead exports] scanned ${perFile.size} modules`);
console.log(`[dead exports] modules with dead exports: ${deadByFile.size}   dead names: ${deadTotal}\n`);

const top = LIST ? ranked : ranked.slice(0, 15);
for (const [rel, dead] of top) {
    console.log(`  ${String(dead.length).padStart(3)}  ${rel}`);
    if (LIST) for (const n of dead) console.log(`         ${n}`);
}
if (!LIST && ranked.length > top.length) {
    console.log(`  … و${ranked.length - top.length} ملفّاً آخر (--list للكل)`);
}
console.log('');

/** أسماءٌ لا مجرّد مجموع: المجموع وحده يُخفي حذفَ خمسةٍ مقابل إضافةِ خمسة */
const perModule = Object.fromEntries([...deadByFile.entries()].sort((a, b) => a[0].localeCompare(b[0])));

if (SAVE) {
    fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
    fs.writeFileSync(
        BASELINE,
        `${JSON.stringify(
            {
                deadTotal,
                moduleCount: deadByFile.size,
                savedAt: new Date().toISOString().slice(0, 10),
                perModule,
            },
            null,
            2,
        )}\n`,
    );
    console.log(`[dead exports] baseline saved: ${deadTotal} dead names in ${deadByFile.size} modules`);
    process.exit(0);
}

if (!fs.existsSync(BASELINE)) {
    console.log('[dead exports] no baseline — run with --save to lock in the current count');
    process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
console.log(`[dead exports] baseline ${baseline.deadTotal}  ->  current ${deadTotal}`);

if (!baseline.perModule) {
    console.log('[dead exports] خطّ أساس قديم بلا تفصيل لكل وحدة — أعِد الحفظ بـ --save');
}

const newlyDead = [];
const revived = [];
for (const [rel, dead] of Object.entries(perModule)) {
    const was = new Set(baseline.perModule?.[rel] ?? []);
    for (const name of dead) if (!was.has(name)) newlyDead.push(`${rel} :: ${name}`);
}
for (const [rel, dead] of Object.entries(baseline.perModule ?? {})) {
    const now = new Set(perModule[rel] ?? []);
    for (const name of dead) if (!now.has(name)) revived.push(`${rel} :: ${name}`);
}

if (revived.length > 0) {
    console.log(`\ngood: ${revived.length} تصديراً ميتاً زال`);
    for (const r of revived.slice(0, 15)) console.log(`  - ${r}`);
}

if (baseline.perModule && newlyDead.length > 0) {
    console.error(`\n[dead exports] FAIL — ${newlyDead.length} تصديراً جديداً بلا مستهلك:`);
    for (const n of newlyDead.slice(0, 40)) console.error(`  + ${n}`);
    if (newlyDead.length > 40) console.error(`  … و${newlyDead.length - 40} غيرها`);
    console.error('\nصِل التصدير بمستهلك، أو احذفه. ولا تُصدّر «للاستعمال لاحقاً».');
    process.exit(1);
}

if (deadTotal > baseline.deadTotal) {
    console.error(`\n[dead exports] FAIL — ${deadTotal - baseline.deadTotal} تصديراً جديداً بلا مستهلك.`);
    console.error('صِل التصدير بمستهلك، أو احذفه. ولا تُصدّر «للاستعمال لاحقاً».');
    process.exit(1);
}

if (revived.length > 0) {
    console.log('run with --save to lock in the improvement');
}
console.log('\n[dead exports] OK — no regression');
