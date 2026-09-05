/**
 * التكلفة الإضافية لفتح قسم بعد تحميل الإقلاع + اللوحة.
 */
import fs from 'node:fs';
import path from 'node:path';

const ASSETS = path.resolve('dist/assets');
const files = fs.readdirSync(ASSETS).filter((f) => f.endsWith('.js'));
const staticImports = new Map();
const sizes = new Map();
const STATIC_RE = /(?:^|[;}\s])(?:import|export)\s*(?:[^"']*?\s*from\s*)?["']\.\/([^"']+\.js)["']/g;
const DYNAMIC_RE = /import\(\s*["']\.\/([^"']+\.js)["']\s*\)/g;

for (const f of files) {
    const p = path.join(ASSETS, f);
    const code = fs.readFileSync(p, 'utf8');
    sizes.set(f, fs.statSync(p).size);
    const s = new Set();
    for (const m of code.matchAll(STATIC_RE)) s.add(m[1]);
    for (const m of code.matchAll(DYNAMIC_RE)) s.delete(m[1]);
    staticImports.set(f, s);
}

const find = (pre) => files.find((f) => f.startsWith(pre));
function closure(entry) {
    const seen = new Set();
    const stack = [entry];
    while (stack.length) {
        const cur = stack.pop();
        if (!cur || seen.has(cur)) continue;
        seen.add(cur);
        for (const d of staticImports.get(cur) ?? []) stack.push(d);
    }
    return seen;
}
const kb = (set) => Math.round([...set].reduce((a, c) => a + (sizes.get(c) ?? 0), 0) / 1024);

const warm = new Set([
    ...closure(find('main-')),
    ...closure(find('lawyer-home-paint')),
    ...closure(find('LawyerDashboardMainView')),
]);
console.log(`ALREADY WARM after boot+dashboard: modules=${warm.size}  KB=${kb(warm)}\n`);
console.log('section'.padEnd(42) + 'newModules  newKB');

const order = [
    'CommunityScreen-',
    'LawyerDashboardRepositoryOverlayEntry-',
    'LawyerDashboardTransactionsOverlayEntry-',
    'ScheduleTabHost-',
    'CriminalDashboard-',
    'DecisionsHub-',
    'FinancialOperationsCenter-',
    'SmartFileModal-',
    'ExecutionDashboardPhoneBody-',
];

console.log('-- isolated (each opened first) --');
for (const pre of order) {
    const f = find(pre);
    if (!f) { console.log(`${pre} MISSING`); continue; }
    const delta = new Set([...closure(f)].filter((x) => !warm.has(x)));
    console.log(pre.replace(/-$/, '').padEnd(42) + String(delta.size).padStart(10) + String(kb(delta)).padStart(7));
}

console.log('\n-- cumulative (opened one after another) --');
const cum = new Set(warm);
for (const pre of order) {
    const f = find(pre);
    if (!f) continue;
    const delta = new Set([...closure(f)].filter((x) => !cum.has(x)));
    for (const d of delta) cum.add(d);
    console.log(pre.replace(/-$/, '').padEnd(42) + String(delta.size).padStart(10) + String(kb(delta)).padStart(7));
}
console.log(`\nTOTAL evaluated after visiting all: modules=${cum.size} KB=${kb(cum)}`);
