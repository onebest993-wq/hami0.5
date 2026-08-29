/**
 * مستمعو أحداث بلا إزالة — تسريب ذاكرة ومستمعون يتراكمون.
 *
 * كل `addEventListener` في مكوّن أو خطّاف يجب أن يُقابله `removeEventListener` في
 * تنظيف `useEffect`. وإلّا تراكم المستمعون مع كل تركيب: الشاشة تُفتح وتُغلق عشرين
 * مرّة فيبقى عشرون مستمعاً يعمل على أحداث لا تخصّ أحداً، ويُمسك بمراجع تمنع تحرير
 * الذاكرة. وهذا يمسّ الهاتف قبل غيره.
 *
 * القياس تقريبيّ عن قصد: يُوازن عدد الإضافات بعدد الإزالات في الملفّ نفسه، ويستثني
 * ما يُضاف بـ`{ once: true }` (يُزيل نفسه) وما هو على مستوى الوحدة لا التركيب.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

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

const suspects = [];

for (const file of walk(SRC)) {
    if (/__tests__|\.test\./.test(file)) continue;
    const raw = fs.readFileSync(file, 'utf8');
    if (!raw.includes('addEventListener')) continue;
    const text = stripComments(raw);

    const adds = [...text.matchAll(/\.addEventListener\(\s*['"`]([^'"`]+)['"`]/g)];
    if (adds.length === 0) continue;

    /* `{ once: true }` يُزيل نفسه — لا يُحسب دَيناً */
    const onceAdds = [...text.matchAll(/\.addEventListener\([^;]*?once:\s*true/gs)].length;
    const removes = [...text.matchAll(/\.removeEventListener\(/g)].length;

    const needsRemoval = adds.length - onceAdds;
    if (needsRemoval > removes) {
        const rel = path.relative(ROOT, file).replace(/\\/g, '/');
        const events = [...new Set(adds.map((m) => m[1]))].join(', ');
        /* الوحدة (لا مكوّن) قد تُضيف مستمعاً دائماً بقصد — يُعلَّم لا يُتّهم */
        const isModuleLevel = !/use[A-Z]|React|useEffect/.test(text);
        suspects.push({ rel, adds: adds.length, onceAdds, removes, needsRemoval, events, isModuleLevel });
    }
}

suspects.sort((a, b) => b.needsRemoval - b.removes - (a.needsRemoval - a.removes));

const inComponents = suspects.filter((s) => !s.isModuleLevel);
const inModules = suspects.filter((s) => s.isModuleLevel);

console.log(`ملفّات تُضيف مستمعين أكثر مما تُزيل: ${suspects.length}`);
console.log(`  داخل مكوّنات/خطّافات (تسريب مع كل تركيب): ${inComponents.length}`);
console.log(`  على مستوى الوحدة (مرّة واحدة في العمر — غالباً بقصد): ${inModules.length}\n`);

console.log('--- الأخطر: مكوّنات وخطّافات ---');
for (const s of inComponents.slice(0, 30)) {
    console.log(`  ${s.needsRemoval} add / ${s.removes} remove   ${s.rel}`);
    console.log(`        [${s.events}]`);
}
