/**
 * سطح خطر TDZ داخل دوائر الاستيراد الثابتة.
 *
 * في الدائرة يُحدِّد ترتيبَ التهيئة مَن حُمِّل أوّلاً. وتصريح `function` يُرفَع فيصحّ
 * استدعاؤه قبل موضعه، أمّا `const f = () => …` فيبقى في منطقة الموت الزمني: من
 * استدعاه لحظةَ تهيئة وحدة أخرى في الدائرة نفسها سقط بـ«Cannot access before
 * initialization».
 *
 * وهذا ليس احتمالاً نظرياً: وقع فعلاً في `executionDossierBlobPersistence` هذه
 * الجلسة — `logicalBlobKey` كانت `const` سهماً فأسقطت ٣٦ اختباراً حتى صارت
 * `function`.
 *
 * يقيس هذا المسبار كم تصديراً من هذا النوع بقي في ملفّات الدوائر.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();

const out = execSync('node scripts/guard-import-cycles.mjs --list', { encoding: 'utf8' });
const cycleFiles = [...out.matchAll(/^\s{2}(src\/[^\s]+\.(?:ts|tsx))$/gm)].map((m) => m[1]);

if (cycleFiles.length === 0) {
    console.log('لم يُقرأ أعضاء الدوائر — تحقّق من صيغة مخرَج الحارس');
    process.exit(0);
}

const ARROW_EXPORT = /^export\s+const\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*(?::[^=]*)?=>/gm;

let total = 0;
const perFile = [];

for (const rel of cycleFiles) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    const names = [...text.matchAll(ARROW_EXPORT)].map((m) => m[1]);
    if (names.length) {
        total += names.length;
        perFile.push({ rel, names });
    }
}

console.log(`ملفّات في دوائر ثابتة: ${cycleFiles.length}`);
console.log(`تصديرات بدالّة سهم داخلها: ${total}\n`);
for (const { rel, names } of perFile) {
    console.log(`  ${rel}`);
    console.log(`      ${names.join(', ')}`);
}
if (total === 0) {
    console.log('  (لا شيء — كل تصديرات ملفّات الدوائر مرفوعة)');
}
