#!/usr/bin/env node
/**
 * كنسُ أقنعة `vi.mock` التي لا تُحلّ إلى ملفّ — أي التي **لم تعترض شيئاً قطّ**.
 *
 * **العطل الذي وُضعت له، مقيساً:** `vi.mock('../x')` يُحلّ **من ملفّ الاختبار** لا من
 * الوحدة المُختبَرة. فاختبارٌ في `foo/hooks/__tests__/` يُقنّع `'../x'` فيستهدف
 * `foo/hooks/x`، بينما الخطّاف الذي يختبره يستورد `'../x'` قاصداً `foo/x`. فلا يعترض
 * القناع شيئاً، **وvitest لا يُنبّه** لأنّ لا أحد يستورد المسار المُقنَّع أصلاً.
 *
 * **ولماذا يبقى مستوراً:** وُجد في `useForumAppBarNotifications` قناعٌ ميّت يُرجع
 * `90_000 / 12_000`، والدالّة الحقيقية تُرجع **القيمتين نفسيهما** على جهازٍ غير «خفيف».
 * فتطابقُ ثوابتٍ بالصدفة جعل قناعاً ميّتاً يبدو حيّاً، ولم ينكشف إلّا على عدّاء CI
 * حيث تصير القيم `180_000 / 24_000`.
 *
 * **وإحياءُ قناعٍ ميّت يكشف ما تحته:** اثنان من الثلاثة كانت مصانعهما تخالف عقد الوحدة
 * الحقيقية ولم تعمل قطّ (`undefined` حيث يُرجع الأصل مصفوفةً دائماً، وحيث يُرجع كائناً
 * مُشتقّاً من مُدخله). **فقناعٌ ميّت لا يُخفي نفسه فحسب — يُخفي أنّ ما تحته لم يُختبر.**
 *
 * **قياس ٢٠٢٦-٠٩-١٣:** ٣٦٢ مساراً نسبياً في أكثر من ٢٬٤٠٠ ملفّ اختبار، **٣ لا تُحلّ**،
 * وكلّها بخطأ طابقٍ واحد. أُصلحت الثلاثة في `79363cde`، والكنس بعدها **صفر**.
 * (عددُ ملفّات الاختبار يتغيّر مع كلّ إضافة، فالرقمُ الحاكم هو عددُ المسارات والساقط منها.)
 *
 *   node scripts/audit-dead-mock-paths.mjs      # يخرج بـ1 إن وُجد قناعٌ ميّت
 *
 * **وليس حارس بوّابة ولا مربوطاً بـCI، وهذا مقصود:** المسارات المطلقة (`@/…`) خارج
 * نطاقه، فتغطيتُه جزئيةٌ بحكم التصميم — أداةُ تدقيقٍ تُشغَّل بعد نقل أيّ وحدة وعند
 * المراجعة، لا حكمٌ يُبنى عليه أخضر.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

/** اللواحق التي يجرّبها مُحلِّل vitest بالترتيب — والمجلَّد وحده ليس حلّاً. */
const FILE_EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts'];
const INDEX_EXTS = ['/index.ts', '/index.tsx', '/index.js'];

/**
 * `existsSync` وحدها تُصيب مجلَّداً فتقول «حُلّ» وهو لم يُحلّ. فيُشترط **ملفّ**:
 * المسار نفسه ملفّاً بلاحقةٍ أو بلا، أو مجلَّدٌ فيه `index`.
 */
function resolvesToFile(base) {
    for (const ext of FILE_EXTS) {
        const candidate = base + ext;
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return true;
    }
    for (const ext of INDEX_EXTS) {
        const candidate = base + ext;
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return true;
    }
    return false;
}

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name !== 'node_modules') walk(full, out);
        } else if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) {
            out.push(full);
        }
    }
    return out;
}

const files = walk(path.join(ROOT, 'src'));
let total = 0;
const dead = [];

for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    for (const match of src.matchAll(/vi\.mock\(\s*['"](\.[^'"]+)['"]/g)) {
        total += 1;
        const spec = match[1];
        const base = path.resolve(path.dirname(file), spec);
        if (!resolvesToFile(base)) {
            dead.push({ file: path.relative(ROOT, file).split(path.sep).join('/'), spec });
        }
    }
}

for (const d of dead) console.error(`DEAD  ${d.file}  ->  ${d.spec}`);
console.log(
    `[dead-mock-paths] test files ${files.length} · relative vi.mock specifiers ${total} · unresolvable ${dead.length}`,
);

if (dead.length) {
    console.error(
        '\nقناعٌ لا يُحلّ لا يعترض شيئاً — والاختبار يُشغّل الوحدة الحقيقية وهو يظنّ أنّه عزلها.',
    );
    process.exit(1);
}
