/**
 * الأسماء المستوردة فعلاً من `lazyComponents` — بالاستيراد لا بمطابقة الاسم.
 *
 * مطابقة الاسم وحدها تُخطئ في الاتجاهين: تعدّ حيّاً ما يُعرَّف محلياً بنفس الاسم في
 * ملفّ آخر (وقع هذا مع `LazyExecutionDashboard`)، وتعدّ ميتاً ما يُستورد بلقب.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (/\.(ts|tsx|mjs)$/.test(e.name)) out.push(p);
    }
    return out;
}

const SPEC = /@\/app\/utils\/lazyComponents/;
const imported = new Map();

for (const file of walk(path.join(ROOT, 'src'))) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    if (rel === 'src/app/utils/lazyComponents.tsx') continue;
    const text = fs.readFileSync(file, 'utf8');
    if (!SPEC.test(text)) continue;

    /* static + dynamic + vi.mock factories */
    for (const m of text.matchAll(
        /import\s*\{([^}]+)\}\s*from\s*['"]@\/app\/utils\/lazyComponents['"]/g,
    )) {
        for (const part of m[1].split(',')) {
            const name = part.trim().split(/\s+as\s+/)[0]?.trim();
            if (!name) continue;
            if (!imported.has(name)) imported.set(name, new Set());
            imported.get(name).add(rel);
        }
    }
    /* `const { a, b } = await import('…lazyComponents')` */
    for (const m of text.matchAll(
        /(?:const|let)\s*\{([^}]+)\}\s*=\s*await\s+import\(\s*['"]@\/app\/utils\/lazyComponents['"]/g,
    )) {
        for (const part of m[1].split(',')) {
            const name = part.trim().split(/\s*:\s*/)[0]?.trim();
            if (!name) continue;
            if (!imported.has(name)) imported.set(name, new Set());
            imported.get(name).add(rel);
        }
    }
    /* `.then(({ a }) => …)` على استيراد ديناميّ */
    for (const m of text.matchAll(
        /import\(\s*['"]@\/app\/utils\/lazyComponents['"]\s*\)[\s\S]{0,120}?\{([^}]+)\}/g,
    )) {
        for (const part of m[1].split(',')) {
            const name = part.trim().split(/\s*:\s*/)[0]?.trim();
            if (!name || !/^[A-Za-z_$][\w$]*$/.test(name)) continue;
            if (!imported.has(name)) imported.set(name, new Set());
            imported.get(name).add(rel);
        }
    }
    /*
     * الواجهة الخفيفة تنادي الأعضاء بـ`m.name` بعد استيراد ديناميّ، ولا يظهر الاسم في
     * أي جملة استيراد. فالتقاطُ ذلك بالنمط هشّ. والمخرج الآمن: ما دام الملفّ يذكر
     * المحدِّد بدقّة، نجمع **كل** عضو `.name` وكل معرّف فيه ونتقاطعه مع قائمة
     * التصديرات لاحقاً. تقديرٌ زائد لا ناقص — والزيادة تُبقي حيّاً ما هو ميت، وهذا
     * أهون من حذف ما هو حيّ.
     */
    for (const m of text.matchAll(/\.\s*([A-Za-z_$][\w$]*)\s*\(/g)) {
        const name = m[1];
        if (!imported.has(name)) imported.set(name, new Set());
        imported.get(name).add(`${rel} (member)`);
    }
    /* مصانع vi.mock تُسمّي ما تحتاجه الوحدة تحت الاختبار */
    for (const m of text.matchAll(
        /vi\.mock\(\s*['"]@\/app\/utils\/lazyComponents['"][\s\S]{0,600}?\}\s*\)\s*\)?;/g,
    )) {
        for (const km of m[0].matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:/gm)) {
            const name = km[1];
            if (!imported.has(name)) imported.set(name, new Set());
            imported.get(name).add(`${rel} (mock)`);
        }
    }
}

/* التقاطع مع التصديرات الفعلية — الأعضاء المجموعة تشمل نداءات لا تخصّ هذه الوحدة */
const selfText = fs.readFileSync(path.join(ROOT, 'src/app/utils/lazyComponents.tsx'), 'utf8');
const exportNames = new Set();
for (const m of selfText.matchAll(/^export\s+(?:async\s+)?(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/gm)) {
    exportNames.add(m[1]);
}
for (const m of selfText.matchAll(/^export\s+(?:type\s+)?\{([^}]+)\}/gm)) {
    for (const part of m[1].split(',')) {
        const name = part.trim().split(/\s+as\s+/).pop()?.trim();
        if (name && /^[A-Za-z_$][\w$]*$/.test(name)) exportNames.add(name);
    }
}

for (const name of [...imported.keys()]) {
    if (!exportNames.has(name)) imported.delete(name);
}

console.log(`تصديرات الملفّ: ${exportNames.size}`);
const dead = [...exportNames].filter((n) => !imported.has(n));
console.log(`حيّة: ${imported.size}   ميتة: ${dead.length}\n`);
console.log('--- ميتة ---');
for (const n of dead) console.log(`  ${n}`);
console.log('');

console.log(`أسماء مستوردة فعلاً: ${imported.size}\n`);
for (const [name, files] of [...imported.entries()].sort()) {
    console.log(`  ${name}`);
    for (const f of files) console.log(`        ${f}`);
}
