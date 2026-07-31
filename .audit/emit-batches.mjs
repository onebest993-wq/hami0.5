#!/usr/bin/env node
/**
 * تقسيم وحدة إلى دفعات فحص متوازنة بالأسطر — دون تداخل ودون إسقاط ملف.
 * يكتب كل دفعة إلى .audit/batch-<module>-<n>.txt
 *
 * الاستخدام: node .audit/emit-batches.mjs <module> <batchCount>
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FILE = join(process.cwd(), '.audit', 'execution-inventory.json');
const [moduleName, batchCountRaw] = process.argv.slice(2);
const batchCount = Number(batchCountRaw || 5);

const data = JSON.parse(readFileSync(FILE, 'utf8'));
const files = data.records
    .filter((r) => r.module === moduleName && !r.reviewed)
    .sort((a, b) => b.lines - a.lines);

// توزيع جشع: أكبر ملف إلى الدفعة الأقل أسطراً — يوازن الحمل
const batches = Array.from({ length: batchCount }, () => ({ files: [], lines: 0 }));
for (const f of files) {
    const target = batches.reduce((min, b) => (b.lines < min.lines ? b : min), batches[0]);
    target.files.push(f);
    target.lines += f.lines;
}

console.log(`module ${moduleName}: ${files.length} pending files / ${files.reduce((s, f) => s + f.lines, 0)} lines`);
console.log(`nocheck files in module: ${files.filter((f) => f.tsNocheck).length}`);
console.log('');

batches.forEach((b, i) => {
    const out = join(process.cwd(), '.audit', `batch-${moduleName}-${i + 1}.txt`);
    const body = b.files.map((f) => `${f.path}  (${f.lines} lines)${f.tsNocheck ? '  [@ts-nocheck]' : ''}`).join('\n');
    writeFileSync(out, `# ${moduleName} batch ${i + 1} — ${b.files.length} files / ${b.lines} lines\n${body}\n`, 'utf8');
    console.log(
        `batch ${i + 1}: ${String(b.files.length).padStart(3)} files / ${String(b.lines).padStart(6)} lines / ${String(b.files.filter((f) => f.tsNocheck).length).padStart(3)} nocheck  ->  .audit/batch-${moduleName}-${i + 1}.txt`,
    );
});
