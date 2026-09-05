import fs from 'node:fs';
import path from 'node:path';

const ASSETS = path.resolve('dist/assets');
const files = fs.readdirSync(ASSETS).filter((f) => f.endsWith('.js'));
const staticImports = new Map();
const sizes = new Map();
const STATIC_RE = /(?:^|[;}\s])(?:import|export)\s*(?:[^"']*?\s*from\s*)?["']\.\/([^"']+\.js)["']/g;
const DYNAMIC_RE = /import\(\s*["']\.\/([^"']+\.js)["']\s*\)/g;

for (const f of files) {
    const code = fs.readFileSync(path.join(ASSETS, f), 'utf8');
    sizes.set(f, fs.statSync(path.join(ASSETS, f)).size);
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

for (const pre of [
    'AddTaskBottomSheet-',
    'LawyerDashboardTransactionsOverlayEntry-',
    'CommunityScreen-',
    'LawyerAuthOtpPanel-',
]) {
    const f = find(pre);
    const c = closure(f);
    const delta = new Set([...c].filter((x) => !warm.has(x)));
    const pipes = [...c].filter((x) =>
        /execution-dashboard-(persist|boot|claim|workspace)-pipeline/.test(x),
    );
    console.log(
        pre.replace(/-$/, '').padEnd(42),
        'full',
        String(c.size).padStart(4),
        `${kb(c)}KB`.padStart(7),
        'isolated',
        String(delta.size).padStart(3),
        `${kb(delta)}KB`.padStart(7),
        'pipelines',
        pipes.length ? pipes.map((p) => p.replace(/-[A-Za-z0-9_-]{8}\.js$/, '')).join(',') : 'none',
    );
}
