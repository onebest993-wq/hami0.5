/**
 * يمنع توأمة الامتدادات: ملف .js بجانب .ts بالاسم نفسه.
 *
 * الاستيراد بلا امتداد يُحسم بترتيب الدقّة، وVite يجرّب .js قبل .ts. فحين
 * يترك تحويلٌ سابق توأماً قديماً، يفحص tsc النسخة الجديدة بينما تشحن الحزمة
 * النسخة الميتة — والفرق لا يظهر إلا في الإنتاج. حُذف 35 توأماً كهذا من قبل،
 * وهذا الحارس يمنع عودتها.
 *
 * Usage: node scripts/guard-module-twins.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOTS = ['src', 'api'];
const byStem = new Map();

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ent.name === 'node_modules' || ent.name === 'dist') continue;
        const p = path.join(dir, ent.name);
        if (ent.isDirectory()) {
            walk(p);
            continue;
        }
        if (ent.name.endsWith('.d.ts')) continue;
        const m = ent.name.match(/^(.*)\.(ts|tsx|js|jsx|mjs|cjs)$/);
        if (!m) continue;
        const stem = path.join(dir, m[1]).split(path.sep).join('/');
        if (!byStem.has(stem)) byStem.set(stem, []);
        byStem.get(stem).push(m[2]);
    }
}

for (const r of ROOTS) walk(path.join(ROOT, r));

const twins = [...byStem.entries()]
    .filter(([, exts]) => exts.some((e) => e === 'ts' || e === 'tsx') && exts.some((e) => /^(js|jsx|mjs|cjs)$/.test(e)))
    .map(([stem, exts]) => `${path.relative(ROOT, stem).split(path.sep).join('/')}  [${[...exts].sort().join(', ')}]`);

if (twins.length) {
    console.error(`[guard-module-twins] BLOCKED — ${twins.length} ambiguous module stem(s):`);
    for (const t of twins) console.error(`  ${t}`);
    console.error('  احذف التوأم الميت: الاستيراد بلا امتداد يشحن .js ويفحص .ts');
    process.exit(1);
}

console.log(`[guard-module-twins] OK — ${byStem.size} module stems, no .js/.ts twins`);
