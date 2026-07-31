#!/usr/bin/env node
/**
 * حصر السكربتات القادرة على تعديل الكود المصدري.
 * الغرض: تحديد ما يجب تحييده قبل أي إصلاح، فبعضها يزرع @ts-nocheck ويحذف ملفات.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const files = readdirSync('scripts').filter((f) => /\.(mjs|js|cjs|ts)$/.test(f));
const rows = [];

for (const f of files) {
    let s = '';
    try {
        s = readFileSync(join('scripts', f), 'utf8');
    } catch {
        continue;
    }
    const writes = /\bwriteFileSync\b/.test(s);
    const touchesSrc = /['"`][^'"`]*\bsrc\//.test(s) || /\bsrc\//.test(s);
    const injectsNocheck = /@ts-nocheck/.test(s);
    const regexPatch = writes && /\.replace\s*\(/.test(s);
    const deletes = /\b(unlinkSync|rmSync|rmdirSync)\b/.test(s);
    if ((writes && touchesSrc) || injectsNocheck || deletes) {
        rows.push({
            file: `scripts/${f}`,
            lines: s.split('\n').length,
            injectsNocheck,
            deletes,
            regexPatch,
            writesSrc: writes && touchesSrc,
        });
    }
}

rows.sort(
    (a, b) =>
        Number(b.injectsNocheck) - Number(a.injectsNocheck) ||
        Number(b.deletes) - Number(a.deletes) ||
        b.lines - a.lines,
);

writeFileSync('.audit/mutating-scripts.json', JSON.stringify(rows, null, 2), 'utf8');

console.log(`SOURCE-MUTATING SCRIPTS: ${rows.length} of ${files.length} scripts`);
console.log('');
console.log('flags  N=injects @ts-nocheck   D=deletes files   R=regex-patch+write   S=writes into src/');
console.log('');
for (const r of rows) {
    const flags =
        (r.injectsNocheck ? 'N' : '-') +
        (r.deletes ? 'D' : '-') +
        (r.regexPatch ? 'R' : '-') +
        (r.writesSrc ? 'S' : '-');
    console.log(` ${flags}  ${String(r.lines).padStart(5)}  ${r.file}`);
}
console.log('');
console.log(`injects @ts-nocheck : ${rows.filter((r) => r.injectsNocheck).length}`);
console.log(`deletes files       : ${rows.filter((r) => r.deletes).length}`);
console.log(`regex-patch + write : ${rows.filter((r) => r.regexPatch).length}`);
