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

const find = (pre) =>
    files.find(
        (f) =>
            f.startsWith(pre) &&
            !f.startsWith('CommunityScreenHost') &&
            !f.startsWith('CommunityScreenContent'),
    );

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

const warm = new Set([
    ...closure(find('main-')),
    ...closure(find('lawyer-home-paint')),
    ...closure(find('LawyerDashboardMainView')),
]);
const delta = [...closure(find(process.argv[2] || 'CommunityScreen-'))].filter((x) => !warm.has(x));
delta.sort((a, b) => (sizes.get(b) || 0) - (sizes.get(a) || 0));
const short = (f) => f.replace(/-[A-Za-z0-9_-]{8}\.js$/, '');
for (const f of delta.slice(0, 20)) {
    console.log(String(Math.round((sizes.get(f) || 0) / 1024)).padStart(5), short(f));
}
const persist = files.find((f) => f.startsWith('execution-dashboard-persist-pipeline-'));
if (persist) console.log('\npersist raw bytes', fs.statSync(path.join(ASSETS, persist)).size);
