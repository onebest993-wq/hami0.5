import fs from 'node:fs';
import path from 'node:path';

const ASSETS = path.resolve('dist/assets');
const files = fs.readdirSync(ASSETS).filter((f) => f.endsWith('.js'));
const staticImports = new Map();
const sizes = new Map();
const STATIC_RE = /(?:from|import)\s*["']\.\/([^"']+\.js)["']/g;

for (const f of files) {
    const p = path.join(ASSETS, f);
    const code = fs.readFileSync(p, 'utf8');
    sizes.set(f, fs.statSync(p).size);
    const found = [];
    let m;
    while ((m = STATIC_RE.exec(code))) {
        const before = code.slice(Math.max(0, m.index - 8), m.index);
        if (/import\s*\($/.test(before)) continue;
        found.push(m[1]);
    }
    staticImports.set(f, found);
}

function find(pre) {
    return files.find(
        (f) =>
            f.startsWith(pre) &&
            !f.startsWith('CommunityScreenHost') &&
            !f.startsWith('CommunityScreenContent'),
    );
}

function pullPath(entry, targetPrefix) {
    const parent = new Map([[entry, null]]);
    const queue = [entry];
    while (queue.length) {
        const cur = queue.shift();
        for (const dep of staticImports.get(cur) ?? []) {
            if (parent.has(dep)) continue;
            parent.set(dep, cur);
            queue.push(dep);
        }
    }
    const hits = [...parent.keys()].filter((f) => f.startsWith(targetPrefix));
    const short = (f) => f.replace(/-[A-Za-z0-9_-]{8}\.js$/, '');
    for (const hit of hits) {
        const trail = [];
        let cur = hit;
        while (cur) {
            trail.unshift(short(cur));
            cur = parent.get(cur);
        }
        console.log(`  ${Math.round((sizes.get(hit) || 0) / 1024)}KB  ${trail.join(' < ')}`);
    }
    if (!hits.length) console.log(`  (none) ${targetPrefix}`);
}

const entryName = process.argv[2] || 'CommunityScreen-';
const targets = process.argv.slice(3);
const entry = find(entryName);
if (!entry) {
    console.error('missing', entryName);
    process.exit(1);
}
console.log('ENTRY', entry, 'size', Math.round((sizes.get(entry) || 0) / 1024));
for (const t of targets.length
    ? targets
    : [
          'lawsuit-archive-grid',
          'lawyer-boot-peek-lite',
          'legalRepositoryLazyModals',
          'executionDashboardLoader',
          'execution-storage-cache',
          'lazyComponents',
          'forumIntentWarm',
          'lawyer-home-paint',
          'archive-execution-cards',
          'archive-portal-lite',
          'ForumOverlayInstantCovers',
          'royalLawyerProfileLoader',
          'profileShellPrime',
          'lawyer-repository-cloud',
          'forumService',
      ]) {
    console.log(`\n=== ${t} ===`);
    pullPath(entry, t);
}
