/**
 * الضريبة المشتركة: ما تتقاسمه مداخل الأقسام رغم اختلاف وظائفها.
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

function closure(entry) {
    const seen = new Set();
    const stack = [entry];
    while (stack.length) {
        const cur = stack.pop();
        if (seen.has(cur)) continue;
        seen.add(cur);
        for (const d of staticImports.get(cur) ?? []) stack.push(d);
    }
    return seen;
}

const kb = (set) => Math.round([...set].reduce((a, c) => a + (sizes.get(c) ?? 0), 0) / 1024);

const sectionPrefixes = [
    'CommunityScreen-',
    'LawyerDashboardRepositoryOverlayEntry-',
    'LawyerDashboardTransactionsOverlayEntry-',
    'ScheduleTabHost-',
    'CriminalDashboard-',
    'DecisionsHub-',
    'FinancialOperationsCenter-',
    'LawyerAuthOtpPanel-',
];

const closures = [];
for (const pre of sectionPrefixes) {
    const f = files.find((x) => x.startsWith(pre));
    if (!f) { console.log(`(missing ${pre})`); continue; }
    const c = closure(f);
    closures.push({ name: pre.replace(/-$/, ''), set: c });
    console.log(`${pre.replace(/-$/, '').padEnd(42)} modules=${String(c.size).padStart(4)}  KB=${String(kb(c)).padStart(5)}`);
}

let inter = closures[0].set;
for (const c of closures.slice(1)) inter = new Set([...inter].filter((x) => c.set.has(x)));
console.log(`\nSHARED BY ALL ${closures.length} SECTIONS: modules=${inter.size}  KB=${kb(inter)}`);

const top = [...inter].sort((a, b) => (sizes.get(b) ?? 0) - (sizes.get(a) ?? 0)).slice(0, 18);
console.log('\nheaviest shared members:');
for (const t of top) console.log(`  ${String(Math.round((sizes.get(t) ?? 0) / 1024)).padStart(4)} KB  ${t.replace(/-[A-Za-z0-9_-]{8}\.js$/, '')}`);
